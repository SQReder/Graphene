import { isReactiveEdge, isSourceEdge } from '../../lib';
import { pipe } from '../../tiny-fp/pipe';
import { createStoreUpdatesWithNoChildrenCleaner, edgeCleanerToGraphCleaner } from './lib';
import type { NamedGraphCleaner } from './types';

export const storeUpdatesWithNoChildren: NamedGraphCleaner = {
	name: 'Store updates with no children',
	apply: (graph) => {
		const reactiveCleaner = edgeCleanerToGraphCleaner({
			edgeFilter: isReactiveEdge,
			cleaner: createStoreUpdatesWithNoChildrenCleaner('reactive'),
		});
		const ownershipCleaner = edgeCleanerToGraphCleaner({
			edgeFilter: isSourceEdge,
			cleaner: createStoreUpdatesWithNoChildrenCleaner('source'),
		});

		return pipe(graph, reactiveCleaner, ownershipCleaner);
	},
};
