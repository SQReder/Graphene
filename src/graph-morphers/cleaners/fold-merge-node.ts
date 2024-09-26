import { createOwnershipEdge, createReactiveEdge, type EdgeFactory } from '../../edge-factories';
import { findNodesByOpTypeWithRelatedTypedEdges, type LookupsTyped, type NodeWithRelatedTypedEdges } from '../../lib';
import type { MyEdge } from '../../types';
import { OpType } from '../../types';
import { makeGraphLookups } from './lib';
import type { NamedGraphCleaner } from './types';

function processEdges<T extends MyEdge>(
	{ node: mergeNode, incoming, outgoing }: NodeWithRelatedTypedEdges<T>,
	lookups: LookupsTyped<T>,
	createEdge: EdgeFactory<T>,
	idSeparator: ' --> ' | ' owns ',
) {
	const edgesToRemove: T[] = [];
	const edgesToAdd: T[] = [];

	if (outgoing.length !== 1) {
		console.warn('Merge node has multiple outgoing edges', mergeNode);
		return;
	}

	const outgoingEdge = outgoing[0];

	if (!outgoingEdge) {
		console.warn('Merge node has no outgoing edge', mergeNode);
		return;
	}

	for (const edge of incoming) {
		edgesToAdd.push(
			createEdge({
				id: [edge.source, mergeNode.id, outgoingEdge.source].join(idSeparator),
				source: edge.data.relatedNodes.source,
				target: outgoingEdge.data.relatedNodes.target,
				extras: (edge) => {
					edge.data.relatedNodes = {
						collapsed: [mergeNode, outgoingEdge.data.relatedNodes.source],
						source: edge.data.relatedNodes.source,
						target: outgoingEdge.data.relatedNodes.target,
					};
				},
			}),
		);

		edgesToRemove.push(edge);
	}

	edgesToRemove.push(outgoingEdge);

	return {
		edgesToRemove,
		edgesToAdd,
	};
}

export const foldMergeNode: NamedGraphCleaner = {
	name: 'Merge Node',
	apply: (graph) => {
		const lookups = makeGraphLookups(graph);
		const nodesAndStuff = findNodesByOpTypeWithRelatedTypedEdges(OpType.Merge, lookups);

		const edgesToRemove: MyEdge[] = [];
		const edgesToAdd: MyEdge[] = [];

		for (const stuff of nodesAndStuff) {
			const { node: mergeNode, incoming, outgoing } = stuff;

			const reactiveEdgeChanges = processEdges(
				{ node: mergeNode, incoming: incoming.reactive, outgoing: outgoing.reactive },
				{
					nodes: lookups.nodes,
					edgesBySource: lookups.edgesBySource.reactive,
					edgesByTarget: lookups.edgesByTarget.reactive,
				},
				createReactiveEdge,
				' --> ',
			);

			const ownershipEdgeChanges = processEdges(
				{ node: mergeNode, incoming: incoming.ownership, outgoing: outgoing.ownership },
				{
					nodes: lookups.nodes,
					edgesBySource: lookups.edgesBySource.ownership,
					edgesByTarget: lookups.edgesByTarget.ownership,
				},
				createOwnershipEdge,
				' owns ',
			);

			edgesToRemove.push(...(reactiveEdgeChanges?.edgesToRemove ?? []), ...(ownershipEdgeChanges?.edgesToRemove ?? []));
			edgesToAdd.push(...(reactiveEdgeChanges?.edgesToAdd ?? []), ...(ownershipEdgeChanges?.edgesToAdd ?? []));
		}

		return {
			nodes: graph.nodes,
			edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd),
		};
	},
};
