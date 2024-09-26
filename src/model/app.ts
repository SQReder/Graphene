import { createFactory, invoke } from '@withease/factories';
import { attach, combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly } from 'patronum';
import type { Layouter } from '../layouters/types';
import {
	absurd,
	assertDefined,
	GraphVariant,
	isCombinedStoreNode,
	isDeclarationNode,
	isOwnershipEdge,
	isReactiveEdge,
	isRegularNode,
} from '../lib';
import { EdgeType, type EffectorNode, type MyEdge } from '../types';
import { generatedGraphModelFactory, type NamedCleanerSelectorModel } from './generatedGraph';
import type { GrapheneModel } from './graphene';

export const appModelFactory = createFactory(
	({
		layouterFactory,
		grapheneModel,
		graphCleanerSelector,
	}: // ownershipEdgeCleanerSelector,
	// reactiveEdgeCleanerSelector,
	{
		layouterFactory: () => Layouter;
		grapheneModel: GrapheneModel;
		graphCleanerSelector: NamedCleanerSelectorModel;
		// ownershipEdgeCleanerSelector: NamedCleanerSelectorModel;
		// reactiveEdgeCleanerSelector: NamedCleanerSelectorModel;
	}) => {
		const Gate = createGate<void>();

		const edgesVariantChanged = createEvent<EdgeType[]>();
		const $edgesVariant = restore(
			edgesVariantChanged.map((items) => new Set(items)),
			new Set([EdgeType.Reactive, EdgeType.Ownership]),
		);

		const graphVariantChanged = createEvent<GraphVariant>();
		const $selectedGraphVariant = restore(graphVariantChanged, GraphVariant.cleanedNoNodesLayouted);
		const { graphGenerated } = invoke(generatedGraphModelFactory, {
			grapheneModel,
			$edgesVariant,
			layouterFactory,
			pickupStoredPipeline: Gate.open,
			graphCleanerSelector,
			// ownershipEdgeCleanerSelector,
			// reactiveEdgeCleanerSelector,
			$selectedGraphVariant,
		});
		const hideNodesWithNoLocationChanged = createEvent<boolean>();
		const $hideNodesWithNoLocation = readonly(restore(hideNodesWithNoLocationChanged, true));

		const edgesChanged = createEvent<MyEdge[]>();
		const $edges = readonly(
			createStore<MyEdge[]>([]).on([edgesChanged, graphGenerated.map((g) => g?.edges ?? [])], (_, edges) => edges),
		);

		const nodesChanged = createEvent<EffectorNode[]>();
		const $nodes = readonly(
			createStore<EffectorNode[]>([]).on(
				[nodesChanged, graphGenerated.map((g) => g?.nodes ?? [])],
				(_, nodes) => nodes,
			),
		);

		const $visibleNodes = combine($nodes, $hideNodesWithNoLocation, (nodes, hideNodesWithNoLocation) =>
			nodes.map((node) => {
				const isRegular = isRegularNode(node);

				if (!isRegular || !hideNodesWithNoLocation) return { ...node, hidden: false };

				const hasMetaLoc = node.data.effector.meta.loc != null;
				const region = node.data.declaration?.declaration?.region;
				const hasDeclarationRegionLoc = region && 'loc' in region && region.loc != null;
				const isCombined = node.data.effector.meta.isCombinedStore;

				const hasFactoryLoc = node.data.effector.graphite.family.owners.some(
					(owner) => owner.meta.op === undefined && owner.meta.loc != null,
				);

				return {
					...node,
					hidden: !(hasMetaLoc || hasDeclarationRegionLoc || isCombined || hasFactoryLoc),
				};
			}),
		);
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

				if (isRegularNode(node)) {
					console.log('effector', node.data.effector);
					console.log('declaration', node.data.declaration);
				} else if (isDeclarationNode(node)) {
					console.log('node', node.data.declaration);
				} else if (isCombinedStoreNode(node)) {
					console.log('combined', node.data.relatedNodes);
				} else {
					absurd(node);
				}

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
			graphCleanerSelector: graphCleanerSelector['@@ui'],
			'@@unitShape': () => ({
				hideNodesWithNoLocationChanged,
				hideNodesWithNoLocation: $hideNodesWithNoLocation,

				edgesVariantChanged,
				edgesVariant: $edgesVariant,

				graphVariantChanged,
				selectedGraphVariant: $selectedGraphVariant,

				edgesChanged,
				edges: $filteredEdges,

				nodesChanged,
				nodes: $visibleNodes,

				visibleEdgesChanged,
				visibleEdges: $visibleEdges,

				nodeClicked,
				edgeClicked,
			}),
		};
	},
);
