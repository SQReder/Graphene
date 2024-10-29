import { createLinkEdge } from '../../edge-factories';
import { isRegularNode } from '../../lib';
import { type EffectorNode, NodeFamily } from '../../types';
import type { NamedGraphVisitor } from '../types';

const hypernodeChildTreshold = 10;

export const foldHypernodes: NamedGraphVisitor = {
	name: 'Fold hypernodes',
	visit: async (graph) => {
		const hypernodes = graph.nodes.filter(isHyperNode);

		for (const hypernode of hypernodes) {
			// graph.removeNode(hypernode.id);

			hypernode.data.label = '🔗 hypernode';
			for (const edge of graph.listEdgesFrom(hypernode.id)) {
				graph.removeEdgeById(edge.id);
				graph.addEdge(
					createLinkEdge({
						id: edge.id + '[source -> ownership]',
						source: hypernode,
						target: edge.data.relatedNodes.target,
					}),
				);
			}
		}
	},
};

const isHyperNode = (node: EffectorNode) => {
	if (!isRegularNode(node)) return false;
	const graphite = node.data.effector.graphite;

	const noMeta = Object.keys(graphite.meta).length === 0;
	const hasNoOwners = graphite.family.owners.length === 0;
	const hasNoNextNodes = graphite.next.length === 0;
	const tooMuchLinks = graphite.family.links.length >= hypernodeChildTreshold;
	const hasRegularFamilyType = graphite.family.type === NodeFamily.Regular;

	return noMeta && hasNoNextNodes && hasNoOwners && tooMuchLinks && hasRegularFamilyType;
};
