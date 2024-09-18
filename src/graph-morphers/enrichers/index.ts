import { getEdgesBy, isRegularNode, shallowCopyGraph } from '../../lib';
import { type EdgeType, type MyEdge, OpType } from '../../types';
import type { GraphCleaner } from '../cleaners/types';
import { attachedEffectEnricher } from './attachedEffectEnricher';
import type { EnricherImpl } from './types';

const parentEnricher: EnricherImpl = (graph, lookups, edgesType) => {
	console.group('ENRICHER');

	const edgesToRemove: MyEdge[] = [];

	for (const node of lookups.nodes.values()) {
		if (isRegularNode(node)) {
			const { effector, declaration } = node.data;
			if (declaration) {
				console.log('Found parent', node.data.label, declaration.parentId);
				node.parentId = declaration.parentId;
				node.expandParent = true;
			} else {
				if (effector.meta.op === OpType.Domain) {
					const owners = lookups.edgesByTarget.ownership
						.get(node.id)
						?.map((edge) => edge.data.relatedNodes.source)
						?.filter(isRegularNode)
						?.filter((node) => node.data.effector.meta.op !== OpType.Domain);

					if (!owners) {
						console.log('No owners', node.data.label, node);
						continue;
					}

					const owner = owners[0];

					if (!owner) {
						console.log('No owner', node.data.label, node);
						continue;
					}

					node.parentId = owner.id;
					node.expandParent = true;
				}
			}

			if (node.parentId) {
				const nodeToParentEdge = lookups.edgesByTarget.ownership
					.get(node.id)
					?.filter((edge) => edge.source === node.parentId);

				if (nodeToParentEdge?.length) {
					edgesToRemove.push(...nodeToParentEdge);
				}
			}
		} else {
			console.log('Non-regular node', node.data.label, node);
		}
	}

	console.groupEnd();

	return {};
};

const enrichers: EnricherImpl[] = [attachedEffectEnricher, parentEnricher];

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
