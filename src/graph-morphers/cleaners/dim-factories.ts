import { createSourceEdge } from '../../edge-factories';
import { findNodesByOpTypeWithRelatedEdges, isSourceEdge } from '../../lib';
import { edgeCleanerToGraphCleaner } from './lib';
import type { NamedGraphCleaner } from './types';

export const dimFactories: NamedGraphCleaner = {
	name: 'Dim Factories',
	apply: edgeCleanerToGraphCleaner({
		edgeFilter: isSourceEdge,
		cleaner: (_, lookups) => {
			const factories = findNodesByOpTypeWithRelatedEdges(
				undefined,
				{
					edgesBySource: lookups.edgesBySource.source,
					edgesByTarget: lookups.edgesByTarget.source,
					nodes: lookups.nodes,
				},
				(node) => node.data.effector.meta.isFactory,
			);

			const outgoing = factories.flatMap(({ outgoing }) => outgoing).filter(isSourceEdge);
			return {
				edgesToRemove: outgoing,
				edgesToAdd: outgoing.map((edge) =>
					createSourceEdge({
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
