import { createReactiveEdge } from '../../edge-factories';
import { ensureDefined, isReactiveEdge, isRegularNode } from '../../lib';
import { type EffectorNode, NodeFamily, OpType } from '../../types';
import type { NamedGraphVisitor } from '../types';

function makeTransitiveNodeReplacer(
	opType: OpType,
	filter?: (node: EffectorNode) => boolean,
	nameGenerator?: (node: EffectorNode) => string,
): NamedGraphVisitor {
	return {
		name: `Transitive node replacer for [${opType}]`,
		visit: (graph) => {
			for (const node of graph.nodesByOp(opType).filter((node) => (filter ? filter(node) : true))) {
				console.groupCollapsed(`transitive node ${node.id}`);

				const incomingReactive = graph.listEdgesTo(node.id, isReactiveEdge);
				const outgoingReactive = graph.listEdgesFrom(node.id, isReactiveEdge);

				console.log('incoming reactive edges', incomingReactive);
				console.log('outgoing reactive edges', outgoingReactive);

				if (!incomingReactive.length || !outgoingReactive.length) {
					console.warn('No reactive edges');
					continue;
				}

				if (incomingReactive.length > 1 || outgoingReactive.length > 1) {
					console.warn('Too many reactive edges', { incomingReactive, outgoingReactive });
					continue;
				}

				const incomingSource = ensureDefined(incomingReactive[0]).data.relatedNodes.source;
				const outgoingTarget = ensureDefined(outgoingReactive[0]).data.relatedNodes.target;

				console.log('incoming source', incomingSource);
				console.log('outgoing target', outgoingTarget);

				graph.removeNode(node.id);
				graph.addEdge(
					createReactiveEdge({
						id: `${incomingSource.id} => ${outgoingTarget.id} [.${opType}]`,
						source: incomingSource,
						target: outgoingTarget,
						extras: (edge) => {
							edge.data.relatedNodes = {
								source: incomingSource,
								target: outgoingTarget,
								collapsed: [node],
							};
							edge.label = nameGenerator?.(node) ?? `.${opType}`;
						},
					}),
				);

				console.groupEnd();
			}
		},
	};
}
const ops: Array<
	[OpType, ((node: EffectorNode) => boolean) | undefined, ((node: EffectorNode) => string) | undefined]
> = [
	[OpType.On, undefined, undefined],
	[OpType.Map, undefined, undefined],
	[OpType.FilterMap, undefined, undefined],
	[
		undefined,
		(node) => {
			if (!isRegularNode(node)) return false;
			const effector = node.data.effector;
			if (effector.meta.op != null) return false;
			if (effector.graphite.family.type !== NodeFamily.Crosslink) return false;

			return true;
		},
		undefined,
	],
	[OpType.Combine, undefined, (node) => node.data.effector?.graphite.scope.key ?? 'combined??'],
];

export const transitiveNodeReplacers: NamedGraphVisitor[] = ops.map(
	([opType, filter, nameGenerator]): NamedGraphVisitor => makeTransitiveNodeReplacer(opType, filter, nameGenerator),
);
