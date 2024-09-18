import { is } from 'effector';
import { createOwnershipEdge, createReactiveEdge } from '../../edge-factories';
import { findNodesByOpType } from '../../lib';
import type { Graphite, MyEdge } from '../../types';
import { EdgeType, OpType } from '../../types';
import type { EnricherImpl } from './types';

export const attachedEffectEnricher: EnricherImpl = (graph, lookups, edgesType) => {
	const fxNodes = findNodesByOpType(OpType.Effect, graph.nodes);

	const edgesToAdd: MyEdge[] = [];

	console.debug('fxNodes', fxNodes);

	for (const fxNode of fxNodes) {
		if (fxNode.data.effector.graphite.meta.op !== OpType.Effect) {
			console.warn('Unexpected op type', fxNode.data.effector.graphite.meta.op);
			continue;
		}

		// @ts-expect-error ToDo can be shorter
		const handler = fxNode.data.effector.graphite.scope.runner.scope.handler;

		if (!handler) {
			console.debug('Empty handler', fxNode.data.effector.graphite.scope);
			continue;
		}

		const isEffect = is.effect(handler);

		if (!isEffect) {
			console.debug('Function handler', handler);
			continue;
		}

		// @ts-ignore
		const graphite = handler.graphite as Graphite;
		const targetId = graphite.id;

		const target = lookups.nodes.get(targetId);

		if (!target) {
			console.warn('No target', targetId);
			continue;
		}

		const edgesFromFx = lookups.edgesBySource.ownership.get(fxNode.id);

		console.debug('edgesFromFx', edgesFromFx);

		const some = edgesFromFx?.some((edge) => edge.target === targetId);

		console.debug('some', some);

		console.debug(edgesType, edgesType === EdgeType.Ownership);
		if (!some && edgesType === EdgeType.Ownership) {
			const id = `${fxNode.id} owns ${target.id}`;

			edgesToAdd.push(
				createOwnershipEdge({
					id,
					source: fxNode,
					target: target,
				}),
			);
		}

		if (
			!lookups.edgesBySource.reactive.get(fxNode.id)?.some((edge) => edge.target === targetId) &&
			edgesType === EdgeType.Reactive
		) {
			const id = `${fxNode.id} ==> ${target.id}`;

			edgesToAdd.push(
				createReactiveEdge({
					id,
					source: fxNode,
					target: target,
				}),
			);
		}
	}

	console.debug('added', edgesToAdd, 'ownership and reactive edges');

	return { edgesToAdd };
};
