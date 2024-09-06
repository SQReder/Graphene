import type { NodeMouseHandler } from '@xyflow/react';
import {
    applyEdgeChanges,
    applyNodeChanges,
    Edge,
    Handle,
    MarkerType,
    Node,
    NodeProps,
    NodeTypes,
    OnEdgesChange,
    OnNodesChange,
    Position,
    ReactFlow,
} from '@xyflow/react';

import { useCallback, useEffect, useState } from 'react';
// import {createEvent, createStore, units} from './effectorio.ts';
import { createEffect, createEvent, createStore, is, sample } from 'effector';
import styled from '@emotion/styled';
import { LinkType, MetaInfo, MyEdge, OpType } from './types.ts';
import '@xyflow/react/dist/style.css';
import './App.css';
import { absurd, makeEdgesFromMetaMap, formatMeta, isUnitMeta, makeGraphene } from './lib.ts';
import dagre from 'dagre';
import { someModelFactory } from './simpleTestFactory.ts';

const metasMap: Map<string, MetaInfo> = new Map();

const $loneStore = createStore(0);

const numberChanged = createEvent<number>();
const $numberStore = createStore<number>(0).on(numberChanged, (_, value) => value);

const $value = createStore(0);
const finalEvent = createEvent<number>();

sample({
    clock: $value,
    target: finalEvent,
});

const $value2 = createStore(0);
const finalEvent2 = createEvent<number>();

sample({
    clock: $value2.updates,
    target: finalEvent2,
});

const graphiteMap = makeGraphene([...Object.values(someModelFactory.createModel())].filter(is.unit));

const graphites = Array.from(graphiteMap.values());

graphites.forEach((graphite) => {
    console.log(graphite.id, graphite.family?.type, graphite);

    const meta: MetaInfo = {
        linkedTo: new Set(graphite.family.links.map((link) => link.id)),
        meta: graphite.meta,
        type: graphite.family.type,
        __graphite: graphite,
    };

    metasMap.set(graphite.id, meta);
});

console.log('metas', metasMap);

const { reactiveEdges, owningEdges } = makeEdgesFromMetaMap(metasMap);

console.log('edges', reactiveEdges);
console.log('owningEdges', owningEdges);

function rnd(max: number = 1000): number {
    return Math.floor(Math.random() * max);
}

const initialNodes: Node[] = [];
const initialEdgesReactive: MyEdge[] = [];
const initialEdgesOwning: Edge[] = [];

function getBackground(linkType: LinkType) {
    switch (linkType) {
        case LinkType.Crosslink:
            return '#f3f38f';
        case LinkType.Regular:
            return '#ef9bef';
        default:
            absurd(linkType);
    }
}

// отсюда берутся мапы и семплы
metasMap.forEach((meta) => {
    const isUpdates = meta.meta.op === OpType.Event && meta.meta.name === 'updates';

    const x = isUpdates ? 0 : rnd();
    const y = isUpdates ? 10 : rnd();

    const found = initialNodes.find((n) => n.id === meta.__graphite.id);
    if (!found) {
        const linkType = meta.__graphite.family.type;
        const isDerived = isUnitMeta(meta.__graphite.meta) && meta.__graphite.meta.derived;
        initialNodes.push({
            id: meta.__graphite.id,
            position: { x, y },
            data: { label: formatMeta(meta.__graphite.id, meta.__graphite.meta) },
            style: {
                background: getBackground(linkType),
                border: isDerived ? '1px dashed red' : '1px solid black',
            },
            type: meta.meta.op === OpType.Store ? 'storeNode' : undefined,
        });
    } else {
        if (isUpdates) {
            console.log(meta.__graphite.id, meta.__graphite.family.owners, meta.__graphite.family.owners[0]?.id);
            found.parentId = meta.__graphite.family.owners.find((owner) => owner.meta.op === 'store')?.id;
            found.extent = 'parent';
            found.position = { x: 0, y: 10 };
            found.style = { width: 50, height: 25 };
        }
    }
});

interface Graph<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
    nodes: NodeType[];
    edges: EdgeType[];
}

const reactiveGraph: Graph<Node, MyEdge> = {
    nodes: initialNodes,
    edges: initialEdgesReactive,
};

const removeHangUpdatesRecipe = (graph: Graph<Node, MyEdge>): Graph => {
    const edgesForDeletion = graph.edges.filter((edge) => edge.isForDeletion);

    const cleanedGraph: Graph<Node, MyEdge> = {
        nodes: [...graph.nodes],
        edges: [...graph.edges],
    };

    for (const edge of edgesForDeletion) {
        cleanedGraph.nodes = cleanedGraph.nodes.filter(({ id }) => id !== edge.toId);
    }

    cleanedGraph.edges = cleanedGraph.edges.filter((edge) => !edge.isForDeletion);

    return cleanedGraph;
};

initialNodes
    .sort((a, b) => {
        if (a.id < b.id) {
            return -1;
        } else {
            return 1;
        }
    })
    .sort((a, b) => {
        if (a.parentId != null && b.parentId != null) {
            if (a.parentId < b.parentId) {
                return -1;
            } else {
                return 1;
            }
        } else if (a.parentId != null) {
            return 1;
        } else if (b.parentId != null) {
            return -1;
        } else {
            return 0;
        }
    });

