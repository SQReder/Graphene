import { isReactiveEdge, isRegularNode } from '../../lib';
import type { NamedGraphVisitor } from '../types';

export const dropUselessUpdates: NamedGraphVisitor = {
	name: 'Drop useless updates',
	visit: async (graph) => {
		graph.nodes
			.filter(isRegularNode)
			.filter((node) => node.data.effector.meta.asEvent?.name === 'updates')
			.filter((updates) => {
				const reactiveEdges = graph.listEdgesFrom(updates.id, isReactiveEdge);
				console.log(`Node ${updates.id} is an update node, but has reactive edges`, reactiveEdges);

				return reactiveEdges.length === 0;
			})
			.forEach((node) => {
				graph.removeNode(node.id);
			});
	},
};
