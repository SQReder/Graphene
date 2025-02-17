import { createFactory, invoke } from '@withease/factories';
import { attach, combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly, throttle } from 'patronum';
import type { EdgeType } from '../EdgeType';
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

			const overscanRatio = 0.1;
			// Add overscan (50% of viewport size)
			const overscanX = (width / zoom) * overscanRatio;
			const overscanY = (height / zoom) * overscanRatio;

			return {
				// Convert viewport coordinates to content coordinates
				left: -x / zoom - overscanX,
				right: (-x + width) / zoom + overscanX,
				top: -y / zoom - overscanY,
				bottom: (-y + height) / zoom + overscanY,
				// Add original viewport bounds for debugging/visualization
				visible: {
					left: -x / zoom,
					right: (-x + width) / zoom,
					top: -y / zoom,
					bottom: (-y + height) / zoom,
				},
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

		// Helper functions for line-rectangle intersection
		function lineIntersectsRect(
			x1: number,
			y1: number, // Line start point
			x2: number,
			y2: number, // Line end point
			rectLeft: number,
			rectTop: number,
			rectRight: number,
			rectBottom: number,
		): boolean {
			// Check if either endpoint is inside the rectangle
			if (x1 >= rectLeft && x1 <= rectRight && y1 >= rectTop && y1 <= rectBottom) return true;
			if (x2 >= rectLeft && x2 <= rectRight && y2 >= rectTop && y2 <= rectBottom) return true;

			// Check intersection with each edge of the rectangle
			return (
				lineIntersectsLine(x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectTop) || // Top edge
				lineIntersectsLine(x1, y1, x2, y2, rectRight, rectTop, rectRight, rectBottom) || // Right edge
				lineIntersectsLine(x1, y1, x2, y2, rectRight, rectBottom, rectLeft, rectBottom) || // Bottom edge
				lineIntersectsLine(x1, y1, x2, y2, rectLeft, rectBottom, rectLeft, rectTop) // Left edge
			);
		}

		function lineIntersectsLine(
			x1: number,
			y1: number,
			x2: number,
			y2: number,
			x3: number,
			y3: number,
			x4: number,
			y4: number,
		): boolean {
			// Calculate denominators
			const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
			if (denom === 0) return false; // Lines are parallel

			const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
			const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

			// Return true if the intersection is within both line segments
			return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
		}

		const $virtualizedGraph = combine(
			{ nodes: $visibleNodes, edges: $filteredEdges, viewport: $viewport },
			({ nodes, edges, viewport }) => {
				// Create a lookup for node positions and dimensions
				const nodePositions = new Map(
					nodes.map((node) => [
						node.id,
						{
							x: node.position.x + (node.width ?? 0) / 2, // Center x
							y: node.position.y + (node.height ?? 0) / 2, // Center y
							width: node.width ?? 0,
							height: node.height ?? 0,
						},
					]),
				);

				// Find edges that intersect with viewport (including overscan)
				const edgesInViewport = edges.filter((edge) => {
					const sourcePos = nodePositions.get(edge.source);
					const targetPos = nodePositions.get(edge.target);

					if (!sourcePos || !targetPos) return false;

					return lineIntersectsRect(
						sourcePos.x,
						sourcePos.y,
						targetPos.x,
						targetPos.y,
						viewport.left,
						viewport.top,
						viewport.right,
						viewport.bottom,
					);
				});

				// Collect all nodes connected to viewport-intersecting edges
				const relatedNodeIds = new Set<string>();
				for (const edge of edgesInViewport) {
					relatedNodeIds.add(edge.source);
					relatedNodeIds.add(edge.target);
				}

				const relatedNodes = nodes.filter((node) => relatedNodeIds.has(node.id));

				console.log(relatedNodes.length, 'related nodes');
				console.log(edgesInViewport.length, 'edges in viewport');
				console.log(
					'viewport with overscan:',
					Math.round(viewport.right - viewport.left),
					'x',
					Math.round(viewport.bottom - viewport.top),
					'visible:',
					Math.round(viewport.visible.right - viewport.visible.left),
					'x',
					Math.round(viewport.visible.bottom - viewport.visible.top),
				);

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
