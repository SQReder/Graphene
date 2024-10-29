import { createLinkEdge, createReactiveEdge, createSourceEdge } from './edge-factories';
import { unique } from './lib';
import { type EffectorNode, type MyEdge, type OpType, OpTypeWithCycles } from './types';

type NodeId = string;

// Placeholder function types to retrieve node IDs
function getLinkedNodes(node: EffectorNode): NodeId[] {
	return unique(node.data.effector?.graphite.family.links.map((x) => x.id) ?? []);
}

function getOwnersNodes(node: EffectorNode): NodeId[] {
	return unique(node.data.effector?.graphite.family.owners.map((x) => x.id) ?? []);
}

function getNextNodes(node: EffectorNode): NodeId[] {
	return unique(node.data.effector?.graphite.next.map((x) => x.id) ?? []);
}

// Helper function to resolve NodeId to EffectorNode
function findNodeById(nodeId: NodeId, nodes: EffectorNode[]): EffectorNode | undefined {
	return nodes.find((node) => node.id === nodeId);
}

// Generalized function to handle edge creation with duplicate tracking and direction control
function createEdgesWithTracking(
	node: EffectorNode,
	targetNodeIds: string[],
	nodes: EffectorNode[],
	createEdge: (params: { id: string; source: EffectorNode; target: EffectorNode }) => MyEdge,
	idTemplate: (sourceId: string, targetId: string, suffix: string) => string,
	isReversed = false, // Flag to reverse the direction (used for ownership edges)
): MyEdge[] {
	const edges: MyEdge[] = [];
	const targetNodeCount: Record<string, number> = {}; // Map to track duplicates

	for (const targetId of targetNodeIds) {
		// Track duplicate occurrences of targetId
		if (!targetNodeCount[targetId]) {
			targetNodeCount[targetId] = 1;
		} else {
			targetNodeCount[targetId]++;
		}

		// Generate suffix for duplicates
		const suffix = targetNodeCount[targetId] > 1 ? `[d${targetNodeCount[targetId] - 1}]` : '';
		const uniqueId = idTemplate(node.id, targetId, suffix); // Create a unique ID

		const targetNode = findNodeById(targetId, nodes);
		if (targetNode) {
			// Handle reversed direction for edges if needed
			const sourceNode = isReversed ? targetNode : node;
			const targetNodeForEdge = isReversed ? node : targetNode;
			// Create and store the edge
			edges.push(createEdge({ id: uniqueId, source: sourceNode, target: targetNodeForEdge }));
		}
	}

	return edges;
}

export function generateEdges(nodes: EffectorNode[]): MyEdge[] {
	const edges: MyEdge[] = [];

	for (const node of nodes) {
		// Generate LinkEdges (from getLinkedNodes)
		const linkedNodeIds = getLinkedNodes(node);
		const linkEdges = createEdgesWithTracking(
			node,
			linkedNodeIds,
			nodes,
			createLinkEdge,
			(sourceId, targetId, suffix) => `${sourceId} --={ ${targetId}${suffix}`, // ID format for LinkEdges
			false, // Normal direction for LinkEdges
		);
		edges.push(...linkEdges);

		// Generate OwnershipEdges (from getOwnersNodes)
		const ownerNodeIds = getOwnersNodes(node);
		const ownershipEdges = createEdgesWithTracking(
			node,
			ownerNodeIds,
			nodes,
			createSourceEdge,
			(targetId, sourceId, suffix) => `${sourceId} owns ${targetId}${suffix}`, // ID format for OwnershipEdges
			true, // Reversed direction for OwnershipEdges
		);
		edges.push(...ownershipEdges);

		// Generate ReactiveEdges (from getNextNodes)
		const nextNodeIds = getNextNodes(node);
		const reactiveEdges = createEdgesWithTracking(
			node,
			nextNodeIds,
			nodes,
			createReactiveEdge,
			(sourceId, targetId, suffix) => `${sourceId} --> ${targetId}${suffix}`, // ID format for ReactiveEdges
			false, // Normal direction for ReactiveEdges
		);
		edges.push(...reactiveEdges);
	}

	return edges;
}

function getNodeOp(node: EffectorNode): OpType {
	return node.data.effector?.meta.op;
}

export function cleanupEdges(edges: MyEdge[], nodes: EffectorNode[]): MyEdge[] {
	const edgeMap = new Map<string, MyEdge>(); // Map to store edges by a unique key (source-target)

	// Step 1: Create a map of edges to check for reverse edges (B -> A)
	edges.forEach((edge) => {
		const edgeKey = `${edge.source}-${edge.target}`;
		edgeMap.set(edgeKey, edge);
	});

	// Step 2: Detect cycles and remove incoming edges for nodes with OpTypeWithCycles
	const filteredEdges: MyEdge[] = [];

	edges.forEach((edge) => {
		const { source, target } = edge;
		const reverseEdgeKey = `${target}-${source}`;
		const reverseEdgeExists = edgeMap.has(reverseEdgeKey);

		if (reverseEdgeExists) {
			// We have a cycle (A -> B and B -> A)
			const targetNode = nodes.find((n) => n.id === target);

			if (targetNode) {
				const targetNodeOp = getNodeOp(targetNode);

				// If the target node's operation type is in OpTypeWithCycles, remove the incoming edge
				// @ts-ignore
				if (Object.values(OpTypeWithCycles).includes(targetNodeOp)) {
					// Skip adding this edge (effectively removing it)
					return;
				}
			}
		}

		// Add edge if not removed
		filteredEdges.push(edge);
	});

	return filteredEdges;
}
