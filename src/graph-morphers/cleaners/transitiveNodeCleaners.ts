import { createOwnershipEdge, createReactiveEdge } from '../../edge-factories';
import { type GraphTypedEdgesSelector, isOwnershipEdge, isReactiveEdge } from '../../lib';
import { pipe } from '../../tiny-fp/pipe';
import { type EffectorNode, type MyEdge, OpType, type OwnershipEdge } from '../../types';
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
				edge.label = `.${transitiveOpType}`;
				edge.data.relatedNodes.collapsed = [node];
			},
		});
	},
	isOwnershipEdge,
);

const makeTransitiveNodeReactiveReplacerForOpType = makeTransitiveNodeReplacerFactory(
	'reactive',
	(inbound, outbound, node, transitiveOpType) => {
		const name = transitiveOpType ? transitiveOpType.toLowerCase() : '???';
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

export const transitiveNodeCleaners: NamedGraphCleaner[] = [OpType.On, OpType.Map, OpType.FilterMap].map(
	(op): NamedGraphCleaner => ({
		name: `Transitive node replacer for [${op}]`,
		apply: (graph) => {
			const ownershipReplacer = makeTransitiveNodeOwnershipReplacerForOpType(op);
			const reactiveReplacer = makeTransitiveNodeReactiveReplacerForOpType(op);

			return pipe(graph, ownershipReplacer, reactiveReplacer);
		},
	}),
);
