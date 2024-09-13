import { getEdgesBy, shallowCopyGraph } from '../../lib';
import { EdgeType, EffectorGraph } from '../../types';
import { GraphCleaner } from '../cleaners/types';
import { attachedEffectEnricher } from './attachedEffectEnricher';
import { EnricherImpl } from './types';

export const enrichGraph =
	(edgesType: EdgeType): GraphCleaner =>
	(graph) => {
		const enrichers: EnricherImpl[] = [attachedEffectEnricher];
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
