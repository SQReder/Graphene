import { createOwnershipEdge, createReactiveEdge } from '../../edge-factories';
import { findNodesByOpTypeWithRelatedTypedEdges } from '../../lib';
import { type MyEdge, OpType } from '../../types';
import { makeGraphLookups } from './lib';
import type { NamedGraphCleaner } from './types';

export const combineNodeFold: NamedGraphCleaner = {
	name: 'Combine node fold',
	apply: (graph) => {
		const { nodes, edges } = graph;
		const nodesWithEdges = findNodesByOpTypeWithRelatedTypedEdges(OpType.Combine, makeGraphLookups(graph));
		const newEdges: MyEdge[] = [];
		const edgesToRemove: MyEdge[] = [];

		for (const { node: combineNode, incoming, outgoing } of nodesWithEdges) {
			const combineName = combineNode.data.effector.graphite.scope?.key || 'combined?';

			if (incoming.reactive.length !== 1 || outgoing.reactive.length !== 1) {
				console.warn('Combine node has multiple incoming or outgoing edges', combineNode);
				continue;
			}

			const inReactiveEdge = incoming.reactive[0];
			const outReactiveEdge = outgoing.reactive[0];

			const sourceNode = inReactiveEdge.data.relatedNodes.source;
			const targetNode = outReactiveEdge.data.relatedNodes.target;

			newEdges.push(
				createReactiveEdge({
					id: `${inReactiveEdge.source} --> ${outReactiveEdge.target}`,
					source: sourceNode,
					target: targetNode,
					extras: (edge) => {
						edge.label = combineName;
						edge.data.relatedNodes = {
							collapsed: [combineNode],
							source: sourceNode,
							target: targetNode,
						};
					},
				}),
			);

			edgesToRemove.push(...incoming.reactive);
			edgesToRemove.push(...outgoing.reactive);

			newEdges.push(
				createOwnershipEdge({
					id: `${inReactiveEdge.source} owns ${outReactiveEdge.target}`,
					source: sourceNode,
					target: targetNode,
					extras: (edge) => {
						edge.label = combineName;
						edge.data.relatedNodes = {
							collapsed: [combineNode],
							source: sourceNode,
							target: targetNode,
						};
					},
				}),
			);

			edgesToRemove.push(...incoming.ownership);
			edgesToRemove.push(...outgoing.ownership);
		}

		// debug logs
		console.log('newEdges', newEdges);
		console.log('edgesToRemove', edgesToRemove);

		const updatedEdges = edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...newEdges);

		return {
			nodes: nodes,
			edges: updatedEdges,
		};
	},
};
