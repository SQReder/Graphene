import { createFactoryOwnershipEdge, createLinkEdge, createReactiveEdge, createSourceEdge } from '../../edge-factories';
import type { BufferedGraph } from '../../graph-manager';
import { isFactoryOwnershipEdge, isParentToChildEdge, isReactiveEdge, isRegularNode, isSourceEdge } from '../../lib';
import type { FactoryOwnershipEdge, ParentToChildEdge } from '../../types';
import {
	type EffectorNode,
	type MyEdge,
	type ReactiveEdge,
	type RegularEffectorNode,
	type SourceEdge,
} from '../../types';
import type { NamedGraphVisitor } from '../types';

type EdgeCreator<T extends MyEdge> = ({
	id,
	edge,
	root,
}: {
	id: string;
	edge: T;
	root: EffectorNode;
	extras?: (edge: T) => void;
}) => T;

type EdgeFactories = {
	inboundSource: EdgeCreator<SourceEdge>;
	outboundSource: EdgeCreator<SourceEdge>;
	inboundReactive: EdgeCreator<ReactiveEdge>;
	outboundReactive: EdgeCreator<ReactiveEdge>;
	inboundParentToChild: EdgeCreator<ParentToChildEdge>;
	outboundParentToChild: EdgeCreator<ParentToChildEdge>;
	inboundFactoryOwnershipEdge: EdgeCreator<FactoryOwnershipEdge>;
	outboundFactoryOwnershipEdge: EdgeCreator<FactoryOwnershipEdge>;
};

const defaultEdgeFactories: EdgeFactories = {
	inboundSource: ({ id, edge, root, extras }) =>
		createSourceEdge({ id, source: edge.data.relatedNodes.source, target: root, extras }),
	inboundReactive: ({ id, edge, root, extras }) =>
		createReactiveEdge({ id, source: edge.data.relatedNodes.source, target: root, extras }),
	outboundSource: ({ id, edge, root, extras }) =>
		createSourceEdge({ id, source: root, target: edge.data.relatedNodes.target, extras }),
	outboundReactive: ({ id, edge, root, extras }) =>
		createReactiveEdge({ id, source: root, target: edge.data.relatedNodes.target, extras }),
	inboundParentToChild: ({ id, edge, root, extras }) =>
		createLinkEdge({ id, source: edge.data.relatedNodes.source, target: root, extras }),
	outboundParentToChild: ({ id, edge, root, extras }) =>
		createLinkEdge({ id, source: root, target: edge.data.relatedNodes.target, extras }),
	inboundFactoryOwnershipEdge: ({ id, edge, root, extras }) =>
		createFactoryOwnershipEdge({ id, source: edge.data.relatedNodes.source, target: root, extras }),
	outboundFactoryOwnershipEdge: ({ id, edge, root, extras }) =>
		createFactoryOwnershipEdge({ id, source: root, target: edge.data.relatedNodes.target, extras }),
};

type IndirectInternalNodesCallback = (
	root: EffectorNode,
	internalNode: EffectorNode,
	graph: BufferedGraph,
) => RegularEffectorNode[];

