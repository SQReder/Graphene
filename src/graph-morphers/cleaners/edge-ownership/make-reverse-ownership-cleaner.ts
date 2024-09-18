import { findNodesByOpTypeWithRelatedEdges } from '../../../lib';
import type { OpType, OwnershipEdge } from '../../../types';
import type { OwnershipEdgeCleaner } from './types';

export const makeReverseOwnershipCleaner = (opType: OpType | undefined): OwnershipEdgeCleaner => {
	return (_, lookups) => {
		const edgesToRemove: OwnershipEdge[] = [];

		findNodesByOpTypeWithRelatedEdges(opType, {
			bySource: lookups.edgesBySource.ownership,
			byTarget: lookups.edgesByTarget.ownership,
			nodes: lookups.nodes,
		}).forEach(({ outgoing, node }) => {
			console.log('node', node.data.label);
			for (const outgoingEdge of outgoing) {
				// look for edges that sourced from outgoingEdge.target and targeted into outgoingEdge.source

				// if (outgoingEdge.target === '665') debugger;

				const edgesFromTarget = lookups.edgesBySource.ownership.get(outgoingEdge.target);
				const looped = edgesFromTarget?.filter((edgeFromTarget) => edgeFromTarget.target === outgoingEdge.source);

				if (looped?.length) {
					if (looped.length > 1) console.error('more than one looped edges', looped);
					else {
						edgesToRemove.push(looped[0]);
					}
				}
			}
		});

		return { edgesToRemove };
	};
};
