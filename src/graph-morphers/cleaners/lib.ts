import {
	findNodesByOpTypeWithRelatedEdges,
	getEdgesBy,
	type GraphTypedEdgesSelector,
	isRegularNode,
	type Lookups,
	shallowCopyGraph,
} from '../../lib';
import type { EffectorGraph, EffectorNode, MyEdge, RegularEffectorNode } from '../../types';
import { OpType } from '../../types';
import type { EdgeCleaner, EdgeCreator, GraphCleaner, NamedEdgeCleaner, NamedGraphCleaner } from './types';

export function makeGraphLookups<T extends MyEdge>(
	graph: EffectorGraph,
	filter?: (edge: MyEdge) => edge is T,
): Lookups {
	return {
		edgesBySource: getEdgesBy(filter ? graph.edges.filter(filter) : graph.edges, 'source'),
		edgesByTarget: getEdgesBy(filter ? graph.edges.filter(filter) : graph.edges, 'target'),
		nodes: new Map(graph.nodes.map((node) => [node.id, node])),
	};
}

export function cleanEdges<T extends MyEdge>(
	cleaners: ReadonlyArray<NamedEdgeCleaner<T>>,
	graph: EffectorGraph,
	edges: T[],
) {
	return cleaners.reduce(
		(edgesToClean, cleaner) => {
			const { edgesToRemove = [], edgesToAdd = [] } = cleaner.apply(edgesToClean, makeGraphLookups(graph));
			return edgesToClean.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd);
		},
		[...edges],
	);
}

export const makeTransitiveNodeReplacer = <T extends MyEdge>(
	transitiveOpType: OpType | undefined,
	selector: GraphTypedEdgesSelector<T>,
	edgeCreator: EdgeCreator<T>,
	filter?: (node: EffectorNode) => boolean,
): EdgeCleaner<T> => {
	return (_, lookups) => {
		const edgesToRemove: T[] = [];
		const edgesToAdd: T[] = [];

		const nodesAndStuff = findNodesByOpTypeWithRelatedEdges(transitiveOpType, {
			byTarget: lookups.edgesByTarget[selector] as Map<string, T[]>,
			bySource: lookups.edgesBySource[selector] as Map<string, T[]>,
			nodes: lookups.nodes,
		});

		console.groupCollapsed(`transitive nodes ${transitiveOpType}`);
		nodesAndStuff.forEach(({ node, incoming, outgoing }) => {
			if (filter ? !filter(node) : false) {
				console.debug('skipped', node.data.label);
				return;
			}

			console.debug('transitive node', node.data.label, node);

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
		console.groupEnd();

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
		console.group('reinit cleaner', selector);
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
			console.group('node', node.data.label, node);

			const incomingNonFactoryEdges = incoming.filter((edge) => {
				const source = edge.data.relatedNodes.source;
				console.debug('incoming edge', edge);
				console.debug('source', source);
				const isFactory = isRegularNode(source) && source.data.effector.isFactory;
				console.debug('is factory', isFactory);
				return !isFactory;
			});

			if (incomingNonFactoryEdges.length > 0) {
				console.warn('expected no incoming non-factory edges for reinit event', incomingNonFactoryEdges);
				console.groupEnd();
				continue;
			}

			if (outgoing.length === 0) {
				console.warn('no outgoing edges for reinit event', outgoing);
				console.groupEnd();
				continue;
			}

			if (outgoing.length > 1) {
				console.warn('expected one, but found few outgoing edges for reinit event', outgoing);
				console.groupEnd();
				continue;
			}

			const singleOutgoingEdge = outgoing[0];

			for (const incomingEdge of incoming) {
				console.debug('incoming edge', incomingEdge);
				edgesToAdd.push(edgeCreator(incomingEdge, singleOutgoingEdge, node, OpType.Event));
			}

			edgesToRemove.push(...incoming, ...outgoing);

			console.groupEnd();
		}

		console.groupEnd();
		return { edgesToRemove, edgesToAdd };
	};

export function namedEdgeCleanerToGraphCleaner<T extends MyEdge>({
	edgeFilter,
	cleaner,
}: {
	edgeFilter: (edge: MyEdge) => edge is T;
	cleaner: NamedEdgeCleaner<T>;
}): NamedGraphCleaner {
	return {
		name: cleaner.name,
		apply: (graph) => {
			const dirty: T[] = [];
			const other: MyEdge[] = [];

			for (const edge of graph.edges) {
				if (edgeFilter(edge)) {
					dirty.push(edge);
				} else {
					other.push(edge);
				}
			}

			const lookups = makeGraphLookups(graph, edgeFilter);
			const { edgesToRemove = [], edgesToAdd = [] } = cleaner.apply(dirty, lookups);

			return {
				edges: [...dirty.filter((edge) => !edgesToRemove.includes(edge)).concat(edgesToAdd), ...other],
				nodes: graph.nodes,
			};
		},
	};
}

export function edgeCleanerToGraphCleaner<T extends MyEdge>({
	edgeFilter,
	cleaner,
}: {
	edgeFilter: (edge: MyEdge) => edge is T;
	cleaner: EdgeCleaner<T>;
}): GraphCleaner {
	return (graph) => {
		const dirty: T[] = [];
		const other: MyEdge[] = [];

		for (const edge of graph.edges) {
			if (edgeFilter(edge)) {
				dirty.push(edge);
			} else {
				other.push(edge);
			}
		}

		const lookups = makeGraphLookups(graph, edgeFilter);
		const { edgesToRemove = [], edgesToAdd = [] } = cleaner(dirty, lookups);

		return {
			edges: [...dirty.filter((edge) => !edgesToRemove.includes(edge)).concat(edgesToAdd), ...other],
			nodes: graph.nodes,
		};
	};
}

export const dropEdgesOfNode =
	<T extends MyEdge>(
		opType: OpType,
		drop: 'incoming' | 'outcoming',
		selector: GraphTypedEdgesSelector<T>,
		filter?: (node: RegularEffectorNode) => boolean,
	): EdgeCleaner<T> =>
	(_, lookups) => {
		const factories = findNodesByOpTypeWithRelatedEdges(
			opType,
			{
				bySource: lookups.edgesBySource[selector] as Map<string, T[]>,
				byTarget: lookups.edgesByTarget[selector] as Map<string, T[]>,
				nodes: lookups.nodes,
			},
			filter,
		);

		console.log(`found ${factories.length} of ${opType}`, factories);

		return {
			edgesToRemove: factories
				.flatMap((nodeAndStuff) => nodeAndStuff[drop])
				.filter((edge: MyEdge) => edge.data.edgeType === selector),
		};
	};

export const createGraphCleaner =
	(cleaners: readonly NamedGraphCleaner[]): GraphCleaner =>
	(graph) => {
		return cleaners.reduce((graph, namedCleaner) => namedCleaner.apply(graph), shallowCopyGraph(graph));
	};

export function withOrder(order: number, ...cleaners: NamedGraphCleaner[]): NamedGraphCleaner[] {
	return cleaners.map(
		(cleaner): NamedGraphCleaner => ({
			name: cleaner.name,
			apply: cleaner.apply,
			order,
		}),
	);
}
