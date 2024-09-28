import { isParentToChildEdge, isSourceEdge } from '../../lib';
import type { NamedGraphVisitor } from '../types';
import { getKey } from './get-key';

export const detachFactories: NamedGraphVisitor = {
	name: 'Detach factories at source layer',
	visit: (graph) => {
		console.time('Total execution time');

		const factoryNodes = graph.nodes.filter((node) => node.data.effector?.meta.isFactory);
		for (const factoryNode of factoryNodes) {
			console.group(`Processing factory node: ${factoryNode.id}`);

			graph.edges.forEach((edge) => console.log(edge));

			const childLinks = graph.listEdgesFrom(factoryNode.id, isParentToChildEdge);
			const sourceLinks = graph.listEdgesFrom(factoryNode.id, isSourceEdge);

			console.log(`Child links: ${childLinks.length}, Source links: ${sourceLinks.length}`);

			const childrenKeys = new Set(childLinks.map(getKey));
			console.log('Children keys:', Array.from(childrenKeys));

			let removedEdges = 0;
			for (const sourceLink of sourceLinks) {
				const key = getKey(sourceLink);
				if (childrenKeys.has(key)) {
					console.log(`Removing source link: ${sourceLink.id} (${key})`);
					graph.removeEdgeById(sourceLink.id);
					removedEdges++;
				}
			}

			console.log(`Removed ${removedEdges} source links`);
			console.groupEnd();
		}

		console.timeEnd('Total execution time');
	},
};
