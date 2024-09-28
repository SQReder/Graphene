import { isReactiveEdge, isRegularNode } from '../../lib';
import type { NamedGraphVisitor } from '../types';

export const dropUselessReinit: NamedGraphVisitor = {
	name: 'Drop useless reinit',
	visit: (graph) => {
		graph.nodes
			.filter(isRegularNode)
			.filter((node) => node.data.effector.meta.asEvent?.name === 'reinit')
			.filter((reinit) => graph.listEdgesTo(reinit.id, isReactiveEdge).length === 0)
			.forEach((node) => {
				graph.removeNode(node.id);
			});
	},
};
