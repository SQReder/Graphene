import { findNodesByOpTypeWithRelatedEdges, isSourceEdge } from '../../lib';
import { OpTypeWithCycles, type SourceEdge } from '../../types';
import { edgeCleanerToGraphCleaner } from './lib';
import type { NamedGraphCleaner } from './types';

const makeReverseOwnershipCleaner = (opType: OpTypeWithCycles): NamedGraphCleaner => ({
	name: `Reverse ownership cleaner for [${opType}]`,
	apply: edgeCleanerToGraphCleaner({
		edgeFilter: isSourceEdge,
		cleaner: (_, lookups) => {
			const edgesToRemove: SourceEdge[] = [];

			findNodesByOpTypeWithRelatedEdges(opType, {
				edgesBySource: lookups.edgesBySource.source,
				edgesByTarget: lookups.edgesByTarget.source,
				nodes: lookups.nodes,
			}).forEach(({ outgoing }) => {
				for (const outgoingEdge of outgoing) {
					const edgesFromTarget = lookups.edgesBySource.source.get(outgoingEdge.target);
					const looped = edgesFromTarget?.filter((edgeFromTarget) => edgeFromTarget.target === outgoingEdge.source);

					if (looped?.length) {
						if (looped.length > 1) console.error('more than one looped edges', looped);
						else {
							edgesToRemove.push(looped[0]!);
						}
					}
				}
			});

			return { edgesToRemove };
		},
	}),
});

export const reverseOwnershipCleaners: NamedGraphCleaner[] = [
	OpTypeWithCycles.On,
	OpTypeWithCycles.Map,
	OpTypeWithCycles.FilterMap,
	OpTypeWithCycles.Sample,
	OpTypeWithCycles.Combine,
	OpTypeWithCycles.Merge,
	OpTypeWithCycles.Empty,
].map(makeReverseOwnershipCleaner);
