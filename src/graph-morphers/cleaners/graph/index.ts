import { createReactiveEdge } from '../../../edge-factories';
import { isRegularNode, isUnitMeta, shallowCopyGraph } from '../../../lib';
import type { EffectorNode, RegularEffectorNode } from '../../../types';
import { OpType } from '../../../types';
import type { GraphCleaner, NamedGraphCleaner } from '../types';
import type { RootSelector } from './foldByShape';
import { foldByShape } from './foldByShape';
import { removeUnlinkedNodes } from './removeUnlinkedNodes';

const patronumSelector: RootSelector = (node) =>
	isRegularNode(node) &&
	node.data.effector.meta.op === undefined &&
	node.data.effector.meta.type === 'factory' &&
	['debounce', 'readonly'].includes(node.data.effector.meta.method);

export const graphCleaners: readonly NamedGraphCleaner[] = [
	{
		name: 'Fold Patronum operators',
		apply: foldByShape(patronumSelector, {}),
	},
	{
		name: 'Fold Domain',
		apply: foldByShape((node) => isRegularNode(node) && node.data.effector.meta.op === OpType.Domain, {}, [
			'onEvent',
			'onStore',
			'onEffect',
			'onDomain',
		]),
	},
	{
		name: 'Fold Effect',
		apply: foldByShape((node) => isRegularNode(node) && node.data.effector.meta.op === OpType.Effect, {
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
					},
				}),
		}),
	},
	{
		name: 'Remove Unlinked Nodes',
		apply: removeUnlinkedNodes,
		priority: 9999,
	},
];

export const createGraphCleaner =
	(cleaners: readonly NamedGraphCleaner[]): GraphCleaner =>
	(graph) => {
		return cleaners.reduce((graph, namedCleaner) => namedCleaner.apply(graph), shallowCopyGraph(graph));
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
