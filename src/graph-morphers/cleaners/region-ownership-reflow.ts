import { createOwnershipEdge } from '../../edge-factories';
import { ensureDefined, isOwnershipEdge, isRegularNode } from '../../lib';
import type { OwnershipEdge } from '../../types';
import { edgeCleanerToGraphCleaner } from './lib';
import type { NamedGraphCleaner } from './types';

export const regionOwnershipReflow: NamedGraphCleaner = {
	name: 'Region Ownership Reflow',
	apply: edgeCleanerToGraphCleaner({
		edgeFilter: isOwnershipEdge,
		cleaner: (_, lookups) => {
			const edgesToRemove: OwnershipEdge[] = [];
			const edgesToAdd: OwnershipEdge[] = [];

			for (const regionNode of lookups.nodes.values()) {
				if (!isRegularNode(regionNode)) continue;
				if (regionNode.data.declaration?.type !== 'region') continue;

				const regionOwnershipEdges = lookups.edgesBySource.ownership.get(regionNode.id);

				const restricted = regionOwnershipEdges?.filter((edge) => {
					const edgesWithSameTarget = lookups.edgesByTarget.ownership.get(edge.target);
					console.log('edgesWithSameTarget', edge.target, edgesWithSameTarget);
					return edgesWithSameTarget && edgesWithSameTarget?.length > 1;
				});

				if (restricted) {
					edgesToRemove.push(...restricted);

					const factoryOwnerId = lookups.edgesByTarget.ownership
						.get(regionNode.id)
						?.find(
							(edge) =>
								isRegularNode(edge.data.relatedNodes.source) && edge.data.relatedNodes.source.data.effector.isFactory,
						)?.data.relatedNodes.source.id;
					if (factoryOwnerId) {
						const map = restricted.map((edge) => {
							const id = edge.id + ' reflowed from ' + regionNode.id + ' to ' + factoryOwnerId;
							console.log('id', id);
							return createOwnershipEdge({
								id: id,
								source: ensureDefined(lookups.nodes.get(factoryOwnerId)),
								target: edge.data.relatedNodes.target,
							});
						});
						const reflowed = map.filter((edge) => {
							const ownershipEdgedFromFactory = lookups.edgesBySource.ownership.get(factoryOwnerId);
							const ownershipEdgedFromFactoryToTarget = ownershipEdgedFromFactory?.find(
								(fromFactory) => fromFactory.target === edge.target,
							);
							console.log(
								`reflowed edge ${edge.id} from factory ${factoryOwnerId} to ${edge.target} is ${
									ownershipEdgedFromFactoryToTarget == null ? 'added' : 'not added'
								}`,
							);
							return ownershipEdgedFromFactoryToTarget == null;
						});
						edgesToAdd.push(...reflowed);
					}
				}
			}

			return { edgesToRemove, edgesToAdd };
		},
	}),
};
