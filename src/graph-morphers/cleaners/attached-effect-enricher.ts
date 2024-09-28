import { is } from 'effector';
import { createReactiveEdge, createSourceEdge } from '../../edge-factories';
import { findNodesByOpType, isReactiveEdge, isSourceEdge } from '../../lib';
import { pipe } from '../../tiny-fp/pipe';
import { EdgeType, type Graphite, type MyEdge, OpType } from '../../types';
import { makeGraphLookups } from './lib';
import type { GraphCleaner, NamedGraphCleaner } from './types';

const makeAttachedEffectEnricher =
	(edgesType: EdgeType): GraphCleaner =>
	(graph) => {
		const fxNodes = findNodesByOpType(OpType.Effect, graph.nodes);

		const filter: (edge: MyEdge) => edge is MyEdge =
			edgesType === EdgeType.Source
				? isSourceEdge
				: edgesType === EdgeType.Reactive
				? isReactiveEdge
				: (edge: MyEdge): edge is never => {
						throw new Error('not implemented');
				  };

		const lookups = makeGraphLookups(graph, filter);

		const edgesToAdd: MyEdge[] = [];

		console.debug('fxNodes', fxNodes);

		console.groupCollapsed('Process fx nodes');
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

			const edgesFromFx = lookups.edgesBySource.source.get(fxNode.id);

			console.debug('edgesFromFx', edgesFromFx);

			console.debug(edgesType, edgesType === EdgeType.Source);
			if (!edgesFromFx?.some((edge) => edge.target === targetId) && edgesType === EdgeType.Source) {
				const id = `${fxNode.id} owns ${target.id}`;

				edgesToAdd.push(
					createSourceEdge({
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
		console.groupEnd();

		console.debug('added', edgesToAdd, 'ownership and reactive edges');

		return {
			nodes: graph.nodes,
			edges: graph.edges.concat(...edgesToAdd),
		};
	};
export const attachedEffectEnricher: NamedGraphCleaner = {
	name: 'Enrich attached effects',
	apply: (graph) => {
		const reactive = makeAttachedEffectEnricher(EdgeType.Reactive);
		const ownership = makeAttachedEffectEnricher(EdgeType.Source);

		return pipe(graph, reactive, ownership);
	},
};
