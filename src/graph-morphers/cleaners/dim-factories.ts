import { createOwnershipEdge } from '../../edge-factories';
import { findNodesByOpTypeWithRelatedEdges, isOwnershipEdge } from '../../lib';
import { edgeCleanerToGraphCleaner } from './lib';
import type { NamedGraphCleaner } from './types';

export const dimFactories: NamedGraphCleaner = {
	name: 'Dim Factories',
	apply: edgeCleanerToGraphCleaner({
		edgeFilter: isOwnershipEdge,
		cleaner: (_, lookups) => {
			const factories = findNodesByOpTypeWithRelatedEdges(
				undefined,
				{
					bySource: lookups.edgesBySource.ownership,
					byTarget: lookups.edgesByTarget.ownership,
					nodes: lookups.nodes,
				},
				(node) => node.data.effector.meta.isFactory,
			);

			const outgoing = factories.flatMap(({ outgoing }) => outgoing).filter(isOwnershipEdge);
			return {
				edgesToRemove: outgoing,
				edgesToAdd: outgoing.map((edge) =>
					createOwnershipEdge({
						id: edge.id + ' (dimmed)',
						source: edge.data.relatedNodes.source,
						target: edge.data.relatedNodes.target,
						extras: (edge) => {
							edge.style = {
								...(edge.style ?? {}),
								stroke: 'rgba(132,215,253,0.25)',
							};
						},
					}),
				),
			};
		},
	}),
};
