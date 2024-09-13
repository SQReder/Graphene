import { MarkerType } from '@xyflow/system';
import { EdgeType, ReactiveEdge } from '../../../types';
import { EdgeCreator } from '../types';

export const createTransitiveReactiveEdge: EdgeCreator<ReactiveEdge> = (inbound, outbound, node, transitiveOpType) => {
	const name = transitiveOpType ? transitiveOpType.toLowerCase() : '???';
	return {
		id: `${inbound.source} => ${outbound.id}.${name}`,
		source: inbound.source,
		target: outbound.target,
		label: `.${name}`,
		markerEnd: {
			type: MarkerType.ArrowClosed,
		},
		animated: true,
		data: {
			edgeType: EdgeType.Reactive,
			relatedNodes: {
				source: inbound.data.relatedNodes.source,
				target: outbound.data.relatedNodes.target,
				collapsed: [node],
			},
		},
	} satisfies ReactiveEdge;
};
