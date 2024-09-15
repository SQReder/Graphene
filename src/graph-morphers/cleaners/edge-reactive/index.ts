import { isReactiveEdge, isRegularNode } from '../../../lib';
import { EffectorNode, LinkEdge, OpType, OwnershipEdge, ReactiveEdge, UnknownEdge } from '../../../types';
import {
	cleanEdges,
	createReinitCleaner,
	createStoreUpdatesWithNoChildrenCleaner,
	dropEdgesOfNode,
	makeTransitiveNodeReplacer,
} from '../lib';
import { GraphCleaner } from '../types';
import { createTransitiveReactiveEdge } from './createTransitiveReactiveEdge';
import { createTransitiveReinitEdge } from './createTransitiveReinitEdge';
import { ReactiveEdgeCleaner } from './types';

const makeTransitiveNodeReplacerForOpType = (opType: OpType | undefined, filter?: (node: EffectorNode) => boolean) =>
	makeTransitiveNodeReplacer(opType, 'reactive', createTransitiveReactiveEdge, filter);

type Params =
	| [opType: OpType, filter?: (node: EffectorNode) => boolean]
	| [opType: undefined, filter: (node: EffectorNode) => boolean];

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
const transitiveNodeReplacers: ReactiveEdgeCleaner[] = params.map(([opType, filter]) =>
	makeTransitiveNodeReplacerForOpType(opType, filter),
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
		dropEdgesOfNode(OpType.Watch, 'incoming', 'reactive'),
	];

	const cleanedReactiveEdges = cleanEdges(cleaners, graph, reactive);

	return {
		nodes: graph.nodes,
		edges: [...cleanedReactiveEdges, ...other],
	};
};
