import { createFactory } from '@withease/factories';
import { combine, createEffect, createEvent, sample, type Store } from 'effector';
import { abortable, type WithAbortSignal } from '../abortable';
import runPipeline, { newPipeline } from '../brand-new-graph-cleaners/pipeline';
import { BufferedGraph } from '../graph-manager';
import type { GraphCleaner } from '../graph-morphers/cleaners/types';
import type { Layouter } from '../layouters/types';
import { absurd, type GraphVariant, isParentToChildEdge } from '../lib';
import { logEffectFail } from '../logEffectFail';
import { EdgeType, type EffectorGraph, type MyEdge, type ParentToChildEdge } from '../types';
import type { NamedCleanerSelector } from '../ui/CleanerSelector/model';
import type { GrapheneModel } from './graphene';

export type NamedCleanerSelectorModel = NamedCleanerSelector<GraphCleaner>;

export const generatedGraphModelFactory = createFactory(
	({
		grapheneModel,
		layouterFactory,
		$selectedGraphVariant,
	}: {
		grapheneModel: GrapheneModel;
		layouterFactory: () => Layouter;
		$selectedGraphVariant: Store<GraphVariant>;
	}) => {
		const $graph = combine(
			{
				nodes: grapheneModel.$nodes,
				edges: grapheneModel.$edges,
			},
			({ nodes, edges }): BufferedGraph => {
				if (nodes.length === 0) {
					return new BufferedGraph();
				}

				return new BufferedGraph({
					nodes,
					edges,
				});
			},
		);

		// withRegion(graphCleanerSelector.$selectedCleaners, () => {
		// 	persist({
		// 		pickup: pickupStoredPipeline,
		// 		source: graphCleanerSelector.$selectedCleaners,
		// 		target: graphCleanerSelector.selectedCleanersResetted,
		// 		key: 'graphene',
		// 		serialize: (value: NamedGraphCleaner[]) => {
		// 			console.log('serialize', value);
		// 			return JSON.stringify(value.map((x) => x.name));
		// 		},
		// 		deserialize: (value) => {
		// 			console.log('deserialize', value);
		// 			return (JSON.parse(value) as string[]).map((name) => pipeline.find((x) => x.name === name)).filter(Boolean);
		// 		},
		// 	});
		// });

		const newGraphEmitted = createEvent<EffectorGraph>();

		const getGraphAbortableFx = createEffect(
			async ({
				graph,
				signal,
			}: {
				graph: BufferedGraph;
			} & WithAbortSignal) => {
				const bufferedGraph = graph.clone();

				runPipeline(bufferedGraph, newPipeline);

				signal.throwIfAborted();

				const cleanedGraph = bufferedGraph.getGraph();

				const layouter = layouterFactory();

				const links: ParentToChildEdge[] = [];
				const others: MyEdge[] = [];

				for (const edge of cleanedGraph.edges) {
					if (isParentToChildEdge(edge)) links.push(edge);
					else others.push(edge);
				}

				const layouted = await layouter.getLayoutedElements(cleanedGraph.nodes, others);

				function getOrder(edgeType: EdgeType): number {
					switch (edgeType) {
						case EdgeType.ParentToChild:
							return 0;
						case EdgeType.Source:
							return 1;
						case EdgeType.Reactive:
							return 2;
						case EdgeType.Unknown:
							return 3;
						default:
							absurd(edgeType);
					}
				}

				newGraphEmitted({
					nodes: layouted.nodes,
					edges: [...links, ...layouted.edges].sort((a, b) => getOrder(a.data.edgeType) - getOrder(b.data.edgeType)),
				});
			},
		);
		const getGraph = abortable(getGraphAbortableFx);

		logEffectFail(getGraph.abortableFx);

		sample({
			source: {
				graph: $graph,
				selectedGraphVariant: $selectedGraphVariant,
			},
			target: getGraph.abortableFx,
		});

		return { graphGenerated: newGraphEmitted };
	},
);
