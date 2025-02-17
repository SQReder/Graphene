import { createFactory, invoke } from '@withease/factories';
import { combine, createEffect, createEvent, sample, type Store, withRegion } from 'effector';
import { persist } from 'effector-storage/local';
import { debug } from 'patronum';
import { abortable, type WithAbortSignal } from '../abortable';
import runPipeline, { newPipeline } from '../brand-new-graph-cleaners/pipeline';
import type { NamedGraphVisitor } from '../brand-new-graph-cleaners/types';
import { sortTreeNodesBFS } from '../dfs';
import { EdgeType } from '../EdgeType';
import { BufferedGraph } from '../graph-manager';
import type { Layouter } from '../layouters/types';
import { absurd, type GraphVariant, isFactoryOwnershipEdge, isParentToChildEdge } from '../lib';
import { logEffectFail } from '../logEffectFail';
import { type EffectorNode, type MyEdge } from '../types';
import { CleanerSelector } from '../ui/CleanerSelector';
import type { GrapheneModel } from './graphene';

type Params = {
	grapheneModel: GrapheneModel;
	layouterFactory: () => Layouter;
	$selectedGraphVariant: Store<GraphVariant>;
	$excludeOwnershipFromLayouting: Store<boolean>;
	$unfoldedNodes: Store<Set<string>>;
};

export const generatedGraphModelFactory = createFactory(
	({
		grapheneModel,
		layouterFactory,
		$selectedGraphVariant,
		$excludeOwnershipFromLayouting,
		$unfoldedNodes,
	}: Params) => {
		const $graph = combine(
			{
				nodes: grapheneModel.$nodes,
				edges: grapheneModel.$edges,
			},
			({ nodes, edges }): BufferedGraph => {
				if (nodes.length === 0) {
					return new BufferedGraph();
				}

				return new BufferedGraph({
					nodes,
					edges,
				});
			},
		);

		const graphCleanerSelector = invoke(CleanerSelector.factory<NamedGraphVisitor>(), {
			availableCleaners: newPipeline,
		});

		const pickupStoredPipeline = createEvent();

		withRegion(graphCleanerSelector.$selectedCleaners, () => {
			persist({
				pickup: pickupStoredPipeline,
				source: graphCleanerSelector.$selectedCleaners,
				target: graphCleanerSelector.selectedCleanersResetted,
				key: 'graphene',
				serialize: (value: NamedGraphVisitor[]) => {
					console.log('serialize', value);
					return JSON.stringify(value.map((x) => x.name));
				},
				deserialize: (value) => {
					console.log('deserialize', value);
					return (JSON.parse(value) as string[])
						.map((name) => newPipeline.find((x) => x.name === name))
						.filter(Boolean);
				},
			});
		});

		const getGraphAbortableFx = createEffect(
			async ({
				graph,
				signal,
				excludeOwnershipFromLayouting,
				unfoldedNodes,
				pipeline,
			}: {
				graph: BufferedGraph;
				excludeOwnershipFromLayouting: boolean;
				unfoldedNodes: Set<string>;
				pipeline: NamedGraphVisitor[];
			} & WithAbortSignal) => {
				const bufferedGraph = graph.clone();

				await runPipeline(bufferedGraph, pipeline, (stage) => {
					console.log(stage.name, stage.percent);
				});

				signal.throwIfAborted();

				const cleanedGraph = bufferedGraph.getGraph();

				const layouter = layouterFactory();

				const linksExcludedFromLayouting: MyEdge[] = [];
				const linksForLayouting: MyEdge[] = [];

				for (const edge of cleanedGraph.edges) {
					if (excludeOwnershipFromLayouting && (isParentToChildEdge(edge) || isFactoryOwnershipEdge(edge))) {
						linksExcludedFromLayouting.push(edge);
					} else {
						linksForLayouting.push(edge);
					}
				}

				// Function to detect and reverse cycles in a graph
				function detectAndReverseCycles(nodes: EffectorNode[], edges: MyEdge[]): MyEdge[] {
					const adjacencyList = new Map<string, string[]>();
					const reversedEdges = new Set<MyEdge>();

					// Build adjacency list
					for (const edge of edges) {
						if (!adjacencyList.has(edge.source)) {
							adjacencyList.set(edge.source, []);
						}
						adjacencyList.get(edge.source)!.push(edge.target);
					}

					// Helper function to detect cycles using DFS
					function dfs(node: string, visited: Set<string>, recStack: Set<string>): boolean {
						if (!visited.has(node)) {
							visited.add(node);
							recStack.add(node);

							for (const neighbor of adjacencyList.get(node) || []) {
								if (!visited.has(neighbor) && dfs(neighbor, visited, recStack)) {
									return true;
								} else if (recStack.has(neighbor)) {
									return true;
								}
							}
						}
						recStack.delete(node);
						return false;
					}

					// Iterate through all edges to detect cycles and reverse if necessary
					for (const edge of edges) {
						const visited = new Set<string>();
						const recStack = new Set<string>();

						// Temporarily remove the edge and check for cycles
						const adjListCopy = adjacencyList.get(edge.source)?.filter((n) => n !== edge.target);
						if (adjListCopy) adjacencyList.set(edge.source, adjListCopy);

						if (dfs(edge.source, visited, recStack)) {
							// If a cycle is detected, reverse the edge
							reversedEdges.add({ ...edge, source: edge.target, target: edge.source, data: edge.data } as MyEdge);
						} else {
							// If no cycle, add the edge back
							adjListCopy?.push(edge.target);
							reversedEdges.add(edge);
						}
					}

					return Array.from(reversedEdges);
				}

				// Detect and reverse cycles in linksForLayouting before layout
				const forwardOnlyEdges = detectAndReverseCycles(cleanedGraph.nodes, linksForLayouting);

				console.log('start layout', linksForLayouting.length, 'edges', cleanedGraph.nodes.length, 'nodes');
				const layoutingId = Math.random().toString(16);
				console.time(`layouting ${layoutingId}`);
				const layouted = await layouter.getLayoutedElements(sortTreeNodesBFS(cleanedGraph.nodes), forwardOnlyEdges);
				console.timeEnd(`layouting ${layoutingId}`);
				console.log('end layout');

				function getOrder(edgeType: EdgeType): number {
					switch (edgeType) {
						case EdgeType.FactoryOwnership:
							return -1;
						case EdgeType.ParentToChild:
							return 0;
						case EdgeType.Source:
							return 1;
						case EdgeType.Reactive:
							return 2;
						case EdgeType.Unknown:
							return 3;
						default:
							absurd(edgeType);
					}
				}

				return {
					nodes: layouted.nodes,
					edges: [...linksExcludedFromLayouting, ...linksForLayouting].sort(
						(a, b) => getOrder(a.data.edgeType) - getOrder(b.data.edgeType),
					),
				};
			},
		);
		const getGraph = abortable(getGraphAbortableFx);

		logEffectFail(getGraph.abortableFx);

		debug(graphCleanerSelector.$selectedCleaners);

		sample({
			source: {
				graph: $graph,
				selectedGraphVariant: $selectedGraphVariant,
				excludeOwnershipFromLayouting: $excludeOwnershipFromLayouting,
				unfoldedNodes: $unfoldedNodes,
				pipeline: graphCleanerSelector.$selectedCleaners,
			},
			target: getGraph.abortableFx,
		});

		return { graphGenerated: getGraph.abortableFx.doneData, pickupStoredPipeline, graphCleanerSelector };
	},
);
