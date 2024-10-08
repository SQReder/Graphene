import { Position } from '@xyflow/react';
import dagre from 'dagre';
import type { EffectorGraph, EffectorNode, MyEdge } from '../types';
import type { Layouter } from './types';

export const getDagreLayouter = (): Layouter => {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));

	const nodeWidth = 150;
	const nodeHeight = 30;

	const getLayoutedElements = (nodes: EffectorNode[], edges: MyEdge[], direction = 'TB'): Promise<EffectorGraph> => {
		const isHorizontal = direction === 'LR';
		dagreGraph.setGraph({ rankdir: direction });

		nodes.forEach((node) => {
			dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
		});

		edges.forEach((edge) => {
			dagreGraph.setEdge(edge.source, edge.target);
		});

		dagre.layout(dagreGraph);

		const newNodes = nodes.map((node): EffectorNode => {
			const newNodeX = { ...node };
			newNodeX.targetPosition = isHorizontal ? Position.Left : Position.Top;
			newNodeX.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

			const nodeWithPosition = dagreGraph.node(node.id);
			const newNode: EffectorNode = {
				...node,
				targetPosition: isHorizontal ? Position.Left : Position.Top, // 'left' : 'top',
				sourcePosition: isHorizontal ? Position.Right : Position.Bottom, //'right' : 'bottom',
				// We are shifting the dagre node position (anchor=center center) to the top left
				// so it matches the React Flow node anchor point (top left).
				position: {
					x: nodeWithPosition.x - nodeWidth / 2,
					y: nodeWithPosition.y - nodeHeight / 2,
				},
			};

			return newNode;
		});

		return Promise.resolve({ nodes: newNodes, edges });
	};

	return { getLayoutedElements };
};
