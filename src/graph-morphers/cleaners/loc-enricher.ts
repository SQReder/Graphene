import { isRegularNode } from '../../lib';
import type { NamedGraphCleaner } from './types';

export const locEnricher: NamedGraphCleaner = {
	name: 'Loc Enricher',
	apply: (graph) => {
		return {
			nodes: graph.nodes.map((node) => {
				const isRegular = isRegularNode(node);

				if (!isRegular) return node;

				const hasMetaLoc = node.data.effector.meta.loc != null;
				const region = node.data.declaration?.declaration?.region;
				const hasDeclarationRegionLoc = region && 'loc' in region && region.loc != null;
				const isCombined = node.data.effector.meta.isCombinedStore;

				const hasFactoryLoc = node.data.effector.graphite.family.owners.some(
					(owner) => owner.meta.op === undefined && owner.meta.loc != null,
				);

				return {
					...node,
					data: {
						...node.data,
						noLoc: !(hasMetaLoc || hasDeclarationRegionLoc || isCombined || hasFactoryLoc),
					},
				};
			}),
			edges: graph.edges,
		};
	},
};

export const dropNoLocNodes: NamedGraphCleaner = {
	name: 'Drop noLoc nodes',
	apply: (graph) => {
		const nodes = graph.nodes.filter((node) => (isRegularNode(node) ? !node.data.noLoc : true)).map((x) => x.id);
		return {
			nodes: graph.nodes,
			edges: graph.edges.filter((edge) => nodes.includes(edge.source) && nodes.includes(edge.target)),
		};
	},
};
