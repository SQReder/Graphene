import { createReactiveEdge } from '../../edge-factories';
import { isReactiveEdge, isRegularNode } from '../../lib';
import { OpType } from '../../types';
import type { NamedGraphVisitor } from '../types';

export const foldMergeNode: NamedGraphVisitor = {
	name: 'Merge Node',
	visit: async (graph) => {
		for (const mergeNode of graph.nodesByOp(OpType.Merge)) {
			const outgoing = graph.listEdgesFrom(mergeNode.id, isReactiveEdge);

			const targetNode = outgoing[0]?.data.relatedNodes.target;

			if (!targetNode) {
				console.warn('Merge node has no target', mergeNode);
				continue;
			}

			if (!isRegularNode(targetNode)) {
				console.warn('Merge node target is not a regular node', targetNode);
				continue;
			}

			targetNode.data.effector.isMergeEvent = true;

			const incomingLinks = graph.listEdgesTo(mergeNode.id, isReactiveEdge);

			graph.removeNode(mergeNode.id);
			for (const incomingLink of incomingLinks) {
				graph.addEdge(
					createReactiveEdge({
						id: incomingLink.id + ' merged to ' + mergeNode.id + ' ' + targetNode.id,
						source: incomingLink.data.relatedNodes.source,
						target: targetNode,
						extras: (edge) => {
							edge.data.relatedNodes = {
								collapsed: [mergeNode],
								source: edge.data.relatedNodes.source,
								target: edge.data.relatedNodes.target,
							};
							edge.label = incomingLink.label;
							edge.style = incomingLink.style;
						},
					}),
				);
			}
		}
	},
};
