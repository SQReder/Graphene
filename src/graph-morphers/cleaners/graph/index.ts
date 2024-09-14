import { createOwnershipEdge, createReactiveEdge } from '../../../edge-factories';
import { isRegularNode, isUnitMeta, shallowCopyGraph } from '../../../lib';
import { EffectorGraph, EffectorNode, OpType, RegularEffectorNode } from '../../../types';
import { GraphCleaner } from '../types';
import { foldByShape, RootSelector } from './foldByShape';
import { removeUnlinkedNodes } from './removeUnlinkedNodes';

/*
(node) => {
			if (!isRegularNode(node)) return false;

			const isKnownFactory =
				node.data.effector.meta.op === undefined &&
				node.data.effector.meta.type === 'factory' &&
				['debounce', 'readonly'].includes(node.data.effector.meta.method);

			if (isKnownFactory) return true;

			const isEffect = node.data.effector.meta.op === OpType.Effect;

			if (isEffect) return true;

			return false;
		}
*/

const patronumSelector: RootSelector = (node) =>
	isRegularNode(node) &&
	node.data.effector.meta.op === undefined &&
	node.data.effector.meta.type === 'factory' &&
	['debounce', 'readonly'].includes(node.data.effector.meta.method);

export const cleanGraph: GraphCleaner = (graph: EffectorGraph) => {
	return [
		foldByShape(patronumSelector, {
			inboundOwnership: ({ id, edge, root }) =>
				createOwnershipEdge({ id, source: edge.data.relatedNodes.source, target: root }),
			inboundReactive: ({ id, edge, root }) =>
				createReactiveEdge({ id, source: edge.data.relatedNodes.source, target: root }),
			outboundOwnership: ({ id, edge, root }) =>
				createOwnershipEdge({ id, source: root, target: edge.data.relatedNodes.target }),
			outboundReactive: ({ id, edge, root }) =>
				createReactiveEdge({ id, source: root, target: edge.data.relatedNodes.target }),
		}),
		foldByShape((node) => isRegularNode(node) && node.data.effector.meta.op === OpType.Effect, {
			inboundOwnership: ({ id, edge, root }) =>
				createOwnershipEdge({ id, source: edge.data.relatedNodes.source, target: root }),
			inboundReactive: ({ id, edge, root }) =>
				createReactiveEdge({ id, source: edge.data.relatedNodes.source, target: root }),
			outboundOwnership: ({ id, edge, root }) =>
				createOwnershipEdge({ id, source: root, target: edge.data.relatedNodes.target }),
			outboundReactive: ({ id, edge, root }) =>
				createReactiveEdge({
					id,
					source: root,
					target: edge.data.relatedNodes.target,
					extras: (rxEdge) => {
						const source = edge.data.relatedNodes.source as RegularEffectorNode;
						rxEdge.style!.stroke = getEffectEdgeColor(source);
						const meta = source.data.effector.meta;
						rxEdge.label = isUnitMeta(meta) ? (meta.op === OpType.Store ? '$' : '') + meta.name : '??';
						return rxEdge;
					},
				}),
		}),

		removeUnlinkedNodes,
	].reduce((graph, cleaner) => cleaner(graph), shallowCopyGraph(graph));
};

const getEffectEdgeColor = (node: EffectorNode): string | undefined => {
	if (!isRegularNode(node)) return;

	const meta = node.data.effector.meta;

	if (meta.op === OpType.Event) {
		const name = meta.name;
		if (name.startsWith('done')) return 'green';
		if (name.startsWith('fail')) return 'red';
	}
};
