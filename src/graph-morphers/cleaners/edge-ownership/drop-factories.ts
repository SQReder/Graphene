import { findNodesByOpTypeWithRelatedEdges, isOwnershipEdge } from '../../../lib';
import { OwnershipEdgeCleaner } from './types';

export const dropFactories: OwnershipEdgeCleaner = (_, lookups) => {
	const factories = findNodesByOpTypeWithRelatedEdges(
		// @ts-expect-error tryng to force undefined lol
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
		// @ts-expect-error tryng to force undefined lol
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
		edgesToAdd: factories
			.flatMap(({ outgoing }) => outgoing)
			.filter(isOwnershipEdge)
			.map((edge) => ({
				...edge,
				style: {
					stroke: 'rgba(132,215,253,0.2)',
				},
			})),
	};
};
