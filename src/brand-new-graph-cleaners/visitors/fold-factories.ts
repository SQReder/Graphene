import { createReactiveEdge } from '../../edge-factories';
import { isParentToChildEdge, isRegularNode } from '../../lib';
import { type RegularEffectorNode } from '../../types';
import { foldByShape } from './fold-by-shape';

const nameSelector = (name: string) => (node) => {
	if (!isRegularNode(node)) return false;
	const factoryMeta = node.data.effector.meta.asFactory;
	if (!factoryMeta) return false;
	return factoryMeta.method === name;
};

export const foldReadonly = foldByShape('readonly', nameSelector('readonly'));
export const foldDebounce = foldByShape('debounce', nameSelector('debounce'));
export const foldReshape = foldByShape('reshape', nameSelector('reshape'));
export const foldSplitMap = foldByShape('splitMap', nameSelector('splitMap'));
export const foldSpread = foldByShape('spread', nameSelector('spread'));
export const foldCondition = foldByShape('condition', nameSelector('condition'));
export const foldCombineEvents = foldByShape('combineEvents', nameSelector('combineEvents'), {
	factories_: {},
	findIndirectInternalNodes: (root, internalNode, graph) => {
		if (internalNode.data.effector?.meta.isEvent) {
			const outgoingOwnerhips = graph.listEdgesFrom(internalNode.id, isParentToChildEdge);
			const nodes = outgoingOwnerhips.map((edge) => edge.data.relatedNodes.target).filter(isRegularNode);
			if (nodes.every((node) => node.data.effector?.meta.isSample)) {
				return nodes;
			}
			return [];
		} else {
			return [];
		}
	},
});
export const foldAbortable = foldByShape('abortable', nameSelector('abortable'));
export const foldLogEffectFail = foldByShape('logEffectFail', nameSelector('logEffectFail'));

export const foldCreateQuery = foldByShape('@farfetched/core/createQuery', nameSelector('createQuery'), {
	factories_: {
		outboundReactive: ({ id, edge, root }) =>
			createReactiveEdge({
				id,
				source: root,
				target: edge.data.relatedNodes.target,
				extras: (rxEdge) => {
					const source = edge.data.relatedNodes.source as RegularEffectorNode;
					const meta = source.data.effector.meta;
					rxEdge.label = meta.name ?? '???';
				},
			}),
	},
});
