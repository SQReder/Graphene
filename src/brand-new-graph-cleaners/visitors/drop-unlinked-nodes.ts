import type { NamedGraphVisitor } from '../types';

export const dropUnlinkedNodes: NamedGraphVisitor = {
	name: 'Drop unlinked nodes',
	visit: async (graph) => {
		graph.nodes
			.filter(
				(node) =>
					Array.from(graph.listEdgesTo(node.id)).length === 0 && Array.from(graph.listEdgesFrom(node.id)).length === 0,
			)
			.forEach((node) => graph.removeNode(node.id));
	},
};
