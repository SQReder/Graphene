import {
    applyEdgeChanges,
    applyNodeChanges,
    Background,
    Controls,
    Edge,
    MiniMap,
    Node,
    NodeMouseHandler,
    OnEdgesChange,
    OnNodesChange,
    ReactFlow,
} from '@xyflow/react';

import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useState } from 'react';
import { createEffect, is, Unit } from 'effector';
import { EffectorGraph, EffectorNode, MyEdge } from './types.ts';
import '@xyflow/react/dist/style.css';
import './App.css';
import {
    absurd,
    isRegularNode,
    layoutGraph,
    makeEdgesFromMetaMap,
    makeEffectorNode,
    makeGraphene,
    sortNodes,
} from './lib.ts';
import { cleanup } from './cleaners.ts';
import { nodeTypes } from './nodeTypes.ts';
import styled from '@emotion/styled';
import { Declaration, inspectGraph } from 'effector/inspect';
import {notificationsModelFactory} from "./oo/model.ts";
import {someModelFactory} from "./simpleTestFactory.ts";

//region Preconfiguration
const declarations: Declaration[] = [];

inspectGraph({
    fn: (declaration) => {
        declarations.push(declaration);
    },
});
//endregion

//region Test units creation
/*
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

const looped = createEvent<number>();

sample({
    clock: looped,
    filter: (value) => value < 10,
    fn: (value) => value + 1,
    target: looped,
});
*/

// const myCoolEffectFx = createEffect(() => {});

// @ts-expect-error strange typings
const units: Unit<unknown>[] = [
    // ...Object.values(notificationsModelFactory.createModel({ softDismissTimeoutMs: 100 })),
    // myCoolEffectFx,
    // finalEvent2,
    // finalEvent,
    // numberChanged,
    // $loneStore,
    // looped,

    ...Object.values(someModelFactory.createModel()).filter(is.unit),
].filter(is.unit);
//endregion

const graphiteMap = makeGraphene(units);

const graphites = Array.from(graphiteMap.values());

const effectorNodesMap: Map<string, EffectorNode> = new Map();

graphites.forEach((graphite) => {
    console.log(graphite.id, graphite.family?.type, graphite);

    effectorNodesMap.set(graphite.id, makeEffectorNode(graphite));
});

declarations
    .filter((d) => !effectorNodesMap.has(d.id))
    .forEach((declaration) => {
        effectorNodesMap.set(declaration.id, {
            id: declaration.id,
            // @ts-expect-error so sad
            meta: declaration.meta,
            linkType: declaration.meta,
        });
    });

console.log('effectorNodesMap', effectorNodesMap);

const { reactiveEdges, owningEdges, linkingEdges } = makeEdgesFromMetaMap(effectorNodesMap);

console.log('edges', reactiveEdges);
console.log('owningEdges', owningEdges);

function makeInitialNodes(effectorNodesMap: Map<string, EffectorNode>): EffectorNode[] {
    const initialNodes: EffectorNode[] = [];

    // отсюда берутся мапы и семплы
    effectorNodesMap.forEach((effectorNode) => {
        const found = initialNodes.find((n) => n.id === effectorNode.id);
        if (!found) {
            initialNodes.push(effectorNode);
        }
    });
    return initialNodes;
}

const initialNodes = makeInitialNodes(effectorNodesMap);

// отсюда берутся мапы и семплы
effectorNodesMap.forEach((effectorNode) => {
    const found = initialNodes.find((n) => n.id === effectorNode.id);
    if (!found) {
        initialNodes.push(effectorNode);
    }
});

sortNodes(initialNodes);

console.log('initialNodes', initialNodes);

const reactiveGraph: EffectorGraph = {
    nodes: initialNodes,
    edges: reactiveEdges,
};

const cleanedGraph = cleanup(reactiveGraph);
sortNodes(cleanedGraph.nodes); // sort items again before layouting

const linkGraph: EffectorGraph = {
    nodes: initialNodes,
    edges: linkingEdges,
};
const cleanedLinksGraph = cleanup(linkGraph);

