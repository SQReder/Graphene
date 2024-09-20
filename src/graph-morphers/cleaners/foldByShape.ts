import { createOwnershipEdge, createReactiveEdge } from '../../edge-factories';
import type { Lookups } from '../../lib';
import { getEdgesBy, isRegularNode } from '../../lib';
import type { EffectorNode, MyEdge, OwnershipEdge, ReactiveEdge } from '../../types';
import type { NamedGraphCleaner } from './types';

export type RootSelector = (node: EffectorNode) => boolean;

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
	inboundOwnership: EdgeCreator<OwnershipEdge>;
	inboundReactive: EdgeCreator<ReactiveEdge>;
	outboundOwnership: EdgeCreator<OwnershipEdge>;
	outboundReactive: EdgeCreator<ReactiveEdge>;
};

const defaultEdgeFactories: EdgeFactories = {
	inboundOwnership: ({ id, edge, root, extras }) =>
		createOwnershipEdge({ id, source: edge.data.relatedNodes.source, target: root, extras }),
	inboundReactive: ({ id, edge, root, extras }) =>
		createReactiveEdge({ id, source: edge.data.relatedNodes.source, target: root, extras }),
	outboundOwnership: ({ id, edge, root, extras }) =>
		createOwnershipEdge({ id, source: root, target: edge.data.relatedNodes.target, extras }),
	outboundReactive: ({ id, edge, root, extras }) =>
		createReactiveEdge({ id, source: root, target: edge.data.relatedNodes.target, extras }),
};

