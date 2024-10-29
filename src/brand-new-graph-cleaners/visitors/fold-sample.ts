import type { Comparator } from '../../comparison';
import { createReactiveEdge, createSourceEdge } from '../../edge-factories';
import { isReactiveEdge, isRegularNode, isSourceEdge } from '../../lib';
import { type EffectorNode, type MyEdge, OpType } from '../../types';
import type { NamedGraphVisitor } from '../types';

const collator = new Intl.Collator('ru', { numeric: true });
const byTargetId: Comparator<MyEdge> = (a, b) =>
	collator.compare(a.data.relatedNodes.target.id, b.data.relatedNodes.target.id);

export const foldSampleJoints: NamedGraphVisitor = {
	name: 'Fold Sample Joints',
	visit: async (graph) => {
		for (const node of graph.nodes.filter(isRegularNode)) {
			const outgoingReactiveEdges = graph.listEdgesFrom(node.id);
			if (!outgoingReactiveEdges.length) continue;

			const edgesToSample = outgoingReactiveEdges
				.filter((e) => e.data.relatedNodes.target.data.effector?.meta?.isSample)
				.sort(byTargetId);

			if (!edgesToSample.length) continue;

			console.groupCollapsed(`node ${node.id} ${node.data.label}`);

			console.log('edgesToSample', edgesToSample);

			let whileIterations = 0;
			while (edgesToSample.length) {
				whileIterations++;
				if (whileIterations > edgesToSample.length) {
					console.error('whileIterations is greater than edgesToSample.length');
					break;
				}
				// find index of first joint node, then splice from start to this index including joint node
				const index = edgesToSample.findIndex(
					(e) => e.data.relatedNodes.target.data.effector?.meta?.asSample?.joint === 1,
				);
				if (index === -1) break;
				const slice = edgesToSample.splice(0, index + 1);

				console.debug(`foldSampleJoints: spliced ${index + 1} edges from node ${node.id}`);
				console.log('slice', slice);

				const samples = slice.map((e) => e.data.relatedNodes.target);

				const samplesTargetEdges = samples.map((s) => graph.listEdgesFrom(s.id));

				let jointSampleTarget: EffectorNode | undefined = undefined;
				let differentTargetsError = false;

				for (const sampleTargetEdges of samplesTargetEdges) {
					if (!sampleTargetEdges.length) {
						console.warn('no targets for sibling samples', sampleTargetEdges);
					}

					if (jointSampleTarget == null) {
						jointSampleTarget = sampleTargetEdges[0]!.data.relatedNodes.target;
					} else {
						if (jointSampleTarget.id !== sampleTargetEdges[0]!.data.relatedNodes.target.id) {
							console.warn('different targets for sibling samples', sampleTargetEdges);
							differentTargetsError = true;
						}
					}
				}

				if (differentTargetsError) {
					continue;
				}

				if (!jointSampleTarget) {
					console.warn('no jointSampleTarget');
					continue;
				}

				console.log('jointSampleTarget', jointSampleTarget);

				for (const sample of samples) {
					if (sample.data.effector?.meta?.asSample?.joint !== 1) {
						console.log('removing non joint sample', sample);
						graph.removeNode(sample.id);
					}
				}
			}

			console.groupEnd();
		}
	},
};

export const foldSample: NamedGraphVisitor = {
	name: 'Fold Sample',
	visit: async (graph) => {
		for (const sample of graph.nodesByOp(OpType.Sample)) {
			const incomingReactive = graph.listEdgesTo(sample.id, isReactiveEdge);
			if (incomingReactive.length <= 1) {
				const clockLink = incomingReactive[0];
				if (clockLink) {
					const mergeEvent = clockLink.data.relatedNodes.source;

					if (!(!isRegularNode(mergeEvent) || !mergeEvent.data.effector.isMergeEvent)) {
						graph.removeNode(mergeEvent.id);
						if (mergeEvent.data.effector?.isMergeEvent) {
							for (const mergeEventIncoming of graph.listEdgesTo(mergeEvent.id, isReactiveEdge)) {
								graph.addEdge(
									createReactiveEdge({
										id: mergeEventIncoming.id + ' merged to ' + sample.id,
										source: mergeEventIncoming.data.relatedNodes.source,
										target: sample,
										extras: (extras) => {
											extras.data.relatedNodes = {
												...extras.data.relatedNodes,
												collapsed: [mergeEvent],
											};
											extras.label = mergeEventIncoming.label;
											extras.style = mergeEventIncoming.style;
										},
									}),
								);
							}
						}
					} else {
						console.warn('Sample node incoming reactive edge is not a merge event', sample, clockLink);
					}
				}
			} else {
				console.warn('Sample node has too many incoming reactive edges', sample, incomingReactive);
			}

			const incomingSource = graph.listEdgesTo(sample.id, isSourceEdge);
			if (incomingSource.length <= 1) {
				const sourceLink = incomingSource[0];
				if (sourceLink) {
					const sourceStore = sourceLink.data.relatedNodes.source;

					if (!(!isRegularNode(sourceStore) || !sourceStore.data.effector.isCombinedStore)) {
						console.log('Fold sample', sample, sourceLink);
						for (const sourceNodeIncoming of graph.listEdgesTo(sourceStore.id, isReactiveEdge)) {
							graph.removeNode(sourceStore.id);
							graph.addEdge(
								createSourceEdge({
									id: sourceNodeIncoming.id + ' merged to ' + sample.id,
									source: sourceNodeIncoming.data.relatedNodes.source,
									target: sample,
									extras: (extras) => {
										extras.data.relatedNodes = {
											...extras.data.relatedNodes,
											collapsed: [sourceStore],
										};
										extras.label = sourceNodeIncoming.label;
										extras.style = sourceLink.style;
									},
								}),
							);
						}
					} else {
						console.warn('Sample node incoming source edge is not a regular node', sample, sourceLink);
					}
				}
			} else {
				console.warn('Sample node has too many incoming source edges', sample, incomingSource);
			}
		}
	},
};
