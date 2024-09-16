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
		(node) => node.data.effector.meta.op === undefined && node.data.effector.meta.type === 'factory',
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
		(node) => node.data.effector.meta.op === undefined && node.data.effector.meta.type === 'factory',
	);

	const outgoing = factories.flatMap(({ outgoing }) => outgoing).filter(isOwnershipEdge);
	return {
		edgesToRemove: outgoing,
		edgesToAdd: outgoing.map((edge) => ({
			...edge,
			style: {
				stroke: 'rgba(132,215,253,0.1)',
			},
		})),
	};
};
