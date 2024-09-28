import { createReactiveEdge, createSourceEdge, type EdgeFactory } from '../../edge-factories';
import { findNodesByOpTypeWithRelatedTypedEdges, isRegularNode, type NodeWithRelatedTypedEdges } from '../../lib';
import type { MyEdge } from '../../types';
import { OpType } from '../../types';
import { makeGraphLookups } from './lib';
import type { NamedGraphCleaner } from './types';

function processEdges<T extends MyEdge>(
	{ node: mergeNode, incoming, outgoing }: NodeWithRelatedTypedEdges<T>,
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
				id: [edge.source, `(merge ${mergeNode.id})`, outgoingEdge.target].join(idSeparator),
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
		node: outgoingEdge.data.relatedNodes.target,
	};
}

export const foldMergeNode: NamedGraphCleaner = {
	name: 'Merge Node',
	apply: (graph) => {
		const lookups = makeGraphLookups(graph);
		const nodesAndStuff = findNodesByOpTypeWithRelatedTypedEdges(OpType.Merge, lookups);

		const edgesToRemove: MyEdge[] = [];
		const edgesToAdd: MyEdge[] = [];
		const nodesToMark = new Set<string>();

		for (const stuff of nodesAndStuff) {
			const { node: mergeNode, incoming, outgoing } = stuff;

			const reactiveEdgeChanges = processEdges(
				{ node: mergeNode, incoming: incoming.reactive, outgoing: outgoing.reactive },
				createReactiveEdge,
				' --> ',
			);

			const ownershipEdgeChanges = processEdges(
				{ node: mergeNode, incoming: incoming.source, outgoing: outgoing.source },
				createSourceEdge,
				' owns ',
			);

			edgesToRemove.push(...(reactiveEdgeChanges?.edgesToRemove ?? []), ...(ownershipEdgeChanges?.edgesToRemove ?? []));
			edgesToAdd.push(...(reactiveEdgeChanges?.edgesToAdd ?? []), ...(ownershipEdgeChanges?.edgesToAdd ?? []));
			[reactiveEdgeChanges?.node?.id, ownershipEdgeChanges?.node?.id]
				.filter((x) => x != null)
				.forEach((id) => nodesToMark.add(id));
		}

		for (const node of graph.nodes.filter(isRegularNode)) {
			node.data.effector.isMergeEvent = nodesToMark.has(node.id);
		}

		return {
			nodes: graph.nodes,
			edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd),
		};
	},
};
