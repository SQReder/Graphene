import { isRegularNode } from '../../lib';
import { formatLocation, type RegularEffectorNode } from '../../types';
import type { NamedGraphVisitor } from '../types';

function tryFindLoc(node: RegularEffectorNode): string | undefined {
	const metaLoc = node.data.effector.meta.loc;

	if (metaLoc) return metaLoc;

	const region = node.data.declaration?.declaration?.region;
	const declarationRegionLoc = region && 'loc' in region && region.loc;

	if (declarationRegionLoc) return formatLocation(declarationRegionLoc);

	const factoryLoc = node.data.effector.graphite.family.owners
		.map((owner) => owner.meta)
		.filter((meta) => meta.op === undefined)
		.find((meta) => meta.loc != null)?.loc;

	return formatLocation(factoryLoc);
}

export const locEnricher: NamedGraphVisitor = {
	name: 'Loc Enricher',
	visit: async (graph) => {
		for (const node of graph.nodes) {
			if (!isRegularNode(node)) continue;

			const loc = tryFindLoc(node);

			if (!node.data.effector.loc && loc) {
				node.data.effector.syntheticLocation = loc;
			}

			node.data.noLoc = !loc;
		}
	},
};
