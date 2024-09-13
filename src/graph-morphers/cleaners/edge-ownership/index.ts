import { isOwnershipEdge } from '../../../lib';
import { LinkEdge, OpType, OwnershipEdge, ReactiveEdge, UnknownEdge } from '../../../types';
import {
	cleanEdges,
	createReinitCleaner,
	createStoreUpdatesWithNoChildrenCleaner,
	makeTransitiveNodeReplacer,
} from '../lib';
import { GraphCleaner } from '../types';
import { createTransitiveOwnershipEdge } from './create-transitive-ownership-edge';
import { createTransitiveReinitEdge } from './create-transitive-reinit-edge';
import { dropFactories, makeReverseOwnershipCleaner } from './make-reverse-ownership-cleaner';
import { OwnershipEdgeCleaner } from './types';

const makeTransitiveNodeReplacerForOpType = (opType: OpType) =>
	makeTransitiveNodeReplacer(opType, 'ownership', createTransitiveOwnershipEdge);

const transitiveNodesCleaners: OwnershipEdgeCleaner[] = [OpType.On, OpType.Map, OpType.FilterMap].map(
	makeTransitiveNodeReplacerForOpType,
);

const reverseOwnershipCleaners: OwnershipEdgeCleaner[] = [
	OpType.On,
	OpType.Map,
	OpType.FilterMap,
	OpType.Sample,
	OpType.Combine,
	undefined,
	// @ts-expect-error tryng to force undefined lol
].map(makeReverseOwnershipCleaner);

export const cleanOwnershipEdges: GraphCleaner = (graph) => {
	const ownership: OwnershipEdge[] = [];
	const other: (ReactiveEdge | LinkEdge | UnknownEdge)[] = [];

	for (const edge of graph.edges) {
		if (isOwnershipEdge(edge)) {
			ownership.push(edge);
		} else {
			other.push(edge);
		}
	}

	const cleaners: OwnershipEdgeCleaner[] = [
		dropFactories,
		...reverseOwnershipCleaners,
		...transitiveNodesCleaners,
		createReinitCleaner('ownership', createTransitiveReinitEdge),
		createStoreUpdatesWithNoChildrenCleaner('ownership'),
	];

	const cleanedOwnershipEdges = cleanEdges(cleaners, graph, ownership);
	return {
		nodes: graph.nodes,
		edges: [...cleanedOwnershipEdges, ...other],
	};
};
