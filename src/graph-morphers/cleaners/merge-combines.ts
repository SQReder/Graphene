import { findNodesByOpTypeWithRelatedTypedEdges, getEdgesBy } from '../../lib';
import {
	CombinatorType,
	type CombinedNode,
	type EffectorGraph,
	type EffectorNode,
	type MyEdge,
	OpType,
} from '../../types';
import type { NamedGraphCleaner } from './types';

export const mergeCombines: NamedGraphCleaner = {
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
				// @ts-expect-error bad types
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
