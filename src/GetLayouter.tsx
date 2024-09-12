import dagre from 'dagre';
import { EffectorGraph, EffectorNode, MyEdge } from './types.ts';
import { Position } from '@xyflow/react';
import ELK, { ElkExtendedEdge, ElkNode, LayoutOptions } from 'elkjs';

export const getLayouter = () => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 150;
    const nodeHeight = 30;

    const getLayoutedElements = (nodes: EffectorNode[], edges: MyEdge[], direction = 'TB'): EffectorGraph => {
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

        return { nodes: newNodes, edges };
    };

    return { getLayoutedElements };
};

export const getElkLayouter = () => {
    const elk = new ELK();

    // Elk has a *huge* amount of options to configure. To see everything you can
    // tweak check out:
    //
    // - https://www.eclipse.org/elk/reference/algorithms.html
    // - https://www.eclipse.org/elk/reference/options.html
    const elkOptions = {
        'elk.algorithm': 'org.eclipse.elk.layered',
        // 'elk.layered.spacing.nodeNodeBetweenLayers': '200',
        'org.eclipse.elk.edgeRouting': 'SPLINES',
        // 'elk.spacing.nodeNode': '50',
        'elk.direction': 'DOWN',
    } satisfies LayoutOptions;

    const getLayoutedElements = (
        nodes: ElkNode[],
        edges: ElkExtendedEdge[],
        options = elkOptions
    ): Promise<{ edges: (MyEdge & ElkExtendedEdge)[]; nodes: Array<ElkNode & EffectorNode> }> => {
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
                width: 150,
                height: 50,
            })),
            edges: edges,
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

    return { getLayoutedElements };
};