export const foldByShape = (
	friendlyName: string,
	rootSelector: RootSelector,
	factories_: Partial<EdgeFactories> = {},
	internalNodeNames: string[] = [],
): NamedGraphCleaner => {
	const factories: EdgeFactories = {
		...defaultEdgeFactories,
		...factories_,
	};

	return {
		name: `Fold By Shape [${friendlyName}]`,
		apply: (graph) => {
			console.group('🫨 fold by shape');

			const edgesToAdd: MyEdge[] = [];
			const edgesToRemove: MyEdge[] = [];

			const mainOwners = graph.nodes.filter(rootSelector);

			console.log('mainOwners', mainOwners);

			const lookups: Lookups = {
				edgesBySource: getEdgesBy(graph.edges, 'source'),
				edgesByTarget: getEdgesBy(graph.edges, 'target'),
				nodes: new Map(graph.nodes.map((node) => [node.id, node])),
			};

			mainOwners.forEach((mainOwner) => {
				console.groupCollapsed(`🌳 [${mainOwner.id}] ${mainOwner.data.label}`);

				const ownershipEdges = lookups.edgesBySource.ownership.get(mainOwner.id);

				console.log('ownershipEdges', ownershipEdges);

				const internalNodes = ownershipEdges
					?.map((edge) => edge.data.relatedNodes.target)
					?.filter(isRegularNode)
					?.filter((node) => {
						if (!internalNodeNames.length) return true;
						return node.data.effector.name && internalNodeNames.includes(node.data.effector.name);
					});

				if (!internalNodes) {
					console.warn('owned nodes not defined for', mainOwner.id);
					console.groupEnd();
					return;
				}

				internalNodes.forEach((internalNode) => {
					lookups.edgesBySource.ownership.get(internalNode.id)?.forEach((edge) => edgesToRemove.push(edge));
					lookups.edgesByTarget.ownership.get(internalNode.id)?.forEach((edge) => edgesToRemove.push(edge));
					lookups.edgesBySource.reactive.get(internalNode.id)?.forEach((edge) => edgesToRemove.push(edge));
					lookups.edgesByTarget.reactive.get(internalNode.id)?.forEach((edge) => edgesToRemove.push(edge));
				});

				console.log('internalNodes', internalNodes);

				// region input nodes

				console.log('inputNodes', internalNodes);

				if (!internalNodes.length) {
					console.warn('no input nodes found', internalNodes);
					console.groupEnd();
					return;
				}

				mainOwner.data.folded = true;

				const relatedNodeIds = [mainOwner.id, ...internalNodes.map((node) => node.id)];

				console.log(
					'relatedNodeIds',
					relatedNodeIds.sort((a, b) => Number(a) - Number(b)),
				);

				console.group('input nodes');

				for (const internalNode of new Set(internalNodes)) {
					console.group(`[${internalNode.id}] ${internalNode.data.label}`);
					console.group('ownership');

					const externalInboundOwnershipEdgesOfInputNode = lookups.edgesByTarget.ownership
						.get(internalNode.id)
						?.filter((edge) => !relatedNodeIds.includes(edge.source));

					console.log('externalInboundOwnershipEdgesOfInputNode of', externalInboundOwnershipEdgesOfInputNode);

					externalInboundOwnershipEdgesOfInputNode?.forEach((edge) => {
						const id = `${edge.source} owns ${mainOwner.id} (in foldByShape)`;

						// if (id.startsWith('665 owns 612')) debugger;

						if (!edgesToAdd.some((edge) => edge.id === id)) {
							console.log('add', id, edge);
							edgesToAdd.push(
								factories.inboundOwnership({
									id,
									edge,
									root: mainOwner,
									extras: (created) => {
										created.label = edge.label;
									},
								}),
							);
						}
					});

					console.groupEnd();

					console.group('reactive');

					const externalInboundReactiveEdgesOfInputNode = lookups.edgesByTarget.reactive
						.get(internalNode.id)
						?.filter((edge) => !relatedNodeIds.includes(edge.source));

					console.log(
						'externalInboundReactiveEdgesOfInputNode of',
						`"[${internalNode.id}] ${internalNode.data.label}"`,

						externalInboundReactiveEdgesOfInputNode,
					);

					externalInboundReactiveEdgesOfInputNode?.forEach((edge) => {
						const id = `${edge.source} --> ${mainOwner.id} (in foldByShape)`;

						// if (id.startsWith('665 --> 612')) debugger;

						if (!edgesToAdd.some((edge) => edge.id === id)) {
							console.log('add', id, edge);
							edgesToAdd.push(
								factories.inboundReactive({
									id,
									edge,
									root: mainOwner,
									extras: (created) => {
										created.label = edge.label;
									},
								}),
							);
						}
					});

					console.groupEnd();
					console.groupEnd();
				}

				console.groupEnd();

				// endregion

				//region output nodes

				const outputNodes = internalNodes.filter((node) => isRegularNode(node));

				console.log('outputNodes', outputNodes);

				console.group('output nodes');
				for (const outputNode of new Set(outputNodes)) {
					const externalOutboundEdgesOfOutputNode = lookups.edgesBySource.ownership
						.get(outputNode.id)
						?.filter((edge) => !relatedNodeIds.includes(edge.target));

					console.log('externalOutboundEdgesOfOutputNode', externalOutboundEdgesOfOutputNode);

					externalOutboundEdgesOfOutputNode?.forEach((edge) => {
						const id = `${mainOwner.id} owns ${edge.target} (out foldByShape)`;
						if (!edgesToAdd.some((edge) => edge.id === id)) {
							edgesToAdd.push(
								factories.outboundOwnership({
									id,
									edge,
									root: mainOwner,
									extras: (created) => {
										created.label = edge.label;
									},
								}),
							);
						}
					});

					const externalOutboundReactiveEdgesOfOutputNode = lookups.edgesBySource.reactive
						.get(outputNode.id)
						?.filter((edge) => !relatedNodeIds.includes(edge.target));

					console.log('externalOutboundReactiveEdgesOfOutputNode', externalOutboundReactiveEdgesOfOutputNode);

					externalOutboundReactiveEdgesOfOutputNode?.forEach((edge) => {
						const id = `${mainOwner.id} --> ${edge.target} (out foldByShape)`;
						if (!edgesToAdd.some((edge) => edge.id === id)) {
							edgesToAdd.push(
								factories.outboundReactive({
									id,
									edge,
									root: mainOwner,
									extras: (created) => {
										created.label = edge.label;
									},
								}),
							);
						}
					});
				}
				console.groupEnd();

				//endregion

				console.groupEnd();
			});

			console.groupEnd();
			return {
				nodes: graph.nodes,
				edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd),
			};
		},
	};
};
