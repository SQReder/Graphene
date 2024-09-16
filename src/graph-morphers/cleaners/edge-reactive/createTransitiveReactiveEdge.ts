import { createReactiveEdge } from '../../../edge-factories';
import type { ReactiveEdge } from '../../../types';
import type { EdgeCreator } from '../types';

export const createTransitiveReactiveEdge: EdgeCreator<ReactiveEdge> = (inbound, outbound, node, transitiveOpType) => {
	const name = transitiveOpType ? transitiveOpType.toLowerCase() : '???';
	const id = `${inbound.source} => ${outbound.id}.${name}`;

	return createReactiveEdge({
		id,
		source: inbound.data.relatedNodes.source,
		target: outbound.data.relatedNodes.target,
		extras: (edge) => {
			edge.label = `.${name}`;
			edge.data.relatedNodes.collapsed = [node];
		},
	});
};
