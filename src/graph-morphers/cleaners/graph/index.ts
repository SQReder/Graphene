import { MarkerType } from '@xyflow/system';
import { getEdgesBy, isRegularNode, Lookups, shallowCopyGraph } from '../../../lib';
import { EdgeType, EffectorGraph, MyEdge, OwnershipEdge, ReactiveEdge } from '../../../types';
import { GraphCleaner } from '../types';
import { foldEffects } from './cleaners';
import { removeUnlinkedNodes } from './removeUnlinkedNodes';

const foldByShape: GraphCleaner = (graph) => {
	console.group('🫨 fold by shape');

	const edgesToAdd: MyEdge[] = [];
	const edgesToRemove: MyEdge[] = [];

	const mainOwners = graph.nodes.filter(
		(node) =>
			isRegularNode(node) &&
			node.data.effector.meta.op === undefined &&
			node.data.effector.meta.type === 'factory' &&
			['debounce', 'readonly'].includes(node.data.effector.meta.method),
	);

	console.log('mainOwners', mainOwners);

	const lookups: Lookups = {
		edgesBySource: getEdgesBy(graph.edges, 'source'),
		edgesByTarget: getEdgesBy(graph.edges, 'target'),
		nodes: new Map(graph.nodes.map((node) => [node.id, node])),
	};

	mainOwners.forEach((mainOwner) => {
		console.groupCollapsed(`🌳 debounce ${mainOwner.id}`);

		const ownershipEdges = lookups.edgesBySource.ownership.get(mainOwner.id);

		console.log('ownershipEdges', ownershipEdges);

		const internalNodes = ownershipEdges?.map((edge) => edge.data.relatedNodes.target);

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

		const inputNodes = internalNodes?.filter(
			(node) => isRegularNode(node) /*&&
				node.data.effector.meta.name === '$payload'*/,
		);

		console.log('inputNodes', inputNodes);

		if (!inputNodes.length) {
			console.warn('no input nodes found', internalNodes);
			console.groupEnd();
			return;
		}

		const relatedNodeIds = [mainOwner.id, ...internalNodes.map((node) => node.id)];

		console.log(
			'relatedNodeIds',
			relatedNodeIds.sort((a, b) => Number(a) - Number(b)),
		);

		new Set(inputNodes).forEach((inputNode) => {
			const externalInboundOwnershipEdgesOfInputNode = lookups.edgesByTarget.ownership
				.get(inputNode.id)
				?.filter((edge) => !relatedNodeIds.includes(edge.source));

			console.log(
				'externalInboundOwnershipEdgesOfInputNode of',
				inputNode.id,
				externalInboundOwnershipEdgesOfInputNode,
			);

			externalInboundOwnershipEdgesOfInputNode?.forEach((edge) => {
				const id = `${edge.source} owns ${mainOwner.id} (in foldByShape)`;

				if (!edgesToAdd.some((edge) => edge.id === id)) {
					edgesToAdd.push({
						id: id,
						source: edge.source,
						target: mainOwner.id,
						data: {
							edgeType: EdgeType.Ownership,
							relatedNodes: {
								source: inputNode,
								target: mainOwner,
							},
						},
						style: {
							stroke: 'rgba(132,215,253,0.7)',
						},
					} satisfies OwnershipEdge);
				}
			});

			const externalInboundReactiveEdgesOfInputNode = lookups.edgesByTarget.reactive
				.get(inputNode.id)
				?.filter((edge) => !relatedNodeIds.includes(edge.source));

			console.log('externalInboundReactiveEdgesOfInputNode of', inputNode.id, externalInboundReactiveEdgesOfInputNode);

			externalInboundReactiveEdgesOfInputNode?.forEach((edge) => {
				const id = `${edge.source} --> ${mainOwner.id} (in foldByShape)`;

				if (!edgesToAdd.some((edge) => edge.id === id)) {
					edgesToAdd.push({
						id: id,
						source: edge.source,
						target: mainOwner.id,
						data: {
							edgeType: EdgeType.Reactive,
							relatedNodes: {
								source: inputNode,
								target: mainOwner,
							},
						},
						animated: true,
						markerEnd: {
							type: MarkerType.ArrowClosed,
						},
						style: {
							zIndex: 10,
						},
					} satisfies ReactiveEdge);
				}
			});
		});

		// endregion

		//region output nodes
		const outputNodes = internalNodes.filter((node) => isRegularNode(node));

		console.log('outputNodes', outputNodes);

		new Set(outputNodes).forEach((outputNode) => {
			const externalOutboundEdgesOfOutputNode = lookups.edgesBySource.ownership
				.get(outputNode.id)
				?.filter((edge) => !relatedNodeIds.includes(edge.target));

			console.log('externalOutboundEdgesOfOutputNode', externalOutboundEdgesOfOutputNode);

			externalOutboundEdgesOfOutputNode?.forEach((edge) => {
				const id = `${mainOwner.id} owns ${edge.target} (out foldByShape)`;
				if (!edgesToAdd.some((edge) => edge.id === id)) {
					edgesToAdd.push({
						id: id,
						source: mainOwner.id,
						target: edge.target,
						data: {
							edgeType: EdgeType.Ownership,
							relatedNodes: {
								source: outputNode,
								target: mainOwner,
							},
						},
						style: {
							stroke: 'rgba(132,215,253,0.7)',
						},
					} satisfies OwnershipEdge);
				}
			});

			const externalOutboundReactiveEdgesOfOutputNode = lookups.edgesBySource.reactive
				.get(outputNode.id)
				?.filter((edge) => !relatedNodeIds.includes(edge.target));

			console.log('externalOutboundReactiveEdgesOfOutputNode', externalOutboundReactiveEdgesOfOutputNode);

			externalOutboundReactiveEdgesOfOutputNode?.forEach((edge) => {
				const id = `${mainOwner.id} --> ${edge.target} (out foldByShape)`;
				if (!edgesToAdd.some((edge) => edge.id === id)) {
					edgesToAdd.push({
						id: id,
						source: mainOwner.id,
						target: edge.target,
						data: {
							edgeType: EdgeType.Reactive,
							relatedNodes: {
								source: outputNode,
								target: mainOwner,
							},
						},
						animated: true,
						style: {
							zIndex: 10,
						},
					} satisfies ReactiveEdge);
				}
			});
		});

		//endregion

		console.groupEnd();
	});

	console.groupEnd();
	return {
		nodes: graph.nodes,
		edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd),
	};
};

export const cleanGraph: GraphCleaner = (graph: EffectorGraph) => {
	return [foldEffects, foldByShape, removeUnlinkedNodes].reduce(
		(graph, cleaner) => cleaner(graph),
		shallowCopyGraph(graph),
	);
};
