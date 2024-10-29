import { createFactory, invoke } from '@withease/factories';
import { combine, createEffect, createEvent, sample, type Store, withRegion } from 'effector';
import { persist } from 'effector-storage/local';
import { debug } from 'patronum';
import { abortable, type WithAbortSignal } from '../abortable';
import runPipeline, { newPipeline } from '../brand-new-graph-cleaners/pipeline';
import type { NamedGraphVisitor } from '../brand-new-graph-cleaners/types';
import { sortTreeNodesBFS, sortTreeNodesDFS } from '../dfs';
import { BufferedGraph } from '../graph-manager';
import type { Layouter } from '../layouters/types';
import { absurd, type GraphVariant, isFactoryOwnershipEdge, isParentToChildEdge } from '../lib';
import { logEffectFail } from '../logEffectFail';
import { EdgeType, type MyEdge } from '../types';
import { CleanerSelector } from '../ui/CleanerSelector';
import type { GrapheneModel } from './graphene';

type Params = {
	grapheneModel: GrapheneModel;
	layouterFactory: () => Layouter;
	$selectedGraphVariant: Store<GraphVariant>;
	$excludeOwnershipFromLayouting: Store<boolean>;
	$unfoldedNodes: Store<Set<string>>;
};

export const generatedGraphModelFactory = createFactory(
	({
		grapheneModel,
		layouterFactory,
		$selectedGraphVariant,
		$excludeOwnershipFromLayouting,
		$unfoldedNodes,
	}: Params) => {
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

		const graphCleanerSelector = invoke(CleanerSelector.factory<NamedGraphVisitor>(), {
			availableCleaners: newPipeline,
		});

		const pickupStoredPipeline = createEvent();

		withRegion(graphCleanerSelector.$selectedCleaners, () => {
			persist({
				pickup: pickupStoredPipeline,
				source: graphCleanerSelector.$selectedCleaners,
				target: graphCleanerSelector.selectedCleanersResetted,
				key: 'graphene',
				serialize: (value: NamedGraphVisitor[]) => {
					console.log('serialize', value);
					return JSON.stringify(value.map((x) => x.name));
				},
				deserialize: (value) => {
					console.log('deserialize', value);
					return (JSON.parse(value) as string[])
						.map((name) => newPipeline.find((x) => x.name === name))
						.filter(Boolean);
				},
			});
		});

		const getGraphAbortableFx = createEffect(
			async ({
				graph,
				signal,
				excludeOwnershipFromLayouting,
				unfoldedNodes,
				pipeline,
			}: {
				graph: BufferedGraph;
				excludeOwnershipFromLayouting: boolean;
				unfoldedNodes: Set<string>;
				pipeline: NamedGraphVisitor[];
			} & WithAbortSignal) => {
				const bufferedGraph = graph.clone();

				await runPipeline(bufferedGraph, pipeline);

				signal.throwIfAborted();

				const cleanedGraph = bufferedGraph.getGraph();

				const layouter = layouterFactory();

				const linksExcludedFromLayouting: MyEdge[] = [];
				const linksForLayouting: MyEdge[] = [];

				for (const edge of cleanedGraph.edges) {
					if (excludeOwnershipFromLayouting && (isParentToChildEdge(edge) || isFactoryOwnershipEdge(edge))) {
						linksExcludedFromLayouting.push(edge);
					} else {
						linksForLayouting.push(edge);
					}
				}

				console.log('start layout', linksForLayouting.length, 'edges at', performance.now());
				const timestamp = performance.now();
				console.time('layout ' + timestamp);
				const layouted = await layouter.getLayoutedElements(sortTreeNodesBFS(cleanedGraph.nodes), linksForLayouting);
				console.timeEnd('layout ' + timestamp);

				function getOrder(edgeType: EdgeType): number {
					switch (edgeType) {
						case EdgeType.FactoryOwnership:
							return -1;
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

				console.log(layouted.nodes.map((x) => Number(x.id)).sort((a, b) => a - b));
				console.log('sorted', sortTreeNodesBFS(layouted.nodes));

				return {
					nodes: layouted.nodes,
					edges: [...linksExcludedFromLayouting, ...layouted.edges].sort(
						(a, b) => getOrder(a.data.edgeType) - getOrder(b.data.edgeType),
					),
				};
			},
		);
		const getGraph = abortable(getGraphAbortableFx);

		logEffectFail(getGraph.abortableFx);

		debug(graphCleanerSelector.$selectedCleaners);

		sample({
			source: {
				graph: $graph,
				selectedGraphVariant: $selectedGraphVariant,
				excludeOwnershipFromLayouting: $excludeOwnershipFromLayouting,
				unfoldedNodes: $unfoldedNodes,
				pipeline: graphCleanerSelector.$selectedCleaners,
			},
			target: getGraph.abortableFx,
		});

		return { graphGenerated: getGraph.abortableFx.doneData, pickupStoredPipeline, graphCleanerSelector };
	},
);