export function foldByShape<T extends MyEdge = MyEdge>(
	friendlyName: string,
	rootSelector: (node: EffectorNode) => boolean,
	config: {
		factories_?: Partial<EdgeFactories>;
		getInternalNodeNames?: (node: EffectorNode) => string[];
		findIndirectInternalNodes?: IndirectInternalNodesCallback;
		extras?: (node: EffectorNode) => void;
		skipMarkAsFolded?: boolean;
		outboundEdgesFilter?: (edge: MyEdge) => edge is T;
	} = {},
): NamedGraphVisitor {
	const {
		factories_,
		getInternalNodeNames,
		findIndirectInternalNodes,
		extras,
		skipMarkAsFolded,
		outboundEdgesFilter = (edge): edge is T => isReactiveEdge(edge) || isSourceEdge(edge) || isParentToChildEdge(edge),
	} = config;

	const factories: EdgeFactories = {
		...defaultEdgeFactories,
		...factories_,
	};

	const inboundReactiveEdgeProcessor = edgeProcessorFactory({
		direction: 'inbound',
		edgeFilter: isReactiveEdge,
		edgeCreator: factories.inboundReactive,
		updateRelatedNodes: (created, original) => {
			created.data.relatedNodes.collapsed = [
				...(original.data.relatedNodes.collapsed ?? []),
				original.data.relatedNodes.target,
			];
		},
	});

	const outboundReactiveEdgeProcessor = edgeProcessorFactory({
		direction: 'outbound',
		edgeFilter: isReactiveEdge,
		edgeCreator: factories.outboundReactive,
		updateRelatedNodes: (created, original) => {
			created.data.relatedNodes.collapsed = [
				...(original.data.relatedNodes.collapsed ?? []),
				original.data.relatedNodes.source,
			];
		},
	});

	const inboundOwnershipEdgeProcessor = edgeProcessorFactory({
		direction: 'inbound',
		edgeFilter: isSourceEdge,
		edgeCreator: factories.inboundSource,
		updateRelatedNodes: (created, original) => {
			created.data.relatedNodes.collapsed = [
				...(original.data.relatedNodes.collapsed ?? []),
				original.data.relatedNodes.target,
			];
		},
	});

	const outboundOwnershipEdgeProcessor = edgeProcessorFactory({
		direction: 'outbound',
		edgeFilter: isSourceEdge,
		edgeCreator: factories.outboundSource,
		updateRelatedNodes: (created, original) => {
			created.data.relatedNodes.collapsed = [
				...(original.data.relatedNodes.collapsed ?? []),
				original.data.relatedNodes.source,
			];
		},
	});

	const inboundParentToChildEdgeProcessor = edgeProcessorFactory({
		direction: 'inbound',
		edgeFilter: isParentToChildEdge,
		edgeCreator: factories.inboundParentToChild,
		updateRelatedNodes: (created, original) => {
			created.data.relatedNodes.collapsed = [
				...(original.data.relatedNodes.collapsed ?? []),
				original.data.relatedNodes.target,
			];
		},
	});

	const outboundParentToChildEdgeProcessor = edgeProcessorFactory({
		direction: 'outbound',
		edgeFilter: isParentToChildEdge,
		edgeCreator: factories.outboundParentToChild,
		updateRelatedNodes: (created, original) => {
			created.data.relatedNodes.collapsed = [
				...(original.data.relatedNodes.collapsed ?? []),
				original.data.relatedNodes.source,
			];
		},
	});

	const inboundFactoryOwnershipEdgeProcessor = edgeProcessorFactory({
		direction: 'inbound',
		edgeFilter: isFactoryOwnershipEdge,
		edgeCreator: factories.inboundFactoryOwnershipEdge,
		updateRelatedNodes: (created, original) => {
			created.data.relatedNodes.collapsed = [
				...(original.data.relatedNodes.collapsed ?? []),
				original.data.relatedNodes.target,
			];
		},
	});

	const outboundFactoryOwnershipEdgeProcessor = edgeProcessorFactory({
		direction: 'outbound',
		edgeFilter: isFactoryOwnershipEdge,
		edgeCreator: factories.outboundFactoryOwnershipEdge,
		updateRelatedNodes: (created, original) => {
			created.data.relatedNodes.collapsed = [
				...(original.data.relatedNodes.collapsed ?? []),
				original.data.relatedNodes.source,
			];
		},
	});

	return {
		name: `Fold By Shape [${friendlyName}]`,
		visit: async (graph) => {
			console.groupCollapsed('🫨 fold by shape');

			const roots = graph.nodes.filter(rootSelector);

			for (const root of roots) {
				console.groupCollapsed(`🌳 [${root.id}] ${root.data.label}`);

				const outboundEdges = graph.listEdgesFrom(root.id, outboundEdgesFilter);
				console.log('outbound edges', outboundEdges);

				const internalNodeNames = getInternalNodeNames?.(root);

				const internalNodes = [
					...new Set(
						outboundEdges
							.map((edge) => edge.data.relatedNodes.target)
							.filter(isRegularNode)
							.filter((node) =>
								internalNodeNames
									? node.data.effector.name
										? internalNodeNames.includes(node.data.effector.name)
										: false
									: true,
							),
					),
				];

				const indirectNodes = findIndirectInternalNodes
					? internalNodes.flatMap((internalNode) => findIndirectInternalNodes(root, internalNode, graph))
					: [];
				internalNodes.push(...indirectNodes);

				console.log('internal nodes', internalNodes);

				const internalNodeIds = new Set([root.id, ...internalNodes.map((node) => node.id)]);

				for (const internalNode of internalNodes) {
					console.groupCollapsed(`>> [${internalNode.id}] ${internalNode.data.label}`);

					// --- REMOVE INTERNAL NODE ---
					console.log(`Removing internal node: ${internalNode.id}`);
					graph.removeNode(internalNode.id);

					inboundReactiveEdgeProcessor(graph, internalNode, root, internalNodeIds);
					outboundReactiveEdgeProcessor(graph, internalNode, root, internalNodeIds);

					inboundOwnershipEdgeProcessor(graph, internalNode, root, internalNodeIds);
					outboundOwnershipEdgeProcessor(graph, internalNode, root, internalNodeIds);

					inboundParentToChildEdgeProcessor(graph, internalNode, root, internalNodeIds);
					outboundParentToChildEdgeProcessor(graph, internalNode, root, internalNodeIds);

					inboundFactoryOwnershipEdgeProcessor(graph, internalNode, root, internalNodeIds);
					outboundFactoryOwnershipEdgeProcessor(graph, internalNode, root, internalNodeIds);

					/*// --- INBOUND REACTIVE ---
					const incomingReactiveEdges = graph
						.listEdgesTo(internalNode.id, (edge) => isReactiveEdge(edge))
						.filter((edge) => !internalNodeIds.has(edge.source));

					console.log('incoming reactive edges', incomingReactiveEdges);

					for (const incomingReactiveEdge of incomingReactiveEdges) {
						console.group(`Replacing incoming reactive edge: ${incomingReactiveEdge.id}`);
						console.log('replacing incoming reactive edge', incomingReactiveEdge);

						// graph.removeEdgeById(incomingReactiveEdge.id);
						graph.addEdge(
							factories.inboundReactive({
								id: incomingReactiveEdge.id + ' [folded]',
								edge: incomingReactiveEdge,
								root: root,
								extras: (created) => {
									created.label = incomingReactiveEdge.label;
									created.style = { ...incomingReactiveEdge.style };
									created.data.relatedNodes.collapsed = [
										...(incomingReactiveEdge.data.relatedNodes.collapsed ?? []),
										incomingReactiveEdge.data.relatedNodes.target,
									];
								},
							}),
						);
						console.log('Edge added with id:', incomingReactiveEdge.id + ' [folded]');
						console.groupEnd();
					}

					// --- OUTBOUND REACTIVE ---

					const outgoingReactiveEdges = graph
						.listEdgesFrom(internalNode.id, (edge) => isReactiveEdge(edge))
						.filter((edge) => !internalNodeIds.has(edge.target));

					console.log('outgoing reactive edges', outgoingReactiveEdges);

					for (const outgoingReactiveEdge of outgoingReactiveEdges) {
						console.group(`Replacing outgoing reactive edge: ${outgoingReactiveEdge.id}`);
						console.log('replacing outgoing reactive edge', outgoingReactiveEdge);

						// graph.removeEdgeById(outgoingReactiveEdge.id);
						graph.addEdge(
							factories.outboundReactive({
								id: outgoingReactiveEdge.id + ' [folded]',
								edge: outgoingReactiveEdge,
								root: root,
								extras: (created) => {
									created.label = outgoingReactiveEdge.label;
									created.style = { ...outgoingReactiveEdge.style };
									created.data.relatedNodes.collapsed = [
										...(outgoingReactiveEdge.data.relatedNodes.collapsed ?? []),
										outgoingReactiveEdge.data.relatedNodes.source,
									];
								},
							}),
						);
						console.log('Edge added with id:', outgoingReactiveEdge.id + ' [folded]');
						console.groupEnd();
					}

					// --- INBOUND OWNERSHIP ---

					const incomingOwnershipEdges = graph
						.listEdgesTo(internalNode.id, (edge) => isSourceEdge(edge))
						.filter((edge) => !internalNodeIds.has(edge.source));

					console.log('incoming ownership edges', incomingOwnershipEdges);

					for (const incomingOwnershipEdge of incomingOwnershipEdges) {
						console.group(`Replacing incoming ownership edge: ${incomingOwnershipEdge.id}`);
						console.log('replacing incoming ownership edge', incomingOwnershipEdge);

						// graph.removeEdgeById(incomingOwnershipEdge.id);
						graph.addEdge(
							factories.inboundSource({
								id: incomingOwnershipEdge.id + ' [folded]',
								edge: incomingOwnershipEdge,
								root: root,
								extras: (created) => {
									created.label = incomingOwnershipEdge.label;
									created.style = { ...incomingOwnershipEdge.style };
									created.data.relatedNodes.collapsed = [
										...(incomingOwnershipEdge.data.relatedNodes.collapsed ?? []),
										incomingOwnershipEdge.data.relatedNodes.target,
									];
								},
							}),
						);
						console.log('Edge added with id:', incomingOwnershipEdge.id + ' [folded]');
						console.groupEnd();
					}

					// --- OUTBOUND OWNERSHIP ---

					const outgoingOwnershipEdges = graph
						.listEdgesFrom(internalNode.id, (edge) => isSourceEdge(edge))
						.filter((edge) => !internalNodeIds.has(edge.target));

					console.log('outgoing ownership edges', outgoingOwnershipEdges);

					for (const outgoingOwnershipEdge of outgoingOwnershipEdges) {
						console.group(`Replacing outgoing ownership edge: ${outgoingOwnershipEdge.id}`);
						console.log('replacing outgoing ownership edge', outgoingOwnershipEdge);

						// graph.removeEdgeById(outgoingOwnershipEdge.id);
						graph.addEdge(
							factories.outboundSource({
								id: outgoingOwnershipEdge.id + ' [folded]',
								edge: outgoingOwnershipEdge,
								root: root,
								extras: (created) => {
									created.label = outgoingOwnershipEdge.label;
									created.style = { ...outgoingOwnershipEdge.style };
									created.data.relatedNodes.collapsed = [
										...(outgoingOwnershipEdge.data.relatedNodes.collapsed ?? []),
										outgoingOwnershipEdge.data.relatedNodes.source,
									];
								},
							}),
						);
						console.log('Edge added with id:', outgoingOwnershipEdge.id + ' [folded]');
						console.groupEnd();
					}*/

					console.groupEnd();
				}

				extras?.(root);

				if (!skipMarkAsFolded) {
					root.data[Symbol.for('folded')] = true;
				}

				console.groupEnd();
			}

			console.groupEnd();
		},
	};
}

