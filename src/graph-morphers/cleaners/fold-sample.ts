import { createReactiveEdge, createSourceEdge } from '../../edge-factories';
import { findNodesByOpTypeWithRelatedTypedEdgesGenerator, isRegularNode, type Lookups } from '../../lib';
import { type MyEdge, OpType, type ReactiveEdge, type RegularEffectorNode, type SourceEdge } from '../../types';
import { makeGraphLookups } from './lib';
import type { NamedGraphCleaner } from './types';

function processClock(incomingReactiveEdge: ReactiveEdge, lookups: Lookups, sampleNode: RegularEffectorNode) {
	const edgesToAdd: MyEdge[] = [];
	const edgesToRemove: MyEdge[] = [];

	const singleIncomingReactiveSource = incomingReactiveEdge.data.relatedNodes.source as RegularEffectorNode;
	const isMergeEvent = singleIncomingReactiveSource.data.effector.isMergeEvent;
	if (isMergeEvent) {
		edgesToRemove.push(incomingReactiveEdge);

		const mergeEventIncomingReactiveEdges = lookups.edgesByTarget.reactive.get(singleIncomingReactiveSource.id);
		console.log('merge event incoming reactive edges', mergeEventIncomingReactiveEdges);

		mergeEventIncomingReactiveEdges?.forEach((edge) => {
			edgesToRemove.push(edge);
			edgesToAdd.push(
				createReactiveEdge({
					id: `${edge.source} --> ${sampleNode.id} (from sample fold)`,
					source: edge.data.relatedNodes.source,
					target: sampleNode,
					extras: (extras) => {
						extras.data.relatedNodes.collapsed = [singleIncomingReactiveSource];
						extras.label = edge.label;
						extras.style = edge.style;
					},
				}),
			);
		});
	} else {
		console.info('cannot fold sample because it has non-merge event reactive edge');
	}

	return {
		edgesToAdd,
		edgesToRemove,
	};
}

function processSources(incomingOwnershipEdge: SourceEdge, lookups: Lookups, sampleNode: RegularEffectorNode) {
	const edgesToAdd: MyEdge[] = [];
	const edgesToRemove: MyEdge[] = [];

	const singleIncomingOwnershipSource = incomingOwnershipEdge.data.relatedNodes.source as RegularEffectorNode;
	const combinedStore = singleIncomingOwnershipSource.data.effector.isCombinedStore;

	if (combinedStore) {
		edgesToRemove.push(incomingOwnershipEdge);

		const combineIncomingReactiveEdges = lookups.edgesByTarget.reactive.get(singleIncomingOwnershipSource.id);
		console.log('combine incoming reactive edges', combineIncomingReactiveEdges);

		combineIncomingReactiveEdges?.forEach((edge) => {
			edgesToRemove.push(edge);
			edgesToAdd.push(
				createSourceEdge({
					id: `${edge.source} owns ${sampleNode.id} (from sample fold)`,
					source: edge.data.relatedNodes.source,
					target: sampleNode,
					extras: (extras) => {
						console.log(extras, edge);
						extras.data.relatedNodes.collapsed = [singleIncomingOwnershipSource];
						extras.label = edge.label;
					},
				}),
			);
		});
	} else {
		console.info('cannot fold sample because it has non-combined store ownership edge');
	}

	return {
		edgesToAdd,
		edgesToRemove,
	};
}

export const foldSample: NamedGraphCleaner = {
	name: 'Fold Sample',
	apply: (graph) => {
		/*
		 Steps:
		 1. Find samples
		 2. Find related merge event nodes
		 		2.1. Find related incoming reactive edges
		 		2.2. Rebind merge node sources to sample with reactive edges
		 3. Find related combine nodes
		 		3.1. Find related reactive edges
		 		3.2. Rebind combine node sources to sample with ownership edges
		 */

		const edgesToAdd: MyEdge[] = [];
		const edgesToRemove: MyEdge[] = [];

		const lookups = makeGraphLookups(graph);

		const nodesAndStuff = findNodesByOpTypeWithRelatedTypedEdgesGenerator(OpType.Sample, lookups);

		for (const { node: sampleNode, incoming } of nodesAndStuff) {
			console.groupCollapsed('sample', sampleNode.id);
			console.info('node', sampleNode);

			const incomingReactive = incoming.reactive.filter((edge) => {
				const source = edge.data.relatedNodes.source;
				return isRegularNode(source) && !source.data.effector.isFactory;
			});

			console.info('incomingReactive', incomingReactive);

			const incomingOwnership = incoming.source.filter((edge) => {
				const source = edge.data.relatedNodes.source;
				return isRegularNode(source) && !source.data.effector.isFactory;
			});

			console.info('incomingOwnership', incomingOwnership);

			if (!incomingReactive.length && !incomingOwnership.length) {
				console.warn('no incoming edges');
				console.groupEnd();
				continue;
			}

			if (incomingReactive.length > 1) {
				console.info('cannot fold sample because it has more than one reactive edge');
				console.groupEnd();
				continue;
			}

			if (incomingOwnership.length > 1) {
				console.info('cannot fold sample because it has more than one ownership edge');
				console.groupEnd();
				continue;
			}

			const incomingReactiveEdge = incomingReactive[0];
			const singleIncomingReactiveSource = incomingReactiveEdge?.data.relatedNodes.source;
			console.info('singleIncomingReactiveSource', singleIncomingReactiveSource);

			if (singleIncomingReactiveSource && isRegularNode(singleIncomingReactiveSource)) {
				const result = processClock(incomingReactiveEdge, lookups, sampleNode);

				edgesToAdd.push(...result.edgesToAdd);
				edgesToRemove.push(...result.edgesToRemove);
			}

			const incomingOwnershipEdge = incomingOwnership[0];
			const singleIncomingOwnershipSource = incomingOwnershipEdge?.data.relatedNodes.source;
			console.info('singleIncomingOwnershipSource', singleIncomingOwnershipSource);

			if (singleIncomingOwnershipSource && isRegularNode(singleIncomingOwnershipSource)) {
				const result = processSources(incomingOwnershipEdge, lookups, sampleNode);

				edgesToAdd.push(...result.edgesToAdd);
				edgesToRemove.push(...result.edgesToRemove);
			}

			console.groupEnd();
		}

		return {
			nodes: graph.nodes,
			edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(edgesToAdd),
		};
	},
};
