import { isRegularNode } from '../../lib';
import { type MyEdge, OpType } from '../../types';
import { makeGraphLookups } from './lib';
import type { NamedGraphCleaner } from './types';

export const parentEnricher: NamedGraphCleaner = {
	name: 'Parent Enricher',
	apply: (graph) => {
		console.group('ENRICHER');

		const edgesToRemove: MyEdge[] = [];

		const lookups = makeGraphLookups(graph);

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

		return {
			nodes: graph.nodes,
			edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)),
		};
	},
};