interface EdgeProcessorFactoryOptions<T extends MyEdge> {
	direction: 'inbound' | 'outbound';
	edgeFilter: (edge: MyEdge) => edge is T;
	edgeCreator: EdgeCreator<T>;
	updateRelatedNodes: (created: T, original: T) => void;
}

const edgeProcessorFactory = <T extends MyEdge>({
	direction,
	edgeFilter,
	edgeCreator,
	updateRelatedNodes,
}: EdgeProcessorFactoryOptions<T>) => {
	return (graph: BufferedGraph, internalNode: EffectorNode, root: EffectorNode, internalNodeIds: Set<string>) => {
		const edgeSelector = direction === 'inbound' ? graph.listEdgesTo.bind(graph) : graph.listEdgesFrom.bind(graph);
		const edges = edgeSelector(
			internalNode.id,
			(edge): edge is T =>
				edgeFilter(edge) && !internalNodeIds.has(direction === 'inbound' ? edge.source : edge.target),
		);

		for (const edge of edges) {
			const newEdge = edgeCreator({
				id: edge.id + ' [folded]',
				edge,
				root,
				extras: (created: any) => {
					created.label = edge.label;
					created.style = { ...edge.style };
					updateRelatedNodes(created, edge);
				},
			});

			graph.addEdge(newEdge);
			console.log(`Edge added with id: ${newEdge.id}`);
		}
	};
};
