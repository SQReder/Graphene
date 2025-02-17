import { createReactiveEdge } from '../../edge-factories';
import { ensureDefined } from '../../ensureDefined';
import { isReactiveEdge, isRegularNode } from '../../lib';
import { OpType } from '../../OpType';
import { type EffectorNode, NodeFamily } from '../../types';
import type { NamedGraphVisitor } from '../types';

function makeTransitiveNodeReplacer(
	opType: OpType,
	filter?: (node: EffectorNode) => boolean,
	nameGenerator?: (node: EffectorNode) => string,
): NamedGraphVisitor {
	return {
		name: `Transitive node replacer for [${opType}]`,
		visit: async (graph) => {
			for (const node of graph.nodesByOp(opType).filter((node) => (filter ? filter(node) : true))) {
				await console.groupCollapsed(`transitive node ${node.id}`);

				const incomingReactive = graph.listEdgesTo(node.id, isReactiveEdge);
				const outgoingReactive = graph.listEdgesFrom(node.id, isReactiveEdge);

				await console.log('incoming reactive edges', incomingReactive);
				await console.log('outgoing reactive edges', outgoingReactive);

				if (!incomingReactive.length || !outgoingReactive.length) {
					await console.warn('No reactive edges');
					await console.groupEnd();
					continue;
				}

				if (incomingReactive.length > 1 || outgoingReactive.length > 1) {
					await console.warn('Too many reactive edges', { incomingReactive, outgoingReactive });
					await console.groupEnd();
					continue;
				}

				const incomingSource = ensureDefined(incomingReactive[0]).data.relatedNodes.source;
				const outgoingTarget = ensureDefined(outgoingReactive[0]).data.relatedNodes.target;

				await console.log('incoming source', incomingSource);
				await console.log('outgoing target', outgoingTarget);

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

				await console.groupEnd();
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
	[OpType.Filter, undefined, undefined],
	[OpType.Prepend, undefined, undefined],
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
	[OpType.Combine, undefined, (node) => node.data.effector?.graphite.scope?.key ?? 'combined??'],
];

export const transitiveNodeReplacers: NamedGraphVisitor[] = ops.map(
	([opType, filter, nameGenerator]): NamedGraphVisitor => makeTransitiveNodeReplacer(opType, filter, nameGenerator),
);
