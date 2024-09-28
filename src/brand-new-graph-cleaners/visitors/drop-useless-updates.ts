import { isReactiveEdge, isRegularNode } from '../../lib';
import type { NamedGraphVisitor } from '../types';

export const dropUselessUpdates: NamedGraphVisitor = {
	name: 'Drop useless updates',
	visit: (graph) => {
		graph.nodes
			.filter(isRegularNode)
			.filter((node) => node.data.effector.meta.asEvent?.name === 'updates')
			.filter((reinit) => graph.listEdgesFrom(reinit.id, isReactiveEdge).length === 0)
			.forEach((node) => {
				graph.removeNode(node.id);
			});
	},
};
