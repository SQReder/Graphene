import { createReactiveEdge, createSourceEdge } from '../../edge-factories';
import { isDeclarationNode, isRegularNode } from '../../lib';
import type { DeclarationEffectorNode, EffectorGraph, EffectorNode, MyEdge, RegularEffectorNode } from '../../types';
import { makeGraphLookups } from './lib';
import type { NamedGraphCleaner } from './types';

export const ShadowClones: NamedGraphCleaner = {
	name: 'Shadow Clones',
	apply: (graph: EffectorGraph) => {
		const nodesToAdd: EffectorNode[] = [];

		const edgesToAdd: MyEdge[] = [];
		const edgesToRemove: MyEdge[] = [];

		const lookups = makeGraphLookups(graph);

		// find nodes with too many edges (>10)
		const nodesWithTooManyEdges = lookups.nodes.values().filter((node) => {
			const reactiveEdges = lookups.edgesBySource.reactive.get(node.id) ?? [];
			const ownershipEdges = lookups.edgesBySource.source.get(node.id) ?? [];

			if (reactiveEdges.length > 10 || ownershipEdges.length > 10) {
				console.groupCollapsed(`node ${node.data.label} has too many edges`);

				console.log(
					'reactive',
					reactiveEdges.map((edge) => edge.data.relatedNodes.source),
				);
				console.log(
					'ownership',
					ownershipEdges.map((edge) => edge.data.relatedNodes.source),
				);

				console.groupEnd();

				return true;
			}

			return false;
		});
		console.group('👓 nodes with too many edges');

		for (const node of nodesWithTooManyEdges) {
			const reactiveEdges = lookups.edgesBySource.reactive.get(node.id) ?? [];
			const ownershipEdges = lookups.edgesBySource.source.get(node.id) ?? [];
			console.log(node.data.label, node.id, {
				rx: reactiveEdges.length,
				owns: ownershipEdges.length,
			});

			// group reactive and ownership edges by target

			const groups: Array<{ target: string; reactive: MyEdge[]; ownership: MyEdge[] }> = [];

			for (const edge of reactiveEdges) {
				const group = groups.find((group) =>
					group.reactive.some((e) => e.data.relatedNodes.target === edge.data.relatedNodes.target),
				);
				if (group) {
					group.reactive.push(edge);
				} else {
					groups.push({ target: edge.target, reactive: [edge], ownership: [] });
				}
			}

			for (const edge of ownershipEdges) {
				const group = groups.find((group) =>
					group.ownership.some((e) => e.data.relatedNodes.target === edge.data.relatedNodes.target),
				);
				if (group) {
					group.ownership.push(edge);
				} else {
					groups.push({ target: edge.target, reactive: [], ownership: [edge] });
				}
			}

			// log grouping results
			for (const group of groups) {
				console.log('group', group);
			}

			// create shadow clone of original source node and make edges with if for each edge group

			for (let i = 0; i < groups.length; i++) {
				const group = groups[i];
				if (!group) continue;

				let shadowClone: EffectorNode;

				if (isRegularNode(node)) {
					shadowClone = {
						...node,
						id: `${node.id}[${i}]`,
						data: {
							...node.data,
							shadowClone: true,
						},
					} satisfies RegularEffectorNode;
				} else if (isDeclarationNode(node)) {
					shadowClone = {
						...node,
						id: `${node.id}[${i}]`,
						data: {
							...node.data,
							shadowClone: true,
						},
					} satisfies DeclarationEffectorNode;
				} else {
					console.warn('Not supported', node);
					continue;
				}

				nodesToAdd.push(shadowClone);

				for (const edge of group.reactive) {
					edgesToAdd.push(
						createReactiveEdge({
							id: `${shadowClone.id} --> ${edge.target} (clone of "${edge.id}")`,
							source: shadowClone,
							target: edge.data.relatedNodes.target,
						}),
					);
					edgesToRemove.push(edge);
				}

				for (const edge of group.ownership) {
					edgesToAdd.push(
						createSourceEdge({
							id: `${shadowClone.id} owns ${edge.target} (clone of "${edge.id}")`,
							source: shadowClone,
							target: edge.data.relatedNodes.target,
						}),
					);
					edgesToRemove.push(edge);
				}
			}
		}

		console.groupEnd();

		return {
			nodes: graph.nodes.concat(nodesToAdd),
			edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(edgesToAdd),
		};
	},
};
