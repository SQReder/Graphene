import { findNodesByOpTypeWithRelatedEdges, isOwnershipEdge } from '../../lib';
import { edgeCleanerToGraphCleaner } from './lib';
import type { NamedGraphCleaner } from './types';

export const dropFactories: NamedGraphCleaner = {
	name: 'Drop Factories',
	apply: edgeCleanerToGraphCleaner({
		edgeFilter: isOwnershipEdge,
		cleaner: (_, lookups) => {
			const factories = findNodesByOpTypeWithRelatedEdges(
				undefined,
				{
					edgesBySource: lookups.edgesBySource.ownership,
					edgesByTarget: lookups.edgesByTarget.ownership,
					nodes: lookups.nodes,
				},
				(node) => node.data.effector.meta.isFactory && !node.data.folded,
			);

			return {
				edgesToRemove: factories.flatMap(({ outgoing }) => outgoing).filter(isOwnershipEdge),
			};
		},
	}),
};
