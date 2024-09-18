import { createFactory, invoke } from '@withease/factories';
import {
	attach,
	combine,
	createEffect,
	createEvent,
	createStore,
	restore,
	sample,
	type Store,
	type Unit,
} from 'effector';
import type { Gate } from 'effector-react';
import { createGate } from 'effector-react';
import type { Declaration } from 'effector/inspect';
import { debug, readonly, reshape } from 'patronum';
import type { WithAbortSignal } from './abortable';
import { abortable } from './abortable';
import { debounceStore } from './debounceStore';
import { sortTreeNodesBFS } from './dfs';
import { createGraphCleaner } from './graph-morphers/cleaners/lib';
import { dropPipeline, pipeline } from './graph-morphers/pipeline';
import type { Layouter } from './layouters/types';
import {
	absurd,
	assertDefined,
	type AsyncGraphVariantGenerators,
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

export const declarationsStoreModelFactory = createFactory(() => {
	const addDeclaration = createEvent<Declaration>();
	const clearDeclarations = createEvent();
	const $declarations = readonly(
		createStore<readonly Declaration[]>([])
			.on(addDeclaration, (state, declaration) => [...state, declaration])
			.reset(clearDeclarations),
	);

	debug(clearDeclarations);

	return {
		$declarations,
		clearDeclarations,
		addDeclaration,
	};
});

type DeclarationsStoreModel = ReturnType<typeof declarationsStoreModelFactory>;

export const grapheneModelFactory = createFactory(
	({ declarationsModel }: { declarationsModel: DeclarationsStoreModel }) => {
		const appendUnits = createEvent<ReadonlyArray<Unit<unknown>>>();

		const $units = readonly(
			createStore<Array<Unit<unknown>>>([]).on(appendUnits, (state, units) => [...state, ...units]),
		);

		const $debouncedUnits = debounceStore({
			source: $units,
			defaultState: [],
			timeoutMs: 100,
		});
		const $regularNodes = $debouncedUnits.map((units) => (units.length > 0 ? createEffectorNodesLookup(units) : []));

		const $debouncedDeclarations = debounceStore({
			source: declarationsModel.$declarations,
			defaultState: [],
			timeoutMs: 100,
		});

		const $effectorNodesLookup = combine(
			$regularNodes,
			$debouncedDeclarations,
			(effectorNodesById, declarations): Map<string, EffectorNode> => {
				if (effectorNodesById.length === 0) {
					console.log('skip graph computing');
					return new Map();
				}

				console.log('Nodes:', effectorNodesById);
				console.log('Declarations:', declarations);

				const regularNodeIds = new Set(effectorNodesById.map((node) => node.id));

				const nonUnitNodes: Array<[string, DeclarationEffectorNode]> = [];
				console.groupCollapsed('matching declarations');
				for (const declaration of declarations) {
					const declarationDetails = new EffectorDeclarationDetails(declaration);

					if (!regularNodeIds.has(declaration.id)) {
						if (declaration.type !== 'unit') {
							nonUnitNodes.push([
								declaration.id,
								{
									id: declaration.id,
									data: {
										nodeType: 'declaration',
										declaration: declarationDetails,
										label: declaration.name,
									},
									position: { x: 0, y: 0 },
								},
							]);
						}
					} else {
						console.groupCollapsed(`Declaration ${declaration.id} matched with regular unit`);
						console.log('Declaration:', declaration);
						const foundRegularUnit = effectorNodesById.find((node) => node.id === declaration.id);
						console.log('Regular unit:', foundRegularUnit);

						if (foundRegularUnit) {
							foundRegularUnit.data.declaration = declarationDetails;
						}
						console.groupEnd();
					}
				}
				console.groupEnd();

				const regularNodeEntries: Array<[string, RegularEffectorNode]> = effectorNodesById.map((node) => [
					node.id,
					node,
				]);
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

		return {
			$effectorNodesLookup,
			...edges,
			$nodes,
			appendUnits,
		};
	},
);

type GrapheneModel = ReturnType<typeof grapheneModelFactory>;

export const EdgesViewVariant = {
	Reactive: 'reactive',
	Ownership: 'ownership',
} as const;

export type EdgesViewVariant = (typeof EdgesViewVariant)[keyof typeof EdgesViewVariant];

// export type NamedCleanerSelectorModel = NamedCleanerSelector<GraphCleaner>;
// export type NamedOwnerhipEdgesCleanerSelectorModel = NamedCleanerSelector<OwnershipEdgeCleaner>;
// export type NamedReactiveEdgesCleanerSelectorModel = NamedCleanerSelector<ReactiveEdgeCleaner>;

const generatedGraphModelFactory = createFactory(
	({
		grapheneModel,
		$edgesVariant,
		layouterFactory,
		Gate,
		// graphCleanerSelector,
		// ownershipEdgeCleanerSelector,
		// reactiveEdgeCleanerSelector,
		$selectedGraphVariant,
	}: {
		grapheneModel: GrapheneModel;
		$edgesVariant: Store<Set<EdgeType>>;
		layouterFactory: () => Layouter;
		Gate: Gate<unknown>;
		// graphCleanerSelector: NamedCleanerSelectorModel;
		// ownershipEdgeCleanerSelector: NamedCleanerSelectorModel;
		// reactiveEdgeCleanerSelector: NamedCleanerSelectorModel;
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

		// const ownershipEnricher = enrichGraph('ownership');
		// const reactiveEnricher = enrichGraph('reactive');

		const getGraphVariantGeneratorsFx = createEffect<
			{
				edgesVariant: Set<EdgeType>;
				// graphCleaners: readonly NamedGraphCleaner[];
				// ownershipEdgeCleaners: readonly NamedOwnershipEdgeCleaner[];
				// reactiveEdgeCleaners: readonly NamedReactiveEdgeCleaner[];
			},
			AsyncGraphVariantGenerators
		>(({ edgesVariant }) => {
			// const processingPipeline: GraphCleaner[] = [];
			//
			// if (edgesVariant.has('reactive')) {
			// 	processingPipeline.push(cleanReactiveEdges(reactiveEdgeCleaners));
			// 	processingPipeline.push(reactiveEnricher);
			// }
			//
			// if (edgesVariant.has('ownership')) {
			// 	processingPipeline.push(cleanOwnershipEdges(ownershipEdgeCleaners));
			// 	processingPipeline.push(ownershipEnricher);
			// }

			return makeGraphVariants(createGraphCleaner(pipeline), createGraphCleaner(dropPipeline), layouterFactory);
		});

		logEffectFail(getGraphVariantGeneratorsFx);

		sample({
			clock: [
				Gate.open,
				$edgesVariant,
				// graphCleanerSelector.$selectedCleaners,
				// ownershipEdgeCleanerSelector.$selectedCleaners,
				// reactiveEdgeCleanerSelector.$selectedCleaners,
			],
			source: {
				edgesVariant: $edgesVariant,
				// graphCleaners: graphCleanerSelector.$selectedCleaners,
				// ownershipEdgeCleaners: ownershipEdgeCleanerSelector.$selectedCleaners,
				// reactiveEdgeCleaners: reactiveEdgeCleanerSelector.$selectedCleaners,
			},
			target: getGraphVariantGeneratorsFx,
		});

		const getGraph = abortable(
			createEffect(
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
					const result = await generator(graph);

					try {
						result.nodes = sortTreeNodesBFS(result.nodes);
						console.log('unsorted', result.nodes);
						console.log('sorted', result.nodes);
					} catch (e) {
						console.error('Sorting failed', e);
					}

					signal.throwIfAborted();

					return result;
				},
			),
		);

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

		const edgesGenerated = getGraph.abortableFx.doneData.map((graph): MyEdge[] => graph?.edges ?? []);
		const nodesGenerated = getGraph.abortableFx.doneData.map((graph): EffectorNode[] => graph?.nodes ?? []);
		return { edgesGenerated, nodesGenerated };
	},
);

export const appModelFactory = createFactory(
	({
		layouterFactory,
		grapheneModel,
	}: // graphCleanerSelector,
	// ownershipEdgeCleanerSelector,
	// reactiveEdgeCleanerSelector,
	{
		layouterFactory: () => Layouter;
		grapheneModel: GrapheneModel;
		// graphCleanerSelector: NamedCleanerSelectorModel;
		// ownershipEdgeCleanerSelector: NamedCleanerSelectorModel;
		// reactiveEdgeCleanerSelector: NamedCleanerSelectorModel;
	}) => {
		const Gate = createGate();

		const edgesVariantChanged = createEvent<EdgeType[]>();
		const $edgesVariant = restore(
			edgesVariantChanged.map((items) => new Set(items)),
			new Set([EdgeType.Reactive, EdgeType.Ownership]),
		);

		const graphVariantChanged = createEvent<GraphVariant>();
		const $selectedGraphVariant = restore(graphVariantChanged, GraphVariant.cleanedNoNodesLayouted);
		const { edgesGenerated, nodesGenerated } = invoke(generatedGraphModelFactory, {
			grapheneModel,
			$edgesVariant,
			layouterFactory,
			Gate,
			// graphCleanerSelector,
			// ownershipEdgeCleanerSelector,
			// reactiveEdgeCleanerSelector,
			$selectedGraphVariant,
		});

		const edgesChanged = createEvent<MyEdge[]>();
		const $edges = readonly(createStore<MyEdge[]>([]).on([edgesChanged, edgesGenerated], (_, edges) => edges));

		debug({ trace: true }, $edges);

		const nodesChanged = createEvent<EffectorNode[]>();
		const $nodes = readonly(createStore<EffectorNode[]>([]).on([nodesChanged, nodesGenerated], (_, nodes) => nodes));

		const $graph = combine({ nodes: $nodes, edges: $edges });

		const nodeClicked = createEvent<EffectorNode>();

		const dumpNodeInfo = attach({
			source: {
				graph: $graph,
			},
			effect: async ({ graph }, node: EffectorNode) => {
				assertDefined(graph);

				console.group(`👓 ${node.id} ${node.data.label}`);

				console.log('Actual node state', node);

				const original = graph.nodes.find((n) => n.id === node.id);

				if (!original) {
					console.warn('original node not found', node.id);
				}

				const relatedIncomingEdges = graph.edges.filter((edge) => edge.target === node.id);
				const relatedOutcomingEdges = graph.edges.filter((edge) => edge.source === node.id);

				console.log('node', original);
				if (relatedIncomingEdges.length) {
					console.group('Incoming edges');

					for (const relatedIncomingEdge of relatedIncomingEdges) {
						console.log(relatedIncomingEdge);
					}

					console.groupEnd();
				}

				if (relatedIncomingEdges.length) {
					console.group('Outcoming edges');

					for (const relatedOutcomingEdge of relatedOutcomingEdges) {
						console.log(relatedOutcomingEdge);
					}

					console.groupEnd();
				}

				console.groupEnd();
			},
		});

		sample({
			clock: nodeClicked,
			target: dumpNodeInfo,
		});

		const edgeClicked = createEvent<{ id: string }>();

		const dumpEdgeInfo = attach({
			source: $edges,
			effect: async (edges, { id }: { id: string }) => {
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
			appendUnits: grapheneModel.appendUnits,
			Gate,
			// graphCleanerSelector: graphCleanerSelector['@@ui'],
			// ownershipEdgeCleanerSelector: ownershipEdgeCleanerSelector['@@ui'],
			// reactiveEdgeCleanerSelector: reactiveEdgeCleanerSelector['@@ui'],
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
