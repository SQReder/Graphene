import { getEdgesBy, isRegularNode, Lookups, shallowCopyGraph } from '../../../lib';
import { EffectorGraph, MyEdge, OpType, OwnershipEdge } from '../../../types';
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
			node.data.effector.meta.method === 'debounce',
	);

	console.log('mainOwners', mainOwners);

	const lookups: Lookups = {
		edgesBySource: getEdgesBy(graph.edges, 'source'),
		edgesByTarget: getEdgesBy(graph.edges, 'target'),
		nodes: new Map(graph.nodes.map((node) => [node.id, node])),
	};

	mainOwners.forEach((mainOwner) => {
		console.group(`🌳 debounce ${mainOwner.id}`);

		const ownershipEdges = lookups.edgesBySource.ownership.get(mainOwner.id);

		console.log('ownershipEdges', ownershipEdges);

		const internalNodes = ownershipEdges?.map((edge) => edge.data.relatedNodes.target);

		if (!internalNodes) {
			console.warn('owned nodes not defined for', mainOwner.id);
			return;
		}

		internalNodes.forEach((internalNode) => {
			lookups.edgesBySource.ownership.get(internalNode.id)?.forEach((edge) => edgesToRemove.push(edge));
			lookups.edgesByTarget.ownership.get(internalNode.id)?.forEach((edge) => edgesToRemove.push(edge));
		});

		console.log('internalNodes', internalNodes);

		// region input nodes

		const inputNodes = internalNodes?.filter(
			(node) =>
				isRegularNode(node) &&
				node.data.effector.meta.op === OpType.Store &&
				node.data.effector.meta.name === '$payload',
		);

		console.log('inputNodes', inputNodes);

		if (!inputNodes.length) {
			console.warn('no input nodes found', internalNodes);
			return;
		}

		const relatedNodeIds = [mainOwner.id, ...internalNodes.map((node) => node.id)];

		console.log(
			'relatedNodeIds',
			relatedNodeIds.sort((a, b) => Number(a) - Number(b)),
		);

		new Set(inputNodes).forEach((inputNode) => {
			const externalInboundEdgesOfInputNode = lookups.edgesByTarget.ownership
				.get(inputNode.id)
				?.filter((edge) => !relatedNodeIds.includes(edge.source));

			console.log('externalInboundEdgesOfInputNode', externalInboundEdgesOfInputNode);

			externalInboundEdgesOfInputNode?.forEach((edge) => {
				const id = `${edge.source} owns ${mainOwner.id} (foldByShape)`;

				console.log('➕', id);
				edgesToAdd.push({
					id: id,
					source: edge.source,
					target: mainOwner.id,
					data: {
						edgeType: 'ownership',
						relatedNodes: {
							source: inputNode,
							target: mainOwner,
						},
					},
				} satisfies OwnershipEdge);
			});
		});

		// endregion

		//region output nodes
		const outputNodes = internalNodes.filter(
			(node) =>
				isRegularNode(node) && node.data.effector.meta.op === OpType.Event && node.data.effector.meta.name === 'tick',
		);

		console.log('outputNodes', outputNodes);

		new Set(outputNodes).forEach((outputNode) => {
			const externalOutboundEdgesOfOutputNode = lookups.edgesBySource.ownership
				.get(outputNode.id)
				?.filter((edge) => !relatedNodeIds.includes(edge.target));

			console.log('externalOutboundEdgesOfOutputNode', externalOutboundEdgesOfOutputNode);

			externalOutboundEdgesOfOutputNode?.forEach((edge) => {
				edgesToAdd.push({
					id: `${mainOwner.id} owns ${edge.target} (foldByShape)`,
					source: mainOwner.id,
					target: edge.target,
					data: {
						edgeType: 'ownership',
						relatedNodes: {
							source: outputNode,
							target: mainOwner,
						},
					},
				} satisfies OwnershipEdge);
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
