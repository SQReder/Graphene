import { isRegularNode } from '../../lib';
import type { NamedGraphCleaner } from './types';

export const removeUnlinkedNodes: NamedGraphCleaner = {
	name: 'Remove unlinked nodes',
	apply: (graph) => {
		const usedNodeIds = new Set(graph.edges.flatMap((edge) => [edge.source, edge.target]));

		const factoryNodeIds = new Set(
			graph.nodes.filter((node) => isRegularNode(node) && node.data.effector.isFactory).map((node) => node.id),
		);

		graph.nodes = graph.nodes.filter((node) => usedNodeIds.has(node.id) || factoryNodeIds.has(node.id));

		return graph;
	},
};
