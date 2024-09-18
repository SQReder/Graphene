import { createOwnershipEdge, createReactiveEdge } from '../../edge-factories';
import { isOwnershipEdge, isReactiveEdge } from '../../lib';
import { pipe } from '../../tiny-fp/pipe';
import type { OwnershipEdge } from '../../types';
import { createReinitCleaner, edgeCleanerToGraphCleaner } from './lib';
import type { NamedGraphCleaner } from './types';

const reinitOwnership = edgeCleanerToGraphCleaner({
	edgeFilter: isOwnershipEdge,
	cleaner: createReinitCleaner(
		'ownership',
		(inbound, outbound, node): OwnershipEdge =>
			createOwnershipEdge({
				id: `${inbound.source} owns ${outbound.target} [collapse of ${node.id}]`,
				source: inbound.data.relatedNodes.source,
				target: outbound.data.relatedNodes.target,
				extras: (edge) => {
					edge.label = 'reinit';
					edge.data.relatedNodes.collapsed = [node];
				},
			}),
	),
});

const reinitReactive = edgeCleanerToGraphCleaner({
	edgeFilter: isReactiveEdge,
	cleaner: createReinitCleaner('reactive', (inbound, outbound, node) => {
		const id = `${inbound.source} --> ${outbound.target} [collapse of ${node.id}]`;
		return createReactiveEdge({
			id: id,
			source: inbound.data.relatedNodes.source,
			target: outbound.data.relatedNodes.target,
			extras: (edge) => {
				edge.label = 'reinit';
				edge.data.relatedNodes.collapsed = [node];
			},
		});
	}),
});

export const reinit: NamedGraphCleaner = {
	name: 'Reinit',
	apply: (graph) => pipe(graph, reinitOwnership, reinitReactive),
};
