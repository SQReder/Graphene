import { findNodesByOpTypeWithRelatedEdges, getEdgesBy, isOwnershipEdge, shallowCopyGraph } from '../../lib';
import type { EdgeType, MyEdge } from '../../types';
import type { GraphCleaner } from '../cleaners/types';
import { attachedEffectEnricher } from './attachedEffectEnricher';
import type { EnricherImpl } from './types';

const invokeEnricher: EnricherImpl = (graph, lookups, edgesType) => {
	console.group('ENRICHER');
	const factories = findNodesByOpTypeWithRelatedEdges(
		undefined,
		{
			bySource: lookups.edgesBySource.ownership,
			byTarget: lookups.edgesByTarget.ownership,
			nodes: lookups.nodes,
		},
		(node) =>
			node.data.effector.meta.op === undefined &&
			node.data.effector.meta.type === 'factory' &&
			node.data.effector.meta.method === 'invoke',
	);
	console.groupEnd();

	const edgesToRemove: MyEdge[] = [];

	factories.forEach(({ node, incoming, outgoing }) => {
		outgoing.filter(isOwnershipEdge).forEach((outgoingEdge) => {
			const target = outgoingEdge.data.relatedNodes.target;
			const nodeeee = lookups.nodes.get(target.id)!;
			nodeeee.parentId = node.id;
			nodeeee.expandParent = true;
		});
		edgesToRemove.push(...outgoing);
	});

	return {
		edgesToRemove,
	};
};

const enrichers: EnricherImpl[] = [attachedEffectEnricher /*invokeEnricher*/];

export const enrichGraph =
	(edgesType: EdgeType): GraphCleaner =>
	(graph) => {
		return enrichers.reduce((graph, enrich) => {
			const { edgesToRemove = [], edgesToAdd = [] } =
				enrich(
					graph,
					{
						edgesBySource: getEdgesBy(graph.edges, 'source'),
						edgesByTarget: getEdgesBy(graph.edges, 'target'),
						nodes: new Map(graph.nodes.map((node) => [node.id, node])),
					},
					edgesType,
				) || {};

			return {
				nodes: graph.nodes,
				edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd),
			};
		}, shallowCopyGraph(graph));
	};
