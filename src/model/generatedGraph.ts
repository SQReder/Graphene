import { createFactory } from '@withease/factories';
import { combine, createEffect, createEvent, type Event, restore, sample, type Store, withRegion } from 'effector';
import { persist } from 'effector-storage/local';
import { abortable, type WithAbortSignal } from '../abortable';
import { sortTreeNodesBFS } from '../dfs';
import { createGraphCleaner } from '../graph-morphers/cleaners/lib';
import type { GraphCleaner, NamedGraphCleaner } from '../graph-morphers/cleaners/types';
import { pipeline } from '../graph-morphers/pipeline';
import type { Layouter } from '../layouters/types';
import type { GraphVariant } from '../lib';
import { type AsyncGraphVariantGenerators, makeGraphVariants } from '../lib';
import { logEffectFail } from '../logEffectFail';
import type { EdgeType } from '../types';
import { type EffectorGraph } from '../types';
import type { NamedCleanerSelector } from '../ui/CleanerSelector/model';
import type { GrapheneModel } from './graphene';

export type NamedCleanerSelectorModel = NamedCleanerSelector<GraphCleaner>;

export const generatedGraphModelFactory = createFactory(
	({
		grapheneModel,
		$edgesVariant,
		layouterFactory,
		pickupStoredPipeline,
		graphCleanerSelector,
		$selectedGraphVariant,
	}: {
		grapheneModel: GrapheneModel;
		$edgesVariant: Store<Set<EdgeType>>;
		layouterFactory: () => Layouter;
		pickupStoredPipeline: Event<void>;
		graphCleanerSelector: NamedCleanerSelectorModel;
		$selectedGraphVariant: Store<GraphVariant>;
	}) => {
		const $graph = combine(
			{
				nodes: grapheneModel.$nodes,
				edgesVariant: $edgesVariant,
				reactive: grapheneModel.$reactive,
				ownership: grapheneModel.$ownership,
			},
			({ nodes, edgesVariant, ...edges }): EffectorGraph | null => {
				if (nodes.length === 0) {
					return null;
				}

				return {
					nodes,
					edges: [
						...(edgesVariant.has('reactive') ? edges.reactive : []),
						...(edgesVariant.has('ownership') ? edges.ownership : []),
					],
				};
			},
		);

		withRegion(graphCleanerSelector.$selectedCleaners, () => {
			persist({
				pickup: pickupStoredPipeline,
				source: graphCleanerSelector.$selectedCleaners,
				target: graphCleanerSelector.selectedCleanersResetted,
				key: 'graphene',
				serialize: (value: NamedGraphCleaner[]) => {
					console.log('serialize', value);
					return JSON.stringify(value.map((x) => x.name));
				},
				deserialize: (value) => {
					console.log('deserialize', value);
					return (JSON.parse(value) as string[]).map((name) => pipeline.find((x) => x.name === name)).filter(Boolean);
				},
			});
		});

		const getGraphVariantGeneratorsFx = createEffect<
			{
				graphCleaners: readonly NamedGraphCleaner[];
			},
			AsyncGraphVariantGenerators
		>(({ graphCleaners }) => {
			const cleaningPipeline = [...graphCleaners].sort(
				(a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
			);

			return makeGraphVariants(createGraphCleaner(cleaningPipeline), async (x) => x, layouterFactory);
		});

		logEffectFail(getGraphVariantGeneratorsFx);

		sample({
			clock: [
				pickupStoredPipeline,
				$edgesVariant,
				graphCleanerSelector.$selectedCleaners,
				// ownershipEdgeCleanerSelector.$selectedCleaners,
				// reactiveEdgeCleanerSelector.$selectedCleaners,
			],
			source: {
				edgesVariant: $edgesVariant,
				graphCleaners: graphCleanerSelector.$selectedCleaners,
				// ownershipEdgeCleaners: ownershipEdgeCleanerSelector.$selectedCleaners,
				// reactiveEdgeCleaners: reactiveEdgeCleanerSelector.$selectedCleaners,
			},
			target: getGraphVariantGeneratorsFx,
		});

		const newGraphEmitted = createEvent<EffectorGraph>();

		const getGraphAbortableFx = createEffect(
			async ({
				graph,
				selectedGraphVariant,
				generators,
				signal,
			}: {
				graph: EffectorGraph;
				selectedGraphVariant: GraphVariant;
				generators: AsyncGraphVariantGenerators | null;
			} & WithAbortSignal) => {
				if (!generators) {
					console.warn('No generators found');
					return;
				}

				const generator = generators[selectedGraphVariant];

				const result = await generator(graph, signal);

				try {
					result.nodes = sortTreeNodesBFS(result.nodes, signal);
				} catch (e) {
					console.error('Sorting failed', e);
				}

				signal.throwIfAborted();

				newGraphEmitted(result);
			},
		);
		const getGraph = abortable(getGraphAbortableFx);

		logEffectFail(getGraph.abortableFx);

		const $generator = restore(getGraphVariantGeneratorsFx.doneData, null);

		sample({
			source: {
				graph: $graph,
				selectedGraphVariant: $selectedGraphVariant,
				generators: $generator,
			},
			filter: (
				source,
			): source is {
				graph: EffectorGraph;
				generators: AsyncGraphVariantGenerators;
				selectedGraphVariant: GraphVariant;
			} => source.graph != null,
			target: getGraph.abortableFx,
		});

		return { graphGenerated: newGraphEmitted };
	},
);
