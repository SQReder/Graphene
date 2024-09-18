import { isOwnershipEdge, isReactiveEdge } from '../../lib';
import { pipe } from '../../tiny-fp/pipe';
import { OpType } from '../../types';
import { dropEdgesOfNode, edgeCleanerToGraphCleaner } from './lib';
import type { NamedGraphCleaner } from './types';

export const dropWatch: NamedGraphCleaner = {
	name: 'Drop incoming edges of Watch nodes',
	apply: (graph) => {
		const reactiveCleaner = edgeCleanerToGraphCleaner({
			edgeFilter: isReactiveEdge,
			cleaner: dropEdgesOfNode(OpType.Watch, 'incoming', 'reactive'),
		});
		const ownershipCleaner = edgeCleanerToGraphCleaner({
			edgeFilter: isOwnershipEdge,
			cleaner: dropEdgesOfNode(OpType.Watch, 'incoming', 'ownership'),
		});

		return pipe(graph, reactiveCleaner, ownershipCleaner);
	},
};
