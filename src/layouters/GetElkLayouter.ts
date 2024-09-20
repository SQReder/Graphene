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
		'elk.algorithm': 'org.eclipse.elk.layered',
		'elk.layered.spacing.nodeNodeBetweenLayers': '40',
		// 'org.eclipse.elk.edgeRouting': 'SPLINES',
		'elk.spacing.nodeNode': '50',
		// 'org.eclipse.elk.spacing.edgeNode': '50',
		// 'org.eclipse.elk.layered.priority.straightness': '100',
		// 'org.eclipse.elk.layered.priority.shortness': '10',
		'elk.direction': 'DOWN',
		'org.eclipse.elk.layered.directionCongruency': 'READING_DIRECTION',
		'org.eclipse.elk.topdown.nodeType': 'PARALLEL_NODE',
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
			.layout(graph)
			.then((layoutedGraph) => ({
				nodes: layoutedGraph.children?.map((node) => ({
					...node,
					// React Flow expects a position property on the node instead of `x`
					// and `y` fields.
					position: { x: node.x, y: node.y },
				})),

				edges: layoutedGraph.edges,
			}))
			.catch(console.error);
	};

	// @ts-expect-error - TODO make clean, not just compatible, results
	return { getLayoutedElements };
};
