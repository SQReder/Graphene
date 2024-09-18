import { createOwnershipEdge, createReactiveEdge } from '../../../edge-factories';
import { findNodesByOpTypeWithRelatedTypedEdges, getEdgesBy, isRegularNode, shallowCopyGraph } from '../../../lib';
import {
	CombinatorType,
	type CombinedNode,
	EdgeType,
	type EffectorGraph,
	type EffectorNode,
	type MyEdge,
	OpType,
	type RegularEffectorNode,
} from '../../../types';
import type { GraphCleaner, NamedGraphCleaner } from '../types';
import type { RootSelector } from './foldByShape';
import { foldByShape } from './foldByShape';
import { removeUnlinkedNodes } from './removeUnlinkedNodes';

const patronumSelector: RootSelector = (node) => {
	if (!isRegularNode(node)) return false;
	const factoryMeta = node.data.effector.meta.asFactory;

	if (!factoryMeta) return false;
	return ['debounce', 'readonly', 'combineEvents'].includes(factoryMeta.method);
};

const mergeCombines: NamedGraphCleaner = {
	name: 'Merge combines',
	apply: (graph): EffectorGraph => {
		const nodesAndStuff = findNodesByOpTypeWithRelatedTypedEdges(
			OpType.Store,
			{
				edgesBySource: getEdgesBy(graph.edges, 'source'),
				edgesByTarget: getEdgesBy(graph.edges, 'target'),
				nodes: new Map(graph.nodes.map((node) => [node.id, node])),
			},
			(node) => node.data.effector.isCombinedStore,
		);

		console.log('nodesAndStuff', nodesAndStuff);

		const edgesToAdd: MyEdge[] = [];
		const edgesToRemove: MyEdge[] = [];

		const nodesToAdd: EffectorNode[] = [];
		const nodesToRemove: EffectorNode[] = [];

		for (const { node, incoming } of nodesAndStuff) {
			console.log('process', node, incoming);

			const sources = {
				ownership: incoming.ownership.map((edge) => edge.data.relatedNodes.source),
				reactive: incoming.reactive.map((edge) => edge.data.relatedNodes.source),
			};

			console.log('sources', sources);

			const sourcedNodes = [...new Set([...sources.ownership, ...sources.reactive])];

			const id = `⊕ [${[...sourcedNodes].map((node) => node.id).join(',')}]`;

			console.log('add node', id);

			nodesToAdd.push({
				id: id,
				data: {
					nodeType: CombinatorType.Combine,
					label: '...',
					relatedNodes: sourcedNodes,
				},
				label: '...',

				position: { x: 0, y: 0 },
			} satisfies CombinedNode);
		}

		return {
			nodes: graph.nodes.filter((node) => !nodesToRemove.includes(node)).concat(...nodesToAdd),
			edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd),
		};
	},
};

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
			outboundOwnership: ({ id, edge, root }) =>
				createOwnershipEdge({
					id,
					source: root,
					target: edge.data.relatedNodes.target,
					extras: (ownershipEdge) => {
						const source = edge.data.relatedNodes.source as RegularEffectorNode;
						ownershipEdge.style!.stroke = getEffectEdgeColor(source, EdgeType.Ownership);
						const meta = source.data.effector.meta;
						ownershipEdge.label = (meta.isStore ? '$' : '') + (meta.name ?? '??');
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
						rxEdge.label = (meta.isStore ? '$' : '') + (meta.name ?? '???');
					},
				}),
		}),
	},
	mergeCombines,
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

const getEffectEdgeColor = (node: EffectorNode, kind: EdgeType): string | undefined => {
	if (!isRegularNode(node)) return;

	const meta = node.data.effector.meta.asEvent;

	if (meta) {
		const name = meta.name;
		if (name.startsWith('done')) return kind === 'ownership' ? 'lightgreen' : 'green';
		if (name.startsWith('fail')) return kind === 'ownership' ? 'lightcoral' : 'red';
	}
};
