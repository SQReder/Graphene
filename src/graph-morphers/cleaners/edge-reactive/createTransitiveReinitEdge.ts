import { createReactiveEdge } from '../../../edge-factories';
import type { ReactiveEdge } from '../../../types';
import type { EdgeCreator } from '../types';

export const createTransitiveReinitEdge: EdgeCreator<ReactiveEdge> = (inbound, outbound, node) => {
	const id = `${inbound.source} --> ${outbound.target} [collapse of ${node.id}]`;
	return createReactiveEdge({
		id: id,
		source: inbound.data.relatedNodes.source,
		target: outbound.data.relatedNodes.target,
		extras: (edge) => {
			edge.label = 'reinit';
			edge.data.relatedNodes.collapsed = [node];
		},
	});
};
