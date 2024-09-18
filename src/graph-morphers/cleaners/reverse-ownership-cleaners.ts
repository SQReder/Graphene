import { findNodesByOpTypeWithRelatedEdges, isOwnershipEdge } from '../../lib';
import type { OwnershipEdge } from '../../types';
import { OpType } from '../../types';
import { edgeCleanerToGraphCleaner } from './lib';
import type { NamedGraphCleaner } from './types';

const makeReverseOwnershipCleaner = (opType: OpType | undefined): NamedGraphCleaner => ({
	name: `Reverse ownership cleaner for [${opType}]`,
	apply: edgeCleanerToGraphCleaner({
		edgeFilter: isOwnershipEdge,
		cleaner: (_, lookups) => {
			const edgesToRemove: OwnershipEdge[] = [];

			findNodesByOpTypeWithRelatedEdges(opType, {
				bySource: lookups.edgesBySource.ownership,
				byTarget: lookups.edgesByTarget.ownership,
				nodes: lookups.nodes,
			}).forEach(({ outgoing }) => {
				for (const outgoingEdge of outgoing) {
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
		},
	}),
});

export const reverseOwnershipCleaners: NamedGraphCleaner[] = [
	OpType.On,
	OpType.Map,
	OpType.FilterMap,
	OpType.Sample,
	OpType.Combine,
	OpType.Merge,
	undefined, // ToDo add filter?
].map(makeReverseOwnershipCleaner);
