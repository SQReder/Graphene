import { findNodesByOpTypeWithRelatedTypedEdges } from '../../lib';
import { type MyEdge, OpType } from '../../types';
import { makeGraphLookups } from './lib';

export const reinit = {
	name: 'Reinit cleaner',
	apply: (graph) => {
		console.groupCollapsed('reinit cleaner');

		const lookups = makeGraphLookups(graph);

		const reinitNodes = findNodesByOpTypeWithRelatedTypedEdges(
			OpType.Event,
			lookups,
			(node) => node.data.effector.name === 'reinit',
		);

		const edgesToRemove: MyEdge[] = [];

		for (const { node: reinitNode, incoming, outgoing } of reinitNodes) {
			console.debug('reinit node', reinitNode.data.label, reinitNode);

			if (incoming.reactive.length > 0) {
				console.debug('reinit have some reactive incoming edges - so save it', incoming.reactive);
				continue;
			}

			edgesToRemove.push(...incoming.ownership, ...incoming.reactive, ...outgoing.ownership, ...outgoing.reactive);
		}

		console.groupEnd();
		return {
			nodes: graph.nodes,
			edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)),
		};
	},
};
