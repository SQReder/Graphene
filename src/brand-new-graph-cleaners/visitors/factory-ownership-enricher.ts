import { createFactoryOwnershipEdge } from '../../edge-factories';
import type { NamedGraphVisitor } from '../types';

export const factoryOwnershipEnricher: NamedGraphVisitor = {
	name: 'Factory ownership enricher',
	visit: async (graph) => {
		for (const factoryNode of graph.nodes /*.filter((node) => getMetaHelper(node)?.isFactory)*/) {
			const declaration = factoryNode.data.declaration;
			if (declaration) {
				console.log('factoryNode', factoryNode);
				const region = declaration.declaration.region;
				console.log('region', region);

				if (region && 'id' in region && typeof region.id === 'string') {
					const parentNode = graph.getNode(region.id);

					if (parentNode) {
						graph.addEdge(
							createFactoryOwnershipEdge({
								id: `${parentNode.id} owns ${factoryNode.id}`,
								source: parentNode,
								target: factoryNode,
							}),
						);
					}
				}
			}
		}
	},
};
