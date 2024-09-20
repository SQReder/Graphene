import type { NamedGraphCleaner } from './types';

export const removeUnlinkedNodes: NamedGraphCleaner = {
	name: 'Remove unlinked nodes',
	apply: (graph) => {
		const usedNodeIds = new Set(graph.edges.flatMap((edge) => [edge.source, edge.target]));

		const factoriesUsedAsParent = new Set(graph.nodes.map((n) => n.parentId).filter((id) => id != null));

		graph.nodes = graph.nodes.filter((node) => usedNodeIds.has(node.id) || factoriesUsedAsParent.has(node.id));

		return graph;
	},
};
