import { findNodesByOpTypeWithRelatedEdges, getEdgesBy, GraphTypedEdgesSelector, isRegularNode } from '../../lib';
import { EffectorGraph, MyEdge, OpType } from '../../types';
import { EdgeCleaner, EdgeCreator } from './types';

export function cleanEdges<T extends MyEdge>(cleaners: Array<EdgeCleaner<T>>, graph: EffectorGraph, edges: T[]) {
	return cleaners.reduce(
		(edges, cleaner) => {
			const { edgesToRemove = [], edgesToAdd = [] } = cleaner(edges, {
				edgesBySource: getEdgesBy(edges, 'source'),
				edgesByTarget: getEdgesBy(edges, 'target'),
				nodes: new Map(graph.nodes.map((node) => [node.id, node])),
			});
			return edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd);
		},
		[...edges],
	);
}

export const makeTransitiveNodeReplacer = <T extends MyEdge>(
	transitiveOpType: OpType,
	selector: GraphTypedEdgesSelector<T>,
	edgeCreator: EdgeCreator<T>,
): EdgeCleaner<T> => {
	return (_, lookups) => {
		const edgesToRemove: T[] = [];
		const edgesToAdd: T[] = [];

		const nodesAndStuff = findNodesByOpTypeWithRelatedEdges(transitiveOpType, {
			byTarget: lookups.edgesByTarget[selector] as Map<string, T[]>,
			bySource: lookups.edgesBySource[selector] as Map<string, T[]>,
			nodes: lookups.nodes,
		});

		nodesAndStuff.forEach(({ node, incoming, outgoing }) => {
			const { factoryOwners, nonFactoryOwners } = incoming.reduce<{
				factoryOwners: T[];
				nonFactoryOwners: T[];
			}>(
				(acc, edge) => {
					const owner = lookups.nodes.get(edge.source)!;
					if (isRegularNode(owner)) {
						if (owner.data.effector.isFactory) {
							acc.factoryOwners.push(edge);
						} else {
							acc.nonFactoryOwners.push(edge);
						}
					}
					return acc;
				},
				{ factoryOwners: [], nonFactoryOwners: [] },
			);

			const regularChildren = outgoing.filter((edge) => {
				const child = lookups.nodes.get(edge.target)!;
				return isRegularNode(child) && !child.data.effector.isFactory;
			});

			if (nonFactoryOwners.length === 0) {
				console.warn('transitive node has no non-factory owners', node);
				return;
			}

			if (nonFactoryOwners.length > 1) {
				console.warn('transitive node has multiple non-factory owners', node);
				return;
			}

			const owner = nonFactoryOwners[0];

			if (regularChildren.length === 0) {
				console.warn('transitive node has no regular children', node);
				return;
			}

			if (regularChildren.length > 1) {
				console.warn('transitive node has multiple regular children', node);
				return;
			}

			const child = regularChildren[0];

			edgesToAdd.push(edgeCreator(owner, child, node, transitiveOpType));

			edgesToRemove.push(...factoryOwners, ...nonFactoryOwners, ...regularChildren);
		});

		return { edgesToRemove, edgesToAdd };
	};
};

export const createStoreUpdatesWithNoChildrenCleaner =
	<T extends MyEdge>(selector: GraphTypedEdgesSelector<T>) =>
	(_, lookups) => {
		const edgesToRemove: T[] = [];

		const nodes = findNodesByOpTypeWithRelatedEdges<T>(
			OpType.Event,
			{
				bySource: lookups.edgesBySource[selector] as Map<string, T[]>,
				byTarget: lookups.edgesByTarget[selector] as Map<string, T[]>,
				nodes: lookups.nodes,
			},
			(node) => node.data.effector.name === 'updates' && node.data.effector.isDerived,
		);

		for (const { incoming, outgoing } of nodes) {
			if (outgoing.length === 0) {
				edgesToRemove.push(...incoming);
			}
		}

		return { edgesToRemove };
	};

export const createReinitCleaner =
	<T extends MyEdge>(selector: GraphTypedEdgesSelector<T>, edgeCreator: EdgeCreator<T>): EdgeCleaner<T> =>
	(_, lookups) => {
		const nodes = findNodesByOpTypeWithRelatedEdges(
			OpType.Event,
			{
				bySource: lookups.edgesBySource[selector] as Map<string, T[]>,
				byTarget: lookups.edgesByTarget[selector] as Map<string, T[]>,
				nodes: lookups.nodes,
			},
			(node) => node.data.effector.name === 'reinit',
		);

		const edgesToRemove: T[] = [];
		const edgesToAdd: T[] = [];

		for (const { node, incoming, outgoing } of nodes) {
			if (outgoing.length === 0) {
				console.warn('no outgoing edges for reinit event', node, outgoing);
				continue;
			}

			if (outgoing.length > 1) {
				console.warn('expected one, but found few outgoing edges for reinit event', node, outgoing);
				continue;
			}

			const singleOutgoingEdge = outgoing[0];

			for (const incomingEdge of incoming) {
				edgesToAdd.push(edgeCreator(incomingEdge, singleOutgoingEdge, node, OpType.Event));
			}

			edgesToRemove.push(...incoming, ...outgoing);
		}

		return { edgesToRemove, edgesToAdd };
	};
