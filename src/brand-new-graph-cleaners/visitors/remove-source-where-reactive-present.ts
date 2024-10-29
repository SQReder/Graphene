import { isReactiveEdge, isSourceEdge } from '../../lib';
import type { NamedGraphVisitor } from '../types';
import { getKey } from './get-key';

export const removeSourceWhereReactivePresent: NamedGraphVisitor = {
	name: 'Remove source where reactive present',
	visit: async (graph) => {
		const reactiveLinks = graph.edges.filter(isReactiveEdge);
		const sourceLinks = graph.edges.filter(isSourceEdge);

		const reactiveKeys = new Set(reactiveLinks.map(getKey));

		for (const sourceLink of sourceLinks) {
			if (
				sourceLink.data.relatedNodes.source.data.effector?.meta?.isDomain &&
				sourceLink.data.relatedNodes.target.data.effector?.meta?.isDomain
			) {
				continue;
			}

			const key = getKey(sourceLink);
			if (reactiveKeys.has(key)) {
				graph.removeEdgeById(sourceLink.id);
			}
		}
	},
};
