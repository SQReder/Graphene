import { MarkerType } from '@xyflow/system';
import { OwnershipEdge } from '../../../types';
import { EdgeCreator } from '../types';

export const createTransitiveReinitEdge: EdgeCreator<OwnershipEdge> = (inbound, outbound, node): OwnershipEdge => ({
	id: `${inbound.source} owns ${outbound.target} [collapse of ${node.id}]`,
	source: inbound.source,
	target: outbound.target,
	markerEnd: {
		type: MarkerType.ArrowClosed,
	},
	style: {
		stroke: 'rgba(132,215,253,0.7)',
	},
	label: 'reinit',
	data: {
		edgeType: 'ownership',
		relatedNodes: {
			source: inbound.data.relatedNodes.source,
			target: outbound.data.relatedNodes.target,
			collapsed: [node],
		},
	},
});
