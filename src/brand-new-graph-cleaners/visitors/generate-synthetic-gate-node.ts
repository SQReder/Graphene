import { createLinkEdge, createReactiveEdge } from '../../edge-factories';
import { ensureDefined, isGateNode, isReactiveEdge, isRegularNode } from '../../lib';
import { type GateNode, type RegularEffectorNode, SyntheticNodeTypes } from '../../types';
import type { NamedGraphVisitor } from '../types';
import { foldByShape } from './fold-by-shape';

export const generateSyntheticGateNode: NamedGraphVisitor = {
	name: 'Generate synthetic Gate node',
	visit: async (graph) => {
		const storesNamedWithDotState = graph.nodes
			.filter(isRegularNode)
			.filter((node) => node.data.effector.meta.asStore?.name?.endsWith('.state'));

		for (const stateStore of storesNamedWithDotState) {
			let statusStore: RegularEffectorNode | undefined = undefined;
			let openEvent: RegularEffectorNode | undefined = undefined;
			let closeEvent: RegularEffectorNode | undefined = undefined;
			let setEvent: RegularEffectorNode | undefined = undefined;

			const asStore = ensureDefined(stateStore.data.effector.meta.asStore);
			const supposedGateName = asStore.name.replace('.state', '');

			for (const incomingEdges of graph.listEdgesTo(stateStore.id, isReactiveEdge)) {
				const source = incomingEdges.data.relatedNodes.source;
				if (!isRegularNode(source)) continue;

				const asEvent = source.data.effector?.meta?.asEvent;
				if (!asEvent) continue;

				if (asEvent.name === supposedGateName + '.open') {
					openEvent = source;
				} else if (asEvent.name === supposedGateName + '.close') {
					closeEvent = source;
				} else if (asEvent.name === supposedGateName + '.set') {
					setEvent = source;
				}
			}

			if (!openEvent || !closeEvent || !setEvent) continue;

			for (const openEventTargets of graph.listEdgesFrom(openEvent.id, isReactiveEdge)) {
				const target = openEventTargets.data.relatedNodes.target;
				if (!isRegularNode(target)) continue;
				const asStore = target.data.effector?.meta?.asStore;
				if (!asStore) continue;

				if (asStore.name === supposedGateName + '.status') {
					statusStore = target;
				}
			}

			if (statusStore && openEvent && closeEvent && setEvent) {
				const id = 'syntetic-gate-' + stateStore.id;
				const relatedNodes = [stateStore, statusStore, openEvent, closeEvent, setEvent];
				const gateNode = {
					id: id,
					position: stateStore.position,
					data: {
						id,
						nodeType: SyntheticNodeTypes.Gate,
						relatedNodes: relatedNodes,
						label: `🚪 ${supposedGateName}`,
						gateName: supposedGateName,
					},
				} satisfies GateNode;
				graph.addNode(gateNode);

				for (const relatedNode of relatedNodes) {
					graph.addEdge(
						createLinkEdge({
							id: relatedNode.id + ' syntetic gate link',
							source: gateNode,
							target: relatedNode,
						}),
					);
				}
			}
		}
	},
};

export const foldGate = foldByShape('Fold Gate', (node) => node.data.nodeType === SyntheticNodeTypes.Gate, {
	factories_: {
		outboundReactive: ({ id, edge, root }) =>
			createReactiveEdge({
				id,
				source: root,
				target: edge.data.relatedNodes.target,
				extras: (rxEdge) => {
					const source = edge.data.relatedNodes.source as RegularEffectorNode;
					const meta = source.data.effector.meta;
					if (!isGateNode(root)) {
						console.warn('Expected Gate node', root);
						return;
					}
					rxEdge.label = (meta.name ?? '???').replace(root.data.gateName + '.', '');
				},
			}),
	},
});
