import { isOwnershipEdge, isReactiveEdge } from '../../lib';
import type { MyEdge, OwnershipEdge } from '../../types';
import type { NamedGraphCleaner } from './types';

const getEdgeKey = (edge: MyEdge): string => `${edge.source}-${edge.target}`;

export const removeOwnershipWhereReactiveEdgePresent: NamedGraphCleaner = {
	name: 'Remove ownership where reactive edge present',
	apply: (graph) => {
		const edgesToRemove: MyEdge[] = [];

		const reactiveEdgeKeys = new Set<string>();
		const ownershipEdges: OwnershipEdge[] = [];

		for (const edge of graph.edges) {
			if (isReactiveEdge(edge)) {
				reactiveEdgeKeys.add(getEdgeKey(edge));
			} else if (isOwnershipEdge(edge)) {
				ownershipEdges.push(edge);
			} else {
				throw new Error(`Unexpected edge type: ${edge.data.edgeType}`);
			}
		}

		for (const edge of ownershipEdges) {
			if (reactiveEdgeKeys.has(getEdgeKey(edge))) {
				edgesToRemove.push(edge);
			}
		}

		return {
			nodes: graph.nodes,
			edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)),
		};
	},
};