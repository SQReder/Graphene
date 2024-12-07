import type { ElkExtendedEdge, ElkNode, LayoutOptions } from 'elkjs';
import ELK from 'elkjs';
import { type EffectorNode, type MyEdge } from '../types';
import type { Layouter } from './types';

export const getElkLayouter = (): Layouter => {
	const elk = new ELK();

	// Elk has a *huge* amount of options to configure. To see everything you can
	// tweak check out:
	//
	// - https://www.eclipse.org/elk/reference/algorithms.html
	// - https://www.eclipse.org/elk/reference/options.html
	const elkOptions = {
		'org.eclipse.elk.algorithm': 'org.eclipse.elk.layered',
		'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '50',
		// 'org.eclipse.elk.edgeRouting': 'SPLINES',
		'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
		'org.eclipse.elk.spacing.nodeNode': '50',
		'org.eclipse.elk.spacing.edgeNode': '50',
		// 'org.eclipse.elk.layered.priority.straightness': '100',
		// 'org.eclipse.elk.layered.priority.shortness': '10',
		'org.eclipse.elk.direction': 'DOWN',
		// 'org.eclipse.elk.layered.directionCongruency': 'READING_DIRECTION',
		// 'org.eclipse.elk.topdown.nodeType': 'PARALLEL_NODE',
		// 'org.eclipse.elk.alignment': 'RIGHT',
		// 'org.eclipse.elk.debugMode': 'true',
		// 'org.eclipse.elk.layered.highDegreeNodes.treeHeight': '30',
		// 'org.eclipse.elk.partitioning.activate': 'true',
		// 'org.eclipse.elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
		// 'org.eclipse.elk.debugMode': 'true',
		// 'org.eclipse.elk.layered.cycleBreaking.strategy': 'INTERACTIVE',
		// 'org.eclipse.elk.layered.nodePlacement.favorStraightEdges': 'true',
		// 'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',
	} satisfies LayoutOptions;

	const getLayoutedElements = (
		nodes: EffectorNode[],
		edges: MyEdge[],
		options = elkOptions,
	): Promise<{
		edges: Array<MyEdge & ElkExtendedEdge>;
		nodes: Array<ElkNode & EffectorNode>;
	}> => {
		const isHorizontal = options?.['elk.direction'] === 'RIGHT';
		const graph: ElkNode = {
			id: 'root',
			layoutOptions: options,
			children: nodes.map((node) => ({
				...node,
				// Adjust the target and source handle positions based on the layout
				// direction.
				targetPosition: isHorizontal ? 'left' : 'top',
				sourcePosition: isHorizontal ? 'right' : 'bottom',

				// Hardcode a width and height for elk to use when layouting.
				width: 160, //node.type === 'combineNode' ? 20 : 160,
				height: node.type === 'combineNode' ? 20 : 40,
			})),
			edges: edges as unknown as ElkExtendedEdge[],
		};

		// @ts-expect-error supressed
		return elk
			.layout(graph, { layoutOptions: options })
			.then((layoutedGraph) => {
				console.log('layout', layoutedGraph);
				return {
					nodes: layoutedGraph.children?.map((node) => ({
						...node,
						// React Flow expects a position property on the node instead of `x`
						// and `y` fields.
						position: { x: node.x, y: node.y },
					})),

					edges: layoutedGraph.edges,
				};
			})
			.catch(console.error);
	};

	// @ts-expect-error - TODO make clean, not just compatible, results
	return { getLayoutedElements };
};
