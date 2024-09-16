import { createOwnershipEdge } from '../../../edge-factories';
import type { EffectorNode, OpType, OwnershipEdge } from '../../../types';

export const createTransitiveOwnershipEdge = (
	owner: OwnershipEdge,
	child: OwnershipEdge,
	node: EffectorNode,
	transitiveOpType: OpType | undefined,
) => {
	return createOwnershipEdge({
		id: `${owner.source} owns ${child.target}`,
		source: owner.data.relatedNodes.source,
		target: child.data.relatedNodes.target,
		extras: (edge) => {
			edge.label = `.${transitiveOpType}`;
			edge.data.relatedNodes.collapsed = [node];
		},
	});
};
