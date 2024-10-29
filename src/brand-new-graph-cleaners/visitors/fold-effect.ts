import { createReactiveEdge, createSourceEdge } from '../../edge-factories';
import { isRegularNode } from '../../lib';
import { EdgeType, type EffectorNode, type RegularEffectorNode } from '../../types';
import { foldByShape } from './fold-by-shape';

export const foldEffect = foldByShape(
	'Effect',
	(node) => !!node.data.effector?.meta.isEffect,

	{
		factories_: {
			outboundSource: ({ id, edge, root }) =>
				createSourceEdge({
					id,
					source: root,
					target: edge.data.relatedNodes.target,
					extras: (ownershipEdge) => {
						const source = edge.data.relatedNodes.source as RegularEffectorNode;
						ownershipEdge.style!.stroke = getEffectEdgeColor(source, EdgeType.Source);
						const meta = source.data.effector.meta;
						ownershipEdge.label = meta.name ?? '??';
					},
				}),
			outboundReactive: ({ id, edge, root }) =>
				createReactiveEdge({
					id,
					source: root,
					target: edge.data.relatedNodes.target,
					extras: (rxEdge) => {
						const source = edge.data.relatedNodes.source as RegularEffectorNode;
						rxEdge.style!.stroke = getEffectEdgeColor(source, EdgeType.Reactive);
						const meta = source.data.effector.meta;
						rxEdge.label = meta.name ?? '???';
					},
				}),
		},
		getInternalNodeNames: (node) => {
			if (!isRegularNode(node)) throw new Error('Node is not regular node');

			const newLocal = [
				'finally',
				'done',
				'fail',
				'doneData',
				'failData',
				`${node.data.effector.name}.inFlight`,
				'inFlight',
				'pending',
			];
			console.log(newLocal);

			return newLocal;
		},
	},
);

const getEffectEdgeColor = (node: EffectorNode, kind: EdgeType): string | undefined => {
	if (!isRegularNode(node)) return;

	const meta = node.data.effector.meta.asEvent;

	if (meta) {
		const name = meta.name;
		if (name.startsWith('done')) return kind === EdgeType.Source ? 'lightgreen' : 'green';
		if (name.startsWith('fail')) return kind === EdgeType.Source ? 'lightcoral' : 'red';
	}
};
