import { createSourceEdge } from '../../edge-factories';
import { isRegularNode, isSourceEdge } from '../../lib';
import type { NamedGraphVisitor } from '../types';

export const rebindAttachedEffectSource: NamedGraphVisitor = {
	name: 'Rebind attached effect source',
	visit: async (graph) => {
		const attachedEffects = graph.nodes
			.filter(isRegularNode)
			.filter((node) => node.data.effector.meta.asEffect?.attached);

		for (const attachedEffect of attachedEffects) {
			const sourceEdges = graph.listEdgesFrom(attachedEffect.id, isSourceEdge);

			if (sourceEdges.length === 1) {
				const sourceEdge = sourceEdges[0]!;

				graph.removeEdgeById(sourceEdge.id);
				graph.addEdge(
					createSourceEdge({
						id: `${sourceEdge.id} rebound to attached effect ${attachedEffect.id}`,
						source: sourceEdge.data.relatedNodes.target,
						target: attachedEffect,
					}),
				);
			} else {
				console.warn('Unexpected number of source edges', sourceEdges);
			}
		}
	},
};
