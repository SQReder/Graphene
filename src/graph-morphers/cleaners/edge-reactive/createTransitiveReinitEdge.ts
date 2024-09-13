import { MarkerType } from '@xyflow/system';
import { EdgeType, ReactiveEdge } from '../../../types';
import { EdgeCreator } from '../types';

export const createTransitiveReinitEdge: EdgeCreator<ReactiveEdge> = (inbound, outbound, node) => ({
	id: `${inbound.source} owns ${outbound.target} [collapse of ${node.id}]`,
	source: inbound.source,
	target: outbound.target,
	markerEnd: {
		type: MarkerType.ArrowClosed,
	},
	style: {
		zIndex: 10,
	},
	label: 'reinit',
	animated: true,
	data: {
		edgeType: EdgeType.Reactive,
		relatedNodes: {
			source: inbound.data.relatedNodes.source,
			target: outbound.data.relatedNodes.target,
			collapsed: [node],
		},
	},
});
