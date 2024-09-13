import { isReactiveEdge } from '../../../lib';
import { LinkEdge, OpType, OwnershipEdge, ReactiveEdge, UnknownEdge } from '../../../types';
import {
	cleanEdges,
	createReinitCleaner,
	createStoreUpdatesWithNoChildrenCleaner,
	makeTransitiveNodeReplacer,
} from '../lib';
import { GraphCleaner } from '../types';
import { createTransitiveReactiveEdge } from './createTransitiveReactiveEdge';
import { createTransitiveReinitEdge } from './createTransitiveReinitEdge';
import { ReactiveEdgeCleaner } from './types';

const makeTransitiveNodeReplacerForOpType = (opType: OpType) =>
	makeTransitiveNodeReplacer(opType, 'reactive', createTransitiveReactiveEdge);

const transitiveNodeReplacers: ReactiveEdgeCleaner[] = [OpType.On, OpType.Map, OpType.FilterMap].map(
	makeTransitiveNodeReplacerForOpType,
);

export const cleanReactiveEdges: GraphCleaner = (graph) => {
	const reactive: ReactiveEdge[] = [];
	const other: (OwnershipEdge | LinkEdge | UnknownEdge)[] = [];

	for (const edge of graph.edges) {
		if (isReactiveEdge(edge)) {
			reactive.push(edge);
		} else {
			other.push(edge);
		}
	}

	const cleaners: ReactiveEdgeCleaner[] = [
		...transitiveNodeReplacers,
		createReinitCleaner('reactive', createTransitiveReinitEdge),
		createStoreUpdatesWithNoChildrenCleaner('reactive'),
	];

	const cleanedReactiveEdges = cleanEdges(cleaners, graph, reactive);

	return {
		nodes: graph.nodes,
		edges: [...cleanedReactiveEdges, ...other],
	};
};