console.log(initialNodes);

reactiveEdges.forEach((edge) => {
    const id = edge.fromId + '::' + edge.toId;

    if (initialEdgesReactive.find((e) => e.id === id)) {
        return;
    }

    initialEdgesReactive.push({
        ...edge,
        id: id,
        source: edge.fromId,
        target: edge.toId,
        markerEnd: {
            type: MarkerType.Arrow,
        },
        label: edge.__graphite_from.id + ' → ' + edge.__graphite_to.id,
        animated: true,
        style: { stroke: edge.isForDeletion ? 'red' : '#303030' },
        targetHandle: edge.__graphite_from.meta.op === OpType.On ? '.on' : undefined,
    });
});

const cleanedGraph = removeHangUpdatesRecipe(reactiveGraph);


owningEdges.forEach((edge) => {
    const id = edge.fromId + '::' + edge.toId;

    if (initialEdgesOwning.find((e) => e.id === id)) {
        return;
    }

    initialEdgesOwning.push({
        id: id,
        source: edge.toId,
        target: edge.fromId,
        markerEnd: {
            type: MarkerType.Arrow,
        },
        label: `${edge.__graphite_to.id} 🔽 ${edge.__graphite_from.id}`,
        // style: { stroke: '#ddd' },
    });
});

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 110;
const nodeHeight = 70;

const getLayoutedElements = <NodeType extends Node>(nodes: NodeType[], edges: Edge[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node): NodeType => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const newNode: NodeType = {
            ...node,
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
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

const { nodes: layoutedNodesReactive, edges: layoutedEdgesReactive } = getLayoutedElements(
    reactiveGraph.nodes,
    reactiveGraph.edges
);

const { nodes: layoutedNodesCleaned, edges: layoutedEdgesCleaned } = getLayoutedElements(
    cleanedGraph.nodes,
    cleanedGraph.edges
);

const { nodes: layoutedNodesOwning, edges: layoutedEdgesOwning } = getLayoutedElements(
    initialNodes,
    initialEdgesOwning
);

const StoreNodeContainer = styled.div`
    background: burlywood;
    width: 150px;
    height: 50px;

    font-size: 1rem;

    display: flex;
    align-items: center;
    justify-content: center;
`;

const StoreNode = (props: NodeProps) => {
    return (
        <StoreNodeContainer>
            <Handle type='target' position={Position.Top} id='reinit' />
            <Handle type='target' position={Position.Top} id='.on' style={{ left: 10 }}>
                .on
            </Handle>
            <Handle type='target' position={Position.Top} />
            <Handle type='source' position={Position.Bottom} />
            <div>
                {/*@ts-expect-error ts(2322)*/}
                {props.data.label}
            </div>
        </StoreNodeContainer>
    );
};

const nodeTypes: NodeTypes = {
    storeNode: StoreNode,
};

export default function App() {
    const [nodes, setNodes] = useState(layoutedNodesReactive);
    const [edges, setEdges] = useState(layoutedEdgesReactive);

    const onNodesChange = useCallback<OnNodesChange>((changes) => {
        if (changes.length === 1) {
            const change = changes[0];
            if (change.type === 'select') {
                const id = change.id;

                const meta = metasMap.get(id);
                if (meta) {
                    console.log('node', { meta });
                    const owning = owningEdges.filter((edge) => edge.toId === id);

                    if (meta.meta.op === 'effect') {
                        owning.forEach((edge) => {
                            changes.push({
                                id: edge.fromId,
                                type: 'select',
                                selected: true,
                            });
                        });
                    }
                }
            }
        }

        setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);
    const onEdgesChange = useCallback<OnEdgesChange>(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const [viewMode, setViewMode] = useState<'next' | 'owning'>('next');

    const handlerToggle = () => {
        setViewMode((viewMode) => (viewMode === 'next' ? 'owning' : 'next'));
    };

    useEffect(() => {
        if (viewMode === 'owning') {
            setNodes(layoutedNodesCleaned);
            setEdges(layoutedEdgesCleaned);
        } else {
            setNodes(layoutedNodesReactive);
            setEdges(layoutedEdgesReactive);
        }
    }, [viewMode]);

    const handleNodeClick = useCallback<NodeMouseHandler>((_, node_: Node) => {
        const id = node_.id;

        const meta = metasMap.get(id);

        console.log('node', { id, meta });
    }, []);

    return (
        <>
            <button style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }} onClick={handlerToggle}>
                Toggle
            </button>
            <div style={{ width: '100vw', height: '100vh' }}>
                <ReactFlow
                    snapGrid={[15, 15]}
                    snapToGrid
                    nodes={nodes}
                    onNodesChange={onNodesChange}
                    onNodeClick={handleNodeClick}
                    edges={edges}
                    onEdgesChange={onEdgesChange}
                    fitView
                    nodeTypes={nodeTypes}
                />
            </div>
        </>
    );
}
