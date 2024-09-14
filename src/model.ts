import { createFactory } from '@withease/factories';
import { attach, combine, createEvent, createStore, restore, sample, Store, Unit } from 'effector';
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
	createEffectorNodesLookup,
	GraphVariant,
	isOwnershipEdge,
	isReactiveEdge,
	makeEdgesFromNodes,
	makeGraphVariants,
	sortNodes,
} from './lib';
import { logEffectFail } from './logEffectFail';
import { DeclarationEffectorNode, EffectorDeclarationDetails, EffectorGraph, EffectorNode, MyEdge } from './types';

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

	return restore(debounce($declarations, 100), []);
}

export const grapheneModelFactory = createFactory(({ layouterFactory }: { layouterFactory: () => Layouter }) => {
	const appendUnits = createEvent<readonly Unit<unknown>[]>();
	const $units = readonly(createStore<Unit<unknown>[]>([]).on(appendUnits, (state, units) => [...state, ...units]));

	const $regularNodesById = $units.map(createEffectorNodesLookup);

	const $declarations = createDeclarationsStore();

	const $effectorNodesLookup = combine($regularNodesById, $declarations, (effectorNodesById, declarations) => {
		const nonUnitNodes = declarations
			.filter((d) => !effectorNodesById.has(d.id))
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

		return new Map<string, EffectorNode>([...effectorNodesById.entries(), ...nonUnitNodes]);
	});

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

	const $nodeList = $effectorNodesLookup.map((nodes) => sortNodes(Array.from(nodes.values())));

	debug({ trace: true, handler: (context) => console.log(context) }, $nodeList);

	const $reactiveGraph = combine<EffectorGraph>({ nodes: $nodeList, edges: edges.$reactive });
	const $ownershipGraph = combine<EffectorGraph>({ nodes: $nodeList, edges: edges.$ownership });
	const $reactiveOwnershipGraph = combine<EffectorGraph>({
		nodes: $nodeList,
		edges: combine(edges.$reactive, edges.$ownership, (reactive, ownership) => [...reactive, ...ownership]),
	});

	const graphVariantsMakerFactory = (edgesCleaner: GraphCleaner) => (graph: EffectorGraph) => {
		return makeGraphVariants(graph, edgesCleaner, cleanGraph, layouterFactory);
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

	return {
		$effectorNodesLookup,

		$reactiveGraphVariants,
		$ownershipGraphVariants,
		$reactiveOwnershipGraphVariants,

		appendUnits,
	};
});

type GrapheneModel = ReturnType<typeof grapheneModelFactory>;

export const EdgesViewVariant = {
	Reactive: 'reactive',
	Ownership: 'ownership',
	ReactiveOwnership: 'reactive+ownership',
} as const;

export type EdgesViewVariant = (typeof EdgesViewVariant)[keyof typeof EdgesViewVariant];

export const appModelFactory = createFactory((grapheneModel: GrapheneModel) => {
	const edgesVariantChanged = createEvent<EdgesViewVariant>();
	const $edgesVariant = restore(edgesVariantChanged, 'reactive+ownership');

	const graphVariantChanged = createEvent<GraphVariant>();
	const $selectedGraphVariant = restore(graphVariantChanged, 'cleanedNoNodesLayouted');

	const $graphVariants = combine(
		{
			variant: $edgesVariant,
			reactive: grapheneModel.$reactiveGraphVariants,
			ownership: grapheneModel.$ownershipGraphVariants,
			reactiveOwnership: grapheneModel.$reactiveOwnershipGraphVariants,
		},
		({ variant, reactive, ownership, reactiveOwnership }) => {
			switch (variant) {
				case 'reactive':
					return reactive;
				case 'ownership':
					return ownership;
				case 'reactive+ownership':
					return reactiveOwnership;
				default:
					absurd(variant);
			}
		},
	);

	const $graphVariant = combine(
		{ graphVariants: $graphVariants, graphVariant: $selectedGraphVariant },
		({ graphVariants, graphVariant }) => {
			if (!graphVariants) return null;

			switch (graphVariant) {
				case 'raw':
					return graphVariants.raw;
				case 'cleaned':
					return graphVariants.cleaned;
				case 'cleanedNoNodes':
					return graphVariants.cleanedNoNodes;
				case 'cleanedNoNodesLayouted':
					return graphVariants.cleanedNoNodesLayouted;
				default:
					absurd(graphVariant);
			}
		},
	);

	const edgesChanged = createEvent<MyEdge[]>();
	const $edges = readonly(
		createStore<MyEdge[]>([]).on(
			[edgesChanged, $graphVariant.map((graph): MyEdge[] => graph?.edges ?? [])],
			(_, edges) => edges,
		),
	);

	const nodesChanged = createEvent<EffectorNode[]>();
	const $nodes = readonly(
		createStore<EffectorNode[]>([]).on(
			[nodesChanged, $graphVariant.map((graph): EffectorNode[] => graph?.nodes ?? [])],
			(_, nodes) => nodes,
		),
	);

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
});
