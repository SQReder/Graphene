import { createFactory } from '@withease/factories';
import { attach, combine, createEffect, createEvent, createStore, restore, sample, Store, Unit } from 'effector';
import { Declaration, inspectGraph } from 'effector/inspect';
import { debounce, debug, readonly, reshape } from 'patronum';
import { cleanOwnershipEdges } from './graph-morphers/cleaners/edge-ownership';
import { cleanReactiveEdges } from './graph-morphers/cleaners/edge-reactive';
import { cleanGraph } from './graph-morphers/cleaners/graph';
import { GraphCleaner } from './graph-morphers/cleaners/types';
import { enrichGraph } from './graph-morphers/enrichers';
import { Layouter } from './layouters/types';
import {
	absurd,
	AsyncGraphVariantGenerators,
	createEffectorNodesLookup,
	GraphVariant,
	isOwnershipEdge,
	isReactiveEdge,
	makeEdgesFromNodes,
	makeGraphVariants,
	sortNodes,
} from './lib';
import {
	DeclarationEffectorNode,
	EdgeType,
	EffectorDeclarationDetails,
	EffectorGraph,
	EffectorNode,
	MyEdge,
	RegularEffectorNode,
} from './types';

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
	const appendUnits = createEvent<readonly Unit<unknown>[]>();
	const $units = readonly(createStore<Unit<unknown>[]>([]).on(appendUnits, (state, units) => [...state, ...units]));

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

			const regularNodeEntries: [string, RegularEffectorNode][] = effectorNodesById.map((node) => [node.id, node]);
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

export const appModelFactory = createFactory(
	({ layouterFactory, grapheneModel }: { layouterFactory: () => Layouter; grapheneModel: GrapheneModel }) => {
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

		const graphVariantsMakerFactory = (edgesCleaner: GraphCleaner) =>
			makeGraphVariants(edgesCleaner, cleanGraph, layouterFactory);

		const ownershipEnricher = enrichGraph('ownership');
		const reactiveEnricher = enrichGraph('reactive');

		const getGraphVariantGeneratorsFx = createEffect((edgesVariant: Set<EdgeType>) => {
			const processingPipeline: GraphCleaner[] = [];

			if (edgesVariant.has('reactive')) {
				processingPipeline.push(cleanReactiveEdges);
				processingPipeline.push(reactiveEnricher);
			}

			if (edgesVariant.has('ownership')) {
				processingPipeline.push(cleanOwnershipEdges);
				processingPipeline.push(ownershipEnricher);
			}

			const cleaner: GraphCleaner = (graph: EffectorGraph) =>
				processingPipeline.reduce((graph, cleaner) => cleaner(graph), graph);
			return graphVariantsMakerFactory(cleaner);
		});

		sample({
			clock: $edgesVariant,
			target: getGraphVariantGeneratorsFx,
		});

		const getGraphFx = createEffect(
			({
				graph,
				selectedGraphVariant,
				generators,
			}: {
				graph: EffectorGraph;
				selectedGraphVariant: GraphVariant;
				generators: AsyncGraphVariantGenerators | null;
			}) => {
				if (!generators) {
					console.warn('No generators found');
					return;
				}

				const generator = generators[selectedGraphVariant];
				return generator(graph);
			},
		);

		sample({
			source: {
				graph: $graph,
				selectedGraphVariant: $selectedGraphVariant,
				generators: restore(getGraphVariantGeneratorsFx.doneData, null),
			},
			target: getGraphFx,
		});

		debug(getGraphVariantGeneratorsFx, getGraphFx, $graph);

		const edgesGenerated = getGraphFx.doneData.map((graph): MyEdge[] => graph?.edges ?? []);
		const nodesGenerated = getGraphFx.doneData.map((graph): EffectorNode[] => graph?.nodes ?? []);

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
