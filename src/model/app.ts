import { createFactory, invoke } from '@withease/factories';
import { attach, combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { debounce, debug, readonly, throttle } from 'patronum';
import type { Layouter } from '../layouters/types';
import {
	absurd,
	assertDefined,
	GraphVariant,
	isCombinedStoreNode,
	isDeclarationNode,
	isFactoryOwnershipEdge,
	isFileNode,
	isGateNode,
	isParentToChildEdge,
	isReactiveEdge,
	isRegularNode,
	isSourceEdge,
} from '../lib';
import type { EdgeType } from '../types';
import { type EffectorNode, type MyEdge } from '../types';
import { generatedGraphModelFactory } from './generatedGraph';
import type { GrapheneModel } from './graphene';

export type VisibleEdgesVariant =
	| `${typeof EdgeType.Reactive}`
	| `${typeof EdgeType.Source}`
	| `${typeof EdgeType.ParentToChild}`
	| `${typeof EdgeType.FactoryOwnership}`
	| `${typeof EdgeType.Reactive}+${typeof EdgeType.Source}`
	| `${typeof EdgeType.Reactive}+${typeof EdgeType.ParentToChild}`
	| `${typeof EdgeType.Reactive}+${typeof EdgeType.Source}+${typeof EdgeType.ParentToChild}`;

export const appModelFactory = createFactory(
	({ layouterFactory, grapheneModel }: { layouterFactory: () => Layouter; grapheneModel: GrapheneModel }) => {
		const Gate = createGate<void>();

		const graphVariantChanged = createEvent<GraphVariant>();
		const $selectedGraphVariant = restore(graphVariantChanged, GraphVariant.cleanedNoNodesLayouted);

		const excludeOwnershipFromLayoutingChanged = createEvent<boolean>();
		const $excludeOwnershipFromLayouting = readonly(restore(excludeOwnershipFromLayoutingChanged, true));

		const toggleNode = createEvent<string>();
		const $unfoldedNodes = createStore<Set<string>>(new Set());
		$unfoldedNodes.on(toggleNode, (state, id) => {
			const newState = new Set(state);
			if (newState.has(id)) {
				newState.delete(id);
			} else {
				newState.add(id);
			}
			return newState;
		});

		const viewportSizeChanged = createEvent<{ width: number; height: number }>();
		const viewportSizeChangesThrottled = throttle(viewportSizeChanged, 300);
		const $viewportSize = createStore<{ width: number; height: number }>(
			{ width: 0, height: 0 },
			{
				updateFilter(update, current) {
					if (update.width === current.width && update.height === current.height) return false;
					return true;
				},
			},
		).on(viewportSizeChangesThrottled, (_, update) => update);

		const viewportPosAndZoomChanged = createEvent<{ x: number; y: number; zoom: number }>();
		const viewportPosAndZoomChangesThrottled = throttle(viewportPosAndZoomChanged, 300);
		const $viewportPosAndZoom = createStore<{ x: number; y: number; zoom: number }>(
			{ x: 0, y: 0, zoom: 1 },
			{
				updateFilter(update, current) {
					if (update.x === current.x && update.y === current.y && update.zoom === current.zoom) return false;
					return true;
				},
			},
		).on(viewportPosAndZoomChangesThrottled, (_, update) => update);

		const $viewport = combine($viewportSize, $viewportPosAndZoom, (size, posAndZoom) => {
			const { width, height } = size;
			const { x, y, zoom } = posAndZoom;

			return {
				// Convert viewport coordinates to content coordinates
				left: -x / zoom,
				right: (-x + width) / zoom,
				top: -y / zoom,
				bottom: (-y + height) / zoom,
			};
		});

		const { graphGenerated, pickupStoredPipeline, graphCleanerSelector } = invoke(generatedGraphModelFactory, {
			grapheneModel,
			layouterFactory,
			$excludeOwnershipFromLayouting,
			// ownershipEdgeCleanerSelector,
			// reactiveEdgeCleanerSelector,
			$selectedGraphVariant,
			$unfoldedNodes,
		});

		sample({
			clock: Gate.open,
			target: pickupStoredPipeline,
		});

		const hideNodesWithNoLocationChanged = createEvent<boolean>();
		const $hideNodesWithNoLocation = readonly(restore(hideNodesWithNoLocationChanged, false));

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

				return {
					...node,
					hidden: node.data.noLoc || !node.data.effector.loc,
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

				console.log('node', original);

				if (isRegularNode(node)) {
					console.log('effector', node.data.effector);
					console.log('declaration', node.data.declaration);
				} else if (isDeclarationNode(node)) {
					console.log('node', node.data.declaration);
				} else if (isCombinedStoreNode(node)) {
					console.log('combined', node.data.relatedNodes);
				} else if (isGateNode(node)) {
					console.log('gate', node.data.gateName, node.data.relatedNodes);
				} else if (isFileNode(node)) {
					console.log('file', node.data.fileName);
				} else {
					absurd(node);
				}

				const relatedIncomingEdges = graph.edges.filter((edge) => edge.target === node.id);
				if (relatedIncomingEdges.length) {
					console.group('Incoming edges');

					for (const relatedIncomingEdge of relatedIncomingEdges) {
						console.log(relatedIncomingEdge);
					}

					console.groupEnd();
				}

				const relatedOutcomingEdges = graph.edges.filter((edge) => edge.source === node.id);
				if (relatedOutcomingEdges.length) {
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

		const visibleEdgesChanged = createEvent<VisibleEdgesVariant>();
		const $visibleEdges = restore<VisibleEdgesVariant>(visibleEdgesChanged, 'reactive+source');

		const $filteredEdges = combine({ edges: $edges, visibleEdges: $visibleEdges }, ({ edges, visibleEdges }) => {
			switch (visibleEdges) {
				case 'reactive':
					return edges.filter(isReactiveEdge);
				case 'source':
					return edges.filter(isSourceEdge);
				case 'parent-to-child':
					return edges.filter(isParentToChildEdge);
				case 'factory-ownership':
					return edges.filter(isFactoryOwnershipEdge);
				case 'reactive+parent-to-child':
					return edges.filter((edge) => isReactiveEdge(edge) || isParentToChildEdge(edge));
				case 'reactive+source':
					return edges.filter((edge) => isReactiveEdge(edge) || isSourceEdge(edge));
				case 'reactive+source+parent-to-child':
					return edges;
				default:
					throw new RangeError(`Unexpected visibleEdges: ${visibleEdges}`);
			}
		});

		const $virtualizedGraph = combine(
			{ nodes: $visibleNodes, edges: $filteredEdges, viewport: $viewport },
			({ nodes, edges, viewport }) => {
				const nodesInViewport = nodes.filter(
					(node) =>
						node.position.x + (node.width ?? 0) > viewport.left &&
						node.position.x < viewport.right &&
						node.position.y + (node.height ?? 0) > viewport.top &&
						node.position.y < viewport.bottom,
				);

				const viewportNodeIdsSet = new Set(nodesInViewport.map((node) => node.id));

				const edgesInViewport = edges.filter(
					(edge) => viewportNodeIdsSet.has(edge.source) || viewportNodeIdsSet.has(edge.target),
				);

				const allConnectedNodeIds = new Set<string>();
				for (const edge of edgesInViewport) {
					allConnectedNodeIds.add(edge.source);
					allConnectedNodeIds.add(edge.target);
				}

				const allRelatedNodes = nodes.filter((node) => allConnectedNodeIds.has(node.id));

				console.log(allRelatedNodes.length, 'related nodes');
				console.log(edgesInViewport.length, 'edges in viewport');

				return {
					nodes: nodes,
					edges: edgesInViewport,
				};
			},
		);

		const $virtualizedNodes = $virtualizedGraph.map((graph) => graph.nodes);
		const $virtualizedEdges = $virtualizedGraph.map((graph) => graph.edges);

		return {
			appendUnits: grapheneModel.appendUnits,
			Gate,
			graphCleanerSelector: graphCleanerSelector['@@ui'],
			'@@unitShape': () => ({
				hideNodesWithNoLocationChanged,
				hideNodesWithNoLocation: $hideNodesWithNoLocation,

				graphVariantChanged,
				selectedGraphVariant: $selectedGraphVariant,

				excludeOwnershipFromLayoutingChanged,
				excludeOwnershipFromLayouting: $excludeOwnershipFromLayouting,

				edgesChanged,
				edges: $virtualizedEdges,

				nodesChanged,
				nodes: $virtualizedNodes,

				visibleEdgesChanged,
				visibleEdges: $visibleEdges,

				nodeClicked,
				edgeClicked,

				toggleFactoryNode: toggleNode,
				unfoldedFactoryNodes: $unfoldedNodes,

				viewportSizeChanged,
				viewportSize: $viewportSize,
				viewportPosAndZoomChanged,
				viewportPosAndZoom: $viewportPosAndZoom,
			}),
		};
	},
);
