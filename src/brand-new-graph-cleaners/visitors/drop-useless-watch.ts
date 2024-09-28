import { isRegularNode } from '../../lib';
import type { NamedGraphVisitor } from '../types';

export const dropUselessWatch: NamedGraphVisitor = {
	name: 'Drop useless watch',
	visit: (graph) => {
		graph.nodes
			.filter(isRegularNode)
			.filter((node) => node.data.effector.meta.op === 'watch')
			.forEach((node) => {
				console.log('Removing useless watch', node.id);
				const edgesTo = Array.from(graph.listEdgesTo(node.id));
				console.log('edges to', edgesTo);
				graph.removeNode(node.id);
			});
	},
};
