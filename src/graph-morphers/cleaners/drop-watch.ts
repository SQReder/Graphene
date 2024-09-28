import { isReactiveEdge, isSourceEdge } from '../../lib';
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
			edgeFilter: isSourceEdge,
			cleaner: dropEdgesOfNode(OpType.Watch, 'incoming', 'source'),
		});

		return pipe(graph, reactiveCleaner, ownershipCleaner);
	},
};