//region Layout graphs
const reactiveGraphLayouted = layoutGraph(reactiveGraph);

const cleanedGraphLayouted = layoutGraph(cleanedGraph);

const owningGraphLayouted = layoutGraph({ nodes: initialNodes, edges: owningEdges });

const linkGraphLayouted = layoutGraph(linkGraph);

const cleanedLinksGraphLayouter = layoutGraph(cleanedLinksGraph);
//endregion

export default function App() {
    const [nodes, setNodes] = useState<EffectorNode[]>([]);
    const [edges, setEdges] = useState<MyEdge[]>([]);

    const onNodesChange = useCallback<OnNodesChange<EffectorNode>>((changes) => {
        if (changes.length === 1) {
            const change = changes[0];
            if (change.type === 'select') {
                const id = change.id;

                const meta = effectorNodesMap.get(id);
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

        setNodes((nds) => applyNodeChanges<EffectorNode>(changes, nds));
    }, []);
    const onEdgesChange = useCallback<OnEdgesChange<MyEdge>>(
        (changes) => setEdges((eds) => applyEdgeChanges<MyEdge>(changes, eds)),
        []
    );

    const [viewMode, setViewMode] = useState<'next' | 'owning' | 'link' | 'clean' | 'clean link'>('next');

    const setGraph = useCallback((graph: EffectorGraph) => {
        setNodes(graph.nodes);
        setEdges(graph.edges);
    }, []);

    useEffect(() => {
        switch (viewMode) {
            case 'clean':
                setGraph(cleanedGraphLayouted);
                break;
            case 'next':
                setGraph(reactiveGraphLayouted);
                break;
            case 'owning':
                setGraph(owningGraphLayouted);
                break;
            case 'link':
                setGraph(linkGraphLayouted);
                break;
            case 'clean link':
                setGraph(cleanedLinksGraphLayouter);
                break;
            default:
                absurd(viewMode);
        }
    }, [setGraph, viewMode]);

    const handleNodeClick = useCallback<NodeMouseHandler>((_, node_: Node) => {
        const id = node_.id;

        const meta = effectorNodesMap.get(id);

        console.log('node', { id, meta });
    }, []);

    const handleEdgeClick = useCallback((_: ReactMouseEvent, edge: Edge) => {
        console.log('edge', edge);

        const myEdge = edge as MyEdge;

        if (myEdge.collapsed) {
            myEdge.collapsed.forEach((c) => {
                console.log('collapsed', isRegularNode(c) ? c.graphite.scope.fn : 'wtf', c);
            });
        }
    }, []);

    // useEffect(() => {
    //     const timer = setInterval(() => handlerToggle(), 2000)
    //     return () => clearInterval(timer)
    // }, []);

    return (
        <>
            <Buttons>
                <button onClick={() => setViewMode('next')}>Reactive</button>
                <button onClick={() => setViewMode('clean')}>Reactive Cleaned</button>
                <button onClick={() => setViewMode('owning')}>Owning</button>
                <button onClick={() => setViewMode('link')}>Links</button>
                <button onClick={() => setViewMode('clean link')}>Links Cleaned</button>
            </Buttons>
            <div style={{ width: '100vw', height: '100vh' }}>
                <ReactFlow
                    snapGrid={[15, 15]}
                    snapToGrid
                    nodes={nodes}
                    onNodesChange={onNodesChange}
                    onNodeClick={handleNodeClick}
                    edges={edges}
                    onEdgesChange={onEdgesChange}
                    onEdgeClick={handleEdgeClick}
                    fitView
                    nodeTypes={nodeTypes}
                >
                    <Background />
                    <MiniMap pannable zoomable />
                    <Controls />
                </ReactFlow>
            </div>
        </>
    );
}

const Buttons = styled.div`
    display: flex;
    flex-flow: column;
    gap: 4px;

    position: absolute;
    top: 10px;
    right: 10px;

    z-index: 100;
`;
