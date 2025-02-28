import { isRegularNode } from '../../lib';
import type { NamedGraphVisitor } from '../types';

export const dropUselessWatch: NamedGraphVisitor = {
	name: 'Drop useless watch',
	visit: async (graph) => {
		graph.nodes
			.filter(isRegularNode)
			.filter((node) => node.data.effector.meta.op === 'watch')
			.forEach((node) => {
				graph.removeNode(node.id);
			});
	},
};
