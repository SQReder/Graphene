import { isParentToChildEdge, isSourceEdge } from '../../lib';
import type { NamedGraphVisitor } from '../types';
import { getKey } from './get-key';

export const detachFactories: NamedGraphVisitor = {
	name: 'Detach factories at source layer',
	visit: async (graph) => {
		const factoryNodes = graph.nodes.filter((node) => node.data.effector?.meta.isFactory);
		for (const factoryNode of factoryNodes) {
			const childLinks = graph.listEdgesFrom(factoryNode.id, isParentToChildEdge);
			const sourceLinks = graph.listEdgesFrom(factoryNode.id, isSourceEdge);

			const childrenKeys = new Set(childLinks.map(getKey));

			for (const sourceLink of sourceLinks) {
				const key = getKey(sourceLink);
				if (childrenKeys.has(key)) {
					graph.removeEdgeById(sourceLink.id);
				}
			}
		}
	},
};
