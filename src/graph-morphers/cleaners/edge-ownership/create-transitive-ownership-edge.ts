import { MarkerType } from '@xyflow/system';
import { EdgeType, EffectorNode, OpType, OwnershipEdge } from '../../../types';

export const createTransitiveOwnershipEdge = (
	owner: OwnershipEdge,
	child: OwnershipEdge,
	node: EffectorNode,
	transitiveOpType: OpType,
) => ({
	id: `${owner.source} owns ${child.target}`,
	source: owner.source,
	target: child.target,
	markerEnd: {
		type: MarkerType.ArrowClosed,
	},
	style: {
		stroke: 'rgba(132,215,253,0.7)',
	},
	data: {
		edgeType: EdgeType.Ownership,
		relatedNodes: {
			source: owner.data.relatedNodes.source,
			target: child.data.relatedNodes.target,
			collapsed: [node],
		},
	},
	label: `.${transitiveOpType}`,
});
