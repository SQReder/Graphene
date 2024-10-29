import { isRegularNode } from '../../lib';
import type { NamedGraphVisitor } from '../types';

export const dropNodesWithNoLocation: NamedGraphVisitor = {
	name: 'Drop nodes with no location',
	visit: async (graph) => {
		graph.nodes
			.filter(isRegularNode)
			.filter((node) => !node.data.effector.meta.loc)
			.forEach((node) => {
				graph.removeNode(node.id);
			});
	},
};
