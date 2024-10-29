import { is } from 'effector';
import { createReactiveEdge } from '../../edge-factories';
import { hasGraphite, isRegularNode } from '../../lib';
import type { NamedGraphVisitor } from '../types';

export const bindHandlersToAttachedFx: NamedGraphVisitor = {
	name: 'Attach handlers to derived fx',
	visit: async (graph) => {
		for (const attachedEffectNode of graph.nodes
			.filter(isRegularNode)
			.filter((node) => node.data.effector.meta.asEffect?.attached)) {
			const graphite = attachedEffectNode.data.effector.graphite;

			const handler = graphite.scope?.runner?.scope?.handler;
			if (is.effect(handler)) {
				if (!hasGraphite(handler)) {
					console.warn(`Handler ${handler} has no graphite`, handler);
					continue;
				}

				const handlerFxId = handler.graphite.id;
				const handlerNode = graph.getNode(handlerFxId);

				if (!handlerNode) {
					console.warn(`Handler ${handlerFxId} not found`, handler);
					continue;
				}

				graph.addEdge(
					createReactiveEdge({
						id: `${attachedEffectNode.id} -> handler ${handlerFxId}`,
						source: attachedEffectNode,
						target: handlerNode,
						extras: (edge) => {
							edge.label = 'handler';
							edge.data.synthetic = true;
						},
					}),
				);
			}
		}
	},
};
