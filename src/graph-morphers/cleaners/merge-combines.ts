import { createReactiveEdge, createSourceEdge } from '../../edge-factories';
import { findNodesByOpTypeWithRelatedTypedEdges, getEdgesBy } from '../../lib';
import {
	CombinatorType,
	type CombinedNode,
	type EffectorGraph,
	type EffectorNode,
	type MyEdge,
	OpType,
} from '../../types';
import { makeGraphLookups } from './lib';
import type { NamedGraphCleaner } from './types';

export const mergeCombines: NamedGraphCleaner = {
	name: 'Merge combines',
	apply: (graph): EffectorGraph => {
		const lookups = makeGraphLookups(graph);

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

		for (const { node: combinedStoreNode, incoming } of nodesAndStuff) {
			console.log('process', combinedStoreNode, incoming);

			const sources = {
				ownership: incoming.source.map((edge) => edge.data.relatedNodes.source),
				reactive: incoming.reactive.map((edge) => edge.data.relatedNodes.source),
			};

			console.log('sources', sources);

			const combineNodes = [...new Set(sources.reactive)];

			edgesToRemove.push(
				...incoming.source.filter((edge) => combineNodes.includes(edge.data.relatedNodes.source)),
				...incoming.reactive,
			);

			const syntheticCombineNodeId = `⊕ [${[...new Set(sources.reactive)].map((node) => node.id).join(',')}]`;

			console.log('add node', syntheticCombineNodeId);

			const syntheticCombineNode = {
				id: syntheticCombineNodeId,
				data: {
					id: syntheticCombineNodeId,
					nodeType: CombinatorType.Combine,
					label: '...',
					relatedNodes: combineNodes,
				},
				type: 'combineNode',
				// @ts-expect-error bad types
				label: '...',

				position: { x: 0, y: 0 },
			} satisfies CombinedNode;

			nodesToAdd.push(syntheticCombineNode);

			edgesToAdd.push(
				createSourceEdge({
					id: `⊕ ${syntheticCombineNodeId} owns [${combinedStoreNode.id}]`,
					source: syntheticCombineNode,
					target: combinedStoreNode,
				}),
				createReactiveEdge({
					id: `⊕ ${syntheticCombineNodeId} --> [${combinedStoreNode.id}]`,
					source: syntheticCombineNode,
					target: combinedStoreNode,
				}),
			);

			combineNodes.forEach((combineNode) => {
				const ownershipEdges = lookups.edgesByTarget.source.get(combineNode.id) ?? [];

				const owners = ownershipEdges?.map((e) => e.data.relatedNodes.source);

				owners?.forEach((owner) => {
					edgesToAdd.push(
						createSourceEdge({
							id: `⊕ ${owner.id} owns ${combineNode.id}`,
							source: owner,
							target: syntheticCombineNode,
						}),
					);
				});

				const reactiveEdges = lookups.edgesByTarget.reactive.get(combineNode.id) ?? [];

				const reactiveSourceNodes = reactiveEdges?.map((e) => e.data.relatedNodes.source);

				reactiveSourceNodes?.forEach((reactiveSource) => {
					edgesToAdd.push(
						createReactiveEdge({
							id: `⊕ ${reactiveSource.id} --> ${combineNode.id}`,
							source: reactiveSource,
							target: syntheticCombineNode,
						}),
					);
				});

				edgesToRemove.push(...ownershipEdges, ...reactiveEdges);
			});
		}

		return {
			nodes: graph.nodes.filter((node) => !nodesToRemove.includes(node)).concat(...nodesToAdd),
			edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd),
		};
	},
};
