import { createFactory } from '@withease/factories';
import type { Store, Unit } from 'effector';
import { attach, combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import type { Declaration } from 'effector/inspect';
import { inspectGraph } from 'effector/inspect';
import { debounce, debug, readonly, reshape } from 'patronum';
import type { WithAbortSignal } from './abortable';
import { abortable } from './abortable';
import { cleanOwnershipEdges } from './graph-morphers/cleaners/edge-ownership';
import type { NamedOwnershipEdgeCleaner, OwnershipEdgeCleaner } from './graph-morphers/cleaners/edge-ownership/types';
import { cleanReactiveEdges } from './graph-morphers/cleaners/edge-reactive';
import type { NamedReactiveEdgeCleaner, ReactiveEdgeCleaner } from './graph-morphers/cleaners/edge-reactive/types';
import { createGraphCleaner } from './graph-morphers/cleaners/graph';
import type { GraphCleaner, NamedGraphCleaner } from './graph-morphers/cleaners/types';
import { enrichGraph } from './graph-morphers/enrichers';
import type { Layouter } from './layouters/types';
import type { AsyncGraphVariantGenerators } from './lib';
import {
	absurd,
	createEffectorNodesLookup,
	GraphVariant,
	isOwnershipEdge,
	isReactiveEdge,
	makeEdgesFromNodes,
	makeGraphVariants,
	sortNodes,
} from './lib';
import { logEffectFail } from './logEffectFail';
import type { DeclarationEffectorNode, EffectorGraph, EffectorNode, MyEdge, RegularEffectorNode } from './types';
import { EdgeType, EffectorDeclarationDetails } from './types';
import type { CleanerSelector } from './ui/CleanerSelector';
import type { NamedCleanerSelector } from './ui/CleanerSelector/model';

function createDeclarationsStore(): Store<readonly Declaration[]> {
	const addDeclaration = createEvent<Declaration>();
	const $declarations = createStore<readonly Declaration[]>([]).on(addDeclaration, (state, declaration) => [
		...state,
		declaration,
	]);

	inspectGraph({
		fn: (declaration) => {
			addDeclaration(declaration);
		},
	});

	return $declarations;
}

function debounceStore<T>({
	source,
	defaultState,
	timeoutMs,
}: {
	source: Store<T>;
	defaultState: T;
	timeoutMs: number;
}): Store<T> {
	return readonly(restore(debounce(source, timeoutMs), defaultState));
}

export const grapheneModelFactory = createFactory(() => {
	const appendUnits = createEvent<ReadonlyArray<Unit<unknown>>>();
	const $units = readonly(
		createStore<Array<Unit<unknown>>>([]).on(appendUnits, (state, units) => [...state, ...units]),
	);

	const $debouncedUnits = debounceStore({
		source: $units,
		defaultState: [],
		timeoutMs: 100,
	});
	const $regularNodes = $debouncedUnits.map(createEffectorNodesLookup);

	const $declarations = createDeclarationsStore();
	const $debouncedDeclarations = debounceStore({
		source: $declarations,
		defaultState: [],
		timeoutMs: 100,
	});

	const $effectorNodesLookup = combine(
		$regularNodes,
		$debouncedDeclarations,
		(effectorNodesById, declarations): Map<string, EffectorNode> => {
			const regularNodeIds = new Set(effectorNodesById.map((node) => node.id));

			const nonUnitNodes = declarations
				.filter((d) => !regularNodeIds.has(d.id))
				.filter((d) => d.type !== 'unit')
				.map((declaration): [string, DeclarationEffectorNode] => [
					declaration.id,
					{
						id: declaration.id,
						data: {
							nodeType: 'declaration',
							declaration: new EffectorDeclarationDetails(declaration),
						},
						position: { x: 0, y: 0 },
					},
				]);

			const regularNodeEntries: Array<[string, RegularEffectorNode]> = effectorNodesById.map((node) => [node.id, node]);
			return new Map<string, EffectorNode>([...regularNodeEntries, ...nonUnitNodes]);
		},
	);

	const edges = reshape({
		source: $effectorNodesLookup.map((map) => {
			try {
				return makeEdgesFromNodes(map);
			} catch (e) {
				console.error(e);
				return { linkingEdges: [], ownerhipEdges: [], reactiveEdges: [] } satisfies ReturnType<
					typeof makeEdgesFromNodes
				>;
			}
		}),
		shape: {
			$reactive: (edges) => edges.reactiveEdges,
			$ownership: (edges) => edges.ownerhipEdges,
			$linking: (edges) => edges.linkingEdges,
		},
	});

	const $nodes = $effectorNodesLookup.map((nodes) => sortNodes(Array.from(nodes.values())));

	/*
	const $reactiveGraph = combine<EffectorGraph>({ nodes: $nodeList, edges: edges.$reactive });
	const $ownershipGraph = combine<EffectorGraph>({ nodes: $nodeList, edges: edges.$ownership });
	const $reactiveOwnershipGraph = combine<EffectorGraph>({
		nodes: $nodeList,
		edges: combine(edges.$reactive, edges.$ownership, (reactive, ownership) => [...reactive, ...ownership]),
	});

	const graphVariantsMakerFactory = (edgesCleaner: GraphCleaner) => () => {
		return makeGraphVariants(edgesCleaner, cleanGraph, layouterFactory);
	};

	const ownershipEnricher = enrichGraph('ownership');
	const reactiveEnricher = enrichGraph('reactive');

	const makeReactiveGraphVariants = graphVariantsMakerFactory((graph) => reactiveEnricher(cleanReactiveEdges(graph)));
	const makeOwnershipGraphVariants = graphVariantsMakerFactory((graph) =>
		ownershipEnricher(cleanOwnershipEdges(graph)),
	);
	const makeReactiveOwnershipGraphVariants = graphVariantsMakerFactory((graph) =>
		reactiveEnricher(ownershipEnricher(cleanOwnershipEdges(cleanReactiveEdges(graph)))),
	);

	const createReactiveGraphVariantsFx = attach({ effect: makeReactiveGraphVariants, source: $reactiveGraph });
	const createOwnershipGraphVariantsFx = attach({
		effect: makeOwnershipGraphVariants,
		source: $ownershipGraph,
	});
	const createReactiveOwnershipGraphVariantsFx = attach({
		effect: makeReactiveOwnershipGraphVariants,
		source: $reactiveOwnershipGraph,
	});

	logEffectFail(createReactiveGraphVariantsFx);
	logEffectFail(createOwnershipGraphVariantsFx);
	logEffectFail(createReactiveOwnershipGraphVariantsFx);

	sample({
		clock: debounce($reactiveGraph, 100),
		target: createReactiveGraphVariantsFx,
	});

	sample({
		clock: debounce($ownershipGraph, 100),
		target: createOwnershipGraphVariantsFx,
	});

	sample({
		clock: debounce($reactiveOwnershipGraph, 100),
		target: createReactiveOwnershipGraphVariantsFx,
	});

	const $reactiveGraphVariants = restore(createReactiveGraphVariantsFx.doneData, null);
	const $ownershipGraphVariants = restore(createOwnershipGraphVariantsFx.doneData, null);
	const $reactiveOwnershipGraphVariants = restore(createReactiveOwnershipGraphVariantsFx.doneData, null);
*/

	return {
		$effectorNodesLookup,
		...edges,
		$nodes,
		appendUnits,
	};
});

type GrapheneModel = ReturnType<typeof grapheneModelFactory>;

export const EdgesViewVariant = {
	Reactive: 'reactive',
	Ownership: 'ownership',
} as const;

export type EdgesViewVariant = (typeof EdgesViewVariant)[keyof typeof EdgesViewVariant];

export type NamedCleanerSelectorModel = NamedCleanerSelector<GraphCleaner>;
export type NamedOwnerhipEdgesCleanerSelectorModel = NamedCleanerSelector<OwnershipEdgeCleaner>;
export type NamedReactiveEdgesCleanerSelectorModel = NamedCleanerSelector<ReactiveEdgeCleaner>;

export const appModelFactory = createFactory(
	({
		layouterFactory,
		grapheneModel,
		graphCleanerSelector,
		ownershipEdgeCleanerSelector,
		reactiveEdgeCleanerSelector,
	}: {
		layouterFactory: () => Layouter;
		grapheneModel: GrapheneModel;
		graphCleanerSelector: NamedCleanerSelectorModel;
		ownershipEdgeCleanerSelector: NamedOwnerhipEdgesCleanerSelectorModel;
		reactiveEdgeCleanerSelector: NamedReactiveEdgesCleanerSelectorModel;
	}) => {
		const edgesVariantChanged = createEvent<EdgeType[]>();
		const $edgesVariant = restore(
			edgesVariantChanged.map((items) => new Set(items)),
			new Set([EdgeType.Reactive, EdgeType.Ownership]),
		);

		const graphVariantChanged = createEvent<GraphVariant>();
		const $selectedGraphVariant = restore(graphVariantChanged, GraphVariant.cleaned);

		const $graph = combine(
			{
				nodes: grapheneModel.$nodes,
				edgesVariant: $edgesVariant,
				reactive: grapheneModel.$reactive,
				ownership: grapheneModel.$ownership,
			},
			({ nodes, edgesVariant, ...edges }): EffectorGraph => ({
				nodes,
				edges: [
					...(edgesVariant.has('reactive') ? edges.reactive : []),
					...(edgesVariant.has('ownership') ? edges.ownership : []),
				],
			}),
		);

		const ownershipEnricher = enrichGraph('ownership');
		const reactiveEnricher = enrichGraph('reactive');

		const getGraphVariantGeneratorsFx = createEffect<
			{
				edgesVariant: Set<EdgeType>;
				graphCleaners: readonly NamedGraphCleaner[];
				ownershipEdgeCleaners: readonly NamedOwnershipEdgeCleaner[];
				reactiveEdgeCleaners: readonly NamedReactiveEdgeCleaner[];
			},
			AsyncGraphVariantGenerators
		>(({ graphCleaners, edgesVariant, ownershipEdgeCleaners, reactiveEdgeCleaners }) => {
			const processingPipeline: GraphCleaner[] = [];

			if (edgesVariant.has('reactive')) {
				processingPipeline.push(cleanReactiveEdges(reactiveEdgeCleaners));
				processingPipeline.push(reactiveEnricher);
			}

			if (edgesVariant.has('ownership')) {
				processingPipeline.push(cleanOwnershipEdges(ownershipEdgeCleaners));
				processingPipeline.push(ownershipEnricher);
			}

			const cleaner: GraphCleaner = (graph: EffectorGraph) =>
				processingPipeline.reduce((graph, cleaner) => cleaner(graph), graph);
			return makeGraphVariants(cleaner, createGraphCleaner(graphCleaners), layouterFactory);
		});

		logEffectFail(getGraphVariantGeneratorsFx);

		sample({
			source: {
				edgesVariant: $edgesVariant,
				graphCleaners: graphCleanerSelector.$selectedCleaners,
				ownershipEdgeCleaners: ownershipEdgeCleanerSelector.$selectedCleaners,
				reactiveEdgeCleaners: reactiveEdgeCleanerSelector.$selectedCleaners,
			},
			target: getGraphVariantGeneratorsFx,
		});

		const getGraph = abortable(
			createEffect(
				({
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
					const result = generator(graph);

					signal.throwIfAborted();

					return result;
				},
			),
		);

		logEffectFail(getGraph.abortableFx);

		sample({
			source: {
				graph: $graph,
				selectedGraphVariant: $selectedGraphVariant,
				generators: restore(getGraphVariantGeneratorsFx.doneData, null),
			},
			target: getGraph.abortableFx,
		});

		debug(getGraphVariantGeneratorsFx, getGraph.abortableFx, $graph, getGraphVariantGeneratorsFx);

		const edgesGenerated = getGraph.abortableFx.doneData.map((graph): MyEdge[] => graph?.edges ?? []);
		const nodesGenerated = getGraph.abortableFx.doneData.map((graph): EffectorNode[] => graph?.nodes ?? []);

		const edgesChanged = createEvent<MyEdge[]>();
		const $edges = readonly(createStore<MyEdge[]>([]).on([edgesChanged, edgesGenerated], (_, edges) => edges));

		const nodesChanged = createEvent<EffectorNode[]>();
		const $nodes = readonly(createStore<EffectorNode[]>([]).on([nodesChanged, nodesGenerated], (_, nodes) => nodes));

		const nodeClicked = createEvent<{ id: string }>();

		const dumpNodeInfo = attach({
			source: grapheneModel.$effectorNodesLookup,
			effect: async (nodes, id) => {
				const found = nodes.get(id);

				if (!found) {
					console.warn('node not found', id);
				} else {
					console.log('node', found);
				}
			},
		});

		sample({
			clock: nodeClicked,
			target: dumpNodeInfo,
		});

		const edgeClicked = createEvent<{ id: string }>();

		const dumpEdgeInfo = attach({
			source: $edges,
			effect: async (edges, id) => {
				const found = edges.find((edge) => edge.id === id);

				if (!found) {
					console.warn('edge not found', id);
				} else {
					console.log('edge', found);
				}
			},
		});

		sample({
			clock: edgeClicked,
			target: dumpEdgeInfo,
		});

		const visibleEdgesChanged = createEvent<'reactive' | 'ownership' | 'reactive+ownership'>();
		const $visibleEdges = restore(visibleEdgesChanged, 'reactive+ownership');

		const $filteredEdges = combine($edges, $visibleEdges, (edges, visibleEdges) => {
			switch (visibleEdges) {
				case 'reactive':
					return edges.filter(isReactiveEdge);
				case 'ownership':
					return edges.filter(isOwnershipEdge);
				case 'reactive+ownership':
					return edges;
				default:
					absurd(visibleEdges);
			}
		});

		return {
			graphCleanerSelector: graphCleanerSelector['@@ui'],
			ownershipEdgeCleanerSelector: ownershipEdgeCleanerSelector['@@ui'],
			reactiveEdgeCleanerSelector: reactiveEdgeCleanerSelector['@@ui'],
			'@@unitShape': () => ({
				edgesVariantChanged,
				edgesVariant: $edgesVariant,

				graphVariantChanged,
				selectedGraphVariant: $selectedGraphVariant,

				edgesChanged,
				edges: $filteredEdges,

				nodesChanged,
				nodes: $nodes,

				visibleEdgesChanged,
				visibleEdges: $visibleEdges,

				nodeClicked,
				edgeClicked,
			}),
		};
	},
);
