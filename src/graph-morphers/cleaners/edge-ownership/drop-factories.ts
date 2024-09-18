import { createOwnershipEdge } from '../../../edge-factories';
import { findNodesByOpTypeWithRelatedEdges, isOwnershipEdge } from '../../../lib';
import type { OwnershipEdgeCleaner } from './types';

export const dropFactories: OwnershipEdgeCleaner = (_, lookups) => {
	const factories = findNodesByOpTypeWithRelatedEdges(
		undefined,
		{
			bySource: lookups.edgesBySource.ownership,
			byTarget: lookups.edgesByTarget.ownership,
			nodes: lookups.nodes,
		},
		(node) => node.data.effector.meta.isFactory,
	);

	return {
		edgesToRemove: factories.flatMap(({ outgoing }) => outgoing).filter(isOwnershipEdge),
	};
};

export const dimFactories: OwnershipEdgeCleaner = (_, lookups) => {
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
};
