import { createLinkEdge } from '../../edge-factories';
import type { BufferedGraph } from '../../graph-manager';
import { isParentToChildEdge, isRegularNode, isSourceEdge } from '../../lib';
import { type MyEdge, type RegularEffectorNode } from '../../types';
import type { NamedGraphVisitor } from '../types';
import { getKey } from './get-key';

function hasNoFields(obj: Record<keyof any, unknown>): boolean {
	return Object.keys(obj).length === 0;
}

const isRegionRoot = (node: RegularEffectorNode) => {
	if (node.data.declaration?.type === 'region') return true;

	// пытаемся по косвенным признакам определить корневой узел региона
	const graphite = node.data.effector.graphite;
	const emptyMeta = hasNoFields(graphite.meta);
	const emptyScope = !graphite.scope || hasNoFields(graphite.scope);
	const noNextLinks = graphite.next.length === 0;
	const noSeqItems = 'seq' in graphite && Array.isArray(graphite.seq) && graphite.seq.length === 0;

	const noOwners = graphite.family.owners.length === 0;
	const manyLinks = graphite.family.links.length > 0;

	const likelyAnRegionRoot = emptyMeta && emptyScope && noNextLinks && noSeqItems && noOwners && manyLinks;

	return likelyAnRegionRoot;
};

function groupByKey<T extends MyEdge>(links: T[]) {
	const map = links.reduce((acc, link) => {
		const key = getKey(link);
		if (!acc.has(key)) acc.set(key, []);
		acc.get(key)?.push(link);
		return acc;
	}, new Map<string, typeof links>());
	return map;
}

export const regionOwnershipReflow: NamedGraphVisitor = {
	name: 'Region Ownership Reflow',

	visit: async (graph: BufferedGraph) => {
		const regionRoots = graph.nodes.filter((node) => isRegularNode(node)).filter((node) => isRegionRoot(node));

		for (const regionRoot of regionRoots) {
			console.group(`Processing region root: ${regionRoot.id}`);

			const ownershipLinks = graph.listEdgesFrom(regionRoot.id, isParentToChildEdge);
			console.log('Ownership links:', ownershipLinks);
			const sourceLinks = graph.listEdgesFrom(regionRoot.id, isSourceEdge);
			console.log('Source links:', sourceLinks);

			const regionRootFactory = graph
				.listEdgesTo(regionRoot.id, isParentToChildEdge)
				.find((edge) => edge.data.relatedNodes.source.data.effector?.meta.isFactory)?.data.relatedNodes.source;

			if (regionRootFactory) {
				const ownershipLinksMap = groupByKey(ownershipLinks);

				console.log('Ownership links grouped by key:', ownershipLinksMap);

				const sourceLinksMap = groupByKey(sourceLinks);
				console.log('Source links grouped by key:', sourceLinksMap);

				const poppedLinks = Array.from(ownershipLinksMap.values())
					.flatMap((links) => links.pop())
					.filter((x) => x != null);

				console.log('Popped links:', poppedLinks);

				const poppedSources = Array.from(sourceLinksMap.values())
					.flatMap((links) => links.pop())
					.filter((x) => x != null);
				console.log('Popped sources:', poppedSources);

				for (const poppedLink of poppedLinks) {
					graph.removeEdgeById(poppedLink.id);
					graph.addEdge(
						createLinkEdge({
							id: `${poppedLink.id} [reflowed from ${regionRoot.id}]`,
							source: regionRootFactory,
							target: poppedLink.data.relatedNodes.target,
						}),
					);
				}

				for (const sourceLink of poppedSources) {
					graph.removeEdgeById(sourceLink.id);
				}
			} else {
				console.warn('No factory found for region root', regionRoot);
			}

			console.groupEnd();
		}
	},
};
