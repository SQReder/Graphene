import { isOwnershipEdge, isRegularNode } from '../../../lib';
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
import { createTransitiveOwnershipEdge } from './create-transitive-ownership-edge';
import { createTransitiveReinitEdge } from './create-transitive-reinit-edge';
import { dimFactories } from './drop-factories';
import { makeReverseOwnershipCleaner } from './make-reverse-ownership-cleaner';
import type { NamedOwnershipEdgeCleaner } from './types';

const makeTransitiveNodeReplacerForOpType = (opType: OpType | undefined, filter?: (node: EffectorNode) => boolean) =>
	makeTransitiveNodeReplacer(opType, 'ownership', createTransitiveOwnershipEdge, filter);

type Params =
	| [name: string, opTyp: OpType, filter?: (node: EffectorNode) => boolean]
	| [name: string, opTyp: undefined, filter: (node: EffectorNode) => boolean];

const params: readonly Params[] = [
	[OpType.On, OpType.On, undefined],
	[OpType.Map, OpType.Map, undefined],
	[OpType.FilterMap, OpType.FilterMap, undefined],
	[
		'factory',
		undefined,
		(node) =>
			isRegularNode(node) && node.data.effector.meta.op === undefined && node.data.effector.meta.type === 'factory',
	],
];
const transitiveNodeReplacers: NamedOwnershipEdgeCleaner[] = params.map(
	([name, opType, filter]): NamedOwnershipEdgeCleaner => ({
		name: `Transitive node cleaner for [${name}]`,
		apply: makeTransitiveNodeReplacerForOpType(opType, filter),
	}),
);

const reverseOwnershipCleaners: NamedOwnershipEdgeCleaner[] = [
	OpType.On,
	OpType.Map,
	OpType.FilterMap,
	OpType.Sample,
	OpType.Combine,
	OpType.Merge,
	undefined,
].map((op) => ({
	name: `Reverse ownership cleaner for [${op}]`,
	apply: makeReverseOwnershipCleaner(op),
}));

export const ownershipEdgeCleaners: NamedOwnershipEdgeCleaner[] = [
	...reverseOwnershipCleaners,
	...transitiveNodeReplacers,
	{
		name: 'Reinit',
		apply: createReinitCleaner('ownership', createTransitiveReinitEdge),
	},
	{
		name: 'Store updates with no children',
		apply: createStoreUpdatesWithNoChildrenCleaner('ownership'),
	},
	{
		name: 'Dim factories',
		apply: dimFactories,
	},
	// dropFactories,
	{
		name: 'Drop incoming ownership edges of Watch nodes',
		apply: dropEdgesOfNode(OpType.Watch, 'incoming', 'ownership'),
	},
];

export const cleanOwnershipEdges =
	(cleaners: readonly NamedOwnershipEdgeCleaner[]): GraphCleaner =>
	(graph) => {
		const ownership: OwnershipEdge[] = [];
		const other: Array<ReactiveEdge | LinkEdge | UnknownEdge> = [];

		for (const edge of graph.edges) {
			if (isOwnershipEdge(edge)) {
				ownership.push(edge);
			} else {
				other.push(edge);
			}
		}

		const cleanedOwnershipEdges = cleanEdges(cleaners, graph, ownership);
		return {
			nodes: graph.nodes,
			edges: [...cleanedOwnershipEdges, ...other],
		};
	};
