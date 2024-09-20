import { createOwnershipEdge, createReactiveEdge } from '../../edge-factories';
import { type GraphTypedEdgesSelector, isOwnershipEdge, isReactiveEdge, isRegularNode } from '../../lib';
import { pipe } from '../../tiny-fp/pipe';
import { type EffectorNode, type MyEdge, NodeFamily, OpType, type OwnershipEdge } from '../../types';
import { edgeCleanerToGraphCleaner, makeTransitiveNodeReplacer } from './lib';
import type { EdgeCreator, GraphCleaner, NamedGraphCleaner } from './types';

const makeTransitiveNodeReplacerFactory =
	<T extends MyEdge>(
		selector: GraphTypedEdgesSelector<T>,
		edgeCreator: EdgeCreator<T>,
		edgeFilter: (edge: MyEdge) => edge is T,
	) =>
	(opType: OpType | undefined, filter?: (node: EffectorNode) => boolean): GraphCleaner =>
		edgeCleanerToGraphCleaner({
			edgeFilter,
			cleaner: makeTransitiveNodeReplacer(opType, selector, edgeCreator, filter),
		});

const makeTransitiveNodeOwnershipReplacerForOpType = makeTransitiveNodeReplacerFactory(
	'ownership',
	(owner: OwnershipEdge, child: OwnershipEdge, node: EffectorNode, transitiveOpType: OpType | undefined) => {
		return createOwnershipEdge({
			id: `${owner.source} owns ${child.target} [[${node.id}]]`,
			source: owner.data.relatedNodes.source,
			target: child.data.relatedNodes.target,
			extras: (edge) => {
				edge.label = transitiveOpType ? `.${transitiveOpType}` : '...';
				edge.data.relatedNodes.collapsed = [node];
			},
		});
	},
	isOwnershipEdge,
);

const makeTransitiveNodeReactiveReplacerForOpType = makeTransitiveNodeReplacerFactory(
	'reactive',
	(inbound, outbound, node, transitiveOpType) => {
		const name = transitiveOpType ? transitiveOpType.toLowerCase() : '..';
		const id = `${inbound.source} => ${outbound.id}.${name}`;

		return createReactiveEdge({
			id,
			source: inbound.data.relatedNodes.source,
			target: outbound.data.relatedNodes.target,
			extras: (edge) => {
				edge.label = `.${name}`;
				edge.data.relatedNodes.collapsed = [node];
			},
		});
	},
	isReactiveEdge,
);
const ops: Array<[OpType | undefined, filter?: (node: EffectorNode) => boolean]> = [
	[OpType.On],
	[OpType.Map],
	[OpType.FilterMap],
	[
		undefined,
		(node) => {
			if (!isRegularNode(node)) return false;
			const effector = node.data.effector;
			if (effector.meta.op != null) return false;
			if (effector.graphite.family.type !== NodeFamily.Crosslink) return false;

			return true;
		},
	],
];
export const transitiveNodeCleaners: NamedGraphCleaner[] = ops.map(
	([op, filter]): NamedGraphCleaner => ({
		name: `Transitive node replacer for [${op}]`,
		apply: (graph) => {
			const ownershipReplacer = makeTransitiveNodeOwnershipReplacerForOpType(op, filter);
			const reactiveReplacer = makeTransitiveNodeReactiveReplacerForOpType(op, filter);

			return pipe(graph, ownershipReplacer, reactiveReplacer);
		},
	}),
);
