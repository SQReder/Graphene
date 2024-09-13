import { GraphCleaner } from '../types';

export const removeUnlinkedNodes: GraphCleaner = (graph) => {
	const usedNodeIds = new Set(graph.edges.flatMap((edge) => [edge.source, edge.target]));

	graph.nodes = graph.nodes.filter((node) => usedNodeIds.has(node.id));

	return graph;
};
