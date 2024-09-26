import { sortTreeNodesBFS } from '../../dfs';
import { isRegularNode } from '../../lib';
import { type MyEdge, OpType } from '../../types';
import { makeGraphLookups } from './lib';
import type { NamedGraphCleaner } from './types';

export const parentEnricher: NamedGraphCleaner = {
	name: 'Parent Enricher',
	apply: (graph) => {
		console.groupCollapsed('parentEnricher');

		const edgesToRemove: Set<MyEdge> = new Set();
		const parentRelations: Map<string, string> = new Map();

		const lookups = makeGraphLookups(graph);

		for (const node of lookups.nodes.values()) {
			if (isRegularNode(node)) {
				const { effector, declaration } = node.data;
				if (declaration?.parentId) {
					console.log('Found parent', node.data.label, declaration.parentId);
					parentRelations.set(node.id, declaration.parentId);
				} else if (effector.meta.op === OpType.Domain) {
					const owners = lookups.edgesByTarget.ownership
						.get(node.id)
						?.map((edge) => edge.data.relatedNodes.source)
						?.filter(isRegularNode)
						?.filter((node) => node.data.effector.meta.op !== OpType.Domain);

					if (owners && owners.length > 0) {
						const owner = owners[0];
						parentRelations.set(node.id, owner.id);
					} else {
						console.log('No owners', node.data.label, node);
					}
				}

				const parentId = parentRelations.get(node.id);
				if (parentId) {
					const nodeToParentEdge = lookups.edgesByTarget.ownership
						.get(node.id)
						?.filter((edge) => edge.source === parentId);

					if (nodeToParentEdge?.length) {
						nodeToParentEdge.forEach((edge) => edgesToRemove.add(edge));
					}
				}
			} else {
				console.log('Non-regular node', node.data.label, node);
			}
		}

		console.groupEnd();

		const updatedNodes = graph.nodes.map((node) => {
			if (isRegularNode(node)) {
				const parentId = parentRelations.get(node.id);
				if (parentId) {
					return {
						...node,
						parentId,
						expandParent: true,
					};
				}
			}
			return node;
		});

		const sortedNodes = sortTreeNodesBFS(updatedNodes);

		return {
			nodes: sortedNodes,
			edges: graph.edges.filter((edge) => !edgesToRemove.has(edge)),
		};
	},
};
