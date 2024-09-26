import { isRegularNode } from '../../lib';
import type { EffectorGraph, EffectorNode } from '../../types';
import type { NamedGraphCleaner } from './types';

export const dropDomains: NamedGraphCleaner = {
	name: 'Drop Domains',
	apply: (graph) => {
		const domainIds = new Set<string>();

		graph.nodes.forEach((node) => {
			if (isRegularNode(node)) {
				if (node.data.effector.meta.isDomain) {
					domainIds.add(node.id);
				}
			}
		});

		console.log('domains', domainIds);

		// Enumerate domains from bottom to top
		const orderedDomains = enumerateDomainsBFS(graph);

		// Create a set of edges to remove
		const edgesToRemove = new Set<string>();

		// Iterate through ordered domains
		orderedDomains.forEach((domain) => {
			const domainNode = graph.nodes.find((node) => node.id === domain.id);
			if (domainNode && isRegularNode(domainNode)) {
				// Find child nodes (onStore, onEvent, onEffect, onDomain) using edges
				const childNodeIds = new Set(
					graph.edges.filter((edge) => edge.source === domain.id).map((edge) => edge.target),
				);

				// Remove edges related to child nodes
				graph.edges.forEach((edge) => {
					if (childNodeIds.has(edge.source) || childNodeIds.has(edge.target)) {
						edgesToRemove.add(edge.id);
					}
				});

				// Remove edges related to the domain node itself
				graph.edges.forEach((edge) => {
					if (edge.source === domain.id || edge.target === domain.id) {
						edgesToRemove.add(edge.id);
					}
				});
			}
		});

		return {
			nodes: graph.nodes,
			edges: graph.edges.filter((edge) => !edgesToRemove.has(edge.id) && !domainIds.has(edge.source)),
		};
	},
};

// Function to enumerate domains from bottom to top using BFS
function enumerateDomainsBFS(graph: EffectorGraph): EffectorNode[] {
	const { nodes, edges } = graph;

	// Step 1: Filter only the domain nodes
	const domainNodes = nodes.filter((node) => isRegularNode(node) && node.data.effector.meta.isDomain);
	const domains = new Set(domainNodes.map((node) => node.id));

	// Step 2: Build adjacency list and in-degree map
	const adjacencyList: Map<string, string[]> = new Map(); // key: source, value: list of targets
	const inDegree: Map<string, number> = new Map(); // key: node, value: in-degree count

	for (const edge of edges) {
		const { source, target } = edge;

		// Only consider edges between domain nodes
		if (!domains.has(source) || !domains.has(target)) continue;

		// Build adjacency list
		if (!adjacencyList.has(source)) adjacencyList.set(source, []);
		adjacencyList.get(source)!.push(target);

		// Track in-degree of target node
		inDegree.set(target, (inDegree.get(target) || 0) + 1);
		if (!inDegree.has(source)) inDegree.set(source, 0); // Ensure source is initialized
	}

	// Step 3: Collect nodes with in-degree 0 (leaf nodes)
	const queue: string[] = [];
	for (const [node, degree] of inDegree.entries()) {
		if (degree === 0 && domains.has(node)) {
			queue.push(node); // Add leaf nodes to the queue
		}
	}

	// Step 4: Perform BFS traversal
	const result: string[] = [];
	while (queue.length > 0) {
		const node = queue.shift()!;
		result.push(node); // Process node (add to result)

		// Traverse children of the current node
		if (adjacencyList.has(node)) {
			for (const target of adjacencyList.get(node)!) {
				inDegree.set(target, inDegree.get(target)! - 1);
				// If target has no more incoming edges, add it to the queue
				if (inDegree.get(target) === 0) {
					queue.push(target);
				}
			}
		}
	}

	// Step 5: Reverse the result to get bottom-to-top order and map to nodes
	return result.reverse().map((id) => domainNodes.find((node) => node.id === id)!);
}
