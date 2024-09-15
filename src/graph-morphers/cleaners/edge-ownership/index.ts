import { isOwnershipEdge, isRegularNode } from '../../../lib';
import { EffectorNode, LinkEdge, OpType, OwnershipEdge, ReactiveEdge, UnknownEdge } from '../../../types';
import {
	cleanEdges,
	createReinitCleaner,
	createStoreUpdatesWithNoChildrenCleaner,
	dropEdgesOfNode,
	makeTransitiveNodeReplacer,
} from '../lib';
import { GraphCleaner } from '../types';
import { createTransitiveOwnershipEdge } from './create-transitive-ownership-edge';
import { createTransitiveReinitEdge } from './create-transitive-reinit-edge';
import { dimFactories, dropFactories } from './drop-factories';
import { makeReverseOwnershipCleaner } from './make-reverse-ownership-cleaner';
import { OwnershipEdgeCleaner } from './types';

const makeTransitiveNodeReplacerForOpType = (opType: OpType | undefined, filter?: (node: EffectorNode) => boolean) =>
	makeTransitiveNodeReplacer(opType, 'ownership', createTransitiveOwnershipEdge, filter);

type Params =
	| [opTyp: OpType, filter?: (node: EffectorNode) => boolean]
	| [opTyp: undefined, filter: (node: EffectorNode) => boolean];

const params: readonly Params[] = [
	[OpType.On, undefined],
	[OpType.Map, undefined],
	[OpType.FilterMap, undefined],
	[
		undefined,
		(node) =>
			isRegularNode(node) && node.data.effector.meta.op === undefined && node.data.effector.meta.type === 'factory',
	],
];
const transitiveNodeReplacers: OwnershipEdgeCleaner[] = params.map(([opType, filter]) =>
	makeTransitiveNodeReplacerForOpType(opType, filter),
);

const reverseOwnershipCleaners: OwnershipEdgeCleaner[] = [
	OpType.On,
	OpType.Map,
	OpType.FilterMap,
	OpType.Sample,
	OpType.Combine,
	OpType.Merge,
	undefined,
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
		...reverseOwnershipCleaners,
		...transitiveNodeReplacers,
		createReinitCleaner('ownership', createTransitiveReinitEdge),
		createStoreUpdatesWithNoChildrenCleaner('ownership'),
		dimFactories,
		// dropFactories,
		dropEdgesOfNode(OpType.Watch, 'incoming', 'ownership'),
	];

	const cleanedOwnershipEdges = cleanEdges(cleaners, graph, ownership);
	return {
		nodes: graph.nodes,
		edges: [...cleanedOwnershipEdges, ...other],
	};
};
