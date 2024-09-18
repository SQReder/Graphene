import { isReactiveEdge, isRegularNode } from '../../../lib';
import type { EffectorNode, LinkEdge, OwnershipEdge, ReactiveEdge, UnknownEdge } from '../../../types';
import { OpType } from '../../../types';
import {
	cleanEdges,
	createReinitCleaner,
	createStoreUpdatesWithNoChildrenCleaner,
	dropEdgesOfNode,
	makeTransitiveNodeReplacer,
} from '../lib';
import type { GraphCleaner } from '../types';
import { createTransitiveReactiveEdge } from './createTransitiveReactiveEdge';
import { createTransitiveReinitEdge } from './createTransitiveReinitEdge';
import { type NamedReactiveEdgeCleaner } from './types';

const makeTransitiveNodeReplacerForOpType = (opType: OpType | undefined, filter?: (node: EffectorNode) => boolean) =>
	makeTransitiveNodeReplacer(opType, 'reactive', createTransitiveReactiveEdge, filter);

type Params =
	| [name: string, opType: OpType, filter?: (node: EffectorNode) => boolean]
	| [name: string, opType: undefined, filter: (node: EffectorNode) => boolean];

const params: readonly Params[] = [
	[OpType.On, OpType.On, undefined],
	[OpType.Map, OpType.Map, undefined],
	[OpType.FilterMap, OpType.FilterMap, undefined],
	['Factory', undefined, (node) => isRegularNode(node) && node.data.effector.meta.isFactory],
];

const transitiveNodeReplacers = params.map(
	([name, opType, filter]): NamedReactiveEdgeCleaner => ({
		name: `Transitive node replacer for [${name}]`,
		apply: makeTransitiveNodeReplacerForOpType(opType, filter),
	}),
);

export const reactiveEdgeCleaners: NamedReactiveEdgeCleaner[] = [
	...transitiveNodeReplacers,
	{ name: `Reinit`, apply: createReinitCleaner('reactive', createTransitiveReinitEdge) },
	{ name: `Store updates with no children`, apply: createStoreUpdatesWithNoChildrenCleaner('reactive') },
	{
		name: `Drop incoming reactive edges of Watch nodes`,
		apply: dropEdgesOfNode(OpType.Watch, 'incoming', 'reactive'),
	},
];

export const cleanReactiveEdges =
	(cleaners: readonly NamedReactiveEdgeCleaner[]): GraphCleaner =>
	(graph) => {
		const reactive: ReactiveEdge[] = [];
		const other: Array<OwnershipEdge | LinkEdge | UnknownEdge> = [];

		for (const edge of graph.edges) {
			if (isReactiveEdge(edge)) {
				reactive.push(edge);
			} else {
				other.push(edge);
			}
		}

		const cleanedReactiveEdges = cleanEdges(cleaners, graph, reactive);

		return {
			nodes: graph.nodes,
			edges: [...cleanedReactiveEdges, ...other],
		};
	};
