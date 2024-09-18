import { createOwnershipEdge } from '../../../edge-factories';
import type { OwnershipEdge } from '../../../types';
import type { EdgeCreator } from '../types';

export const createTransitiveReinitEdge: EdgeCreator<OwnershipEdge> = (inbound, outbound, node): OwnershipEdge =>
	createOwnershipEdge({
		id: `${inbound.source} owns ${outbound.target} [collapse of ${node.id}]`,
		source: inbound.data.relatedNodes.source,
		target: outbound.data.relatedNodes.target,
		extras: (edge) => {
			edge.data.relatedNodes.collapsed = [node];
		},
	});
