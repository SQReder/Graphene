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
import { combine, createEffect, is, restore, Unit } from 'effector';
import { EffectorDeclarationDetails, EffectorGraph, EffectorNode, MyEdge, NodeFamily } from './types.ts';
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
import {useDarkMode} from "usehooks-ts";

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

// @ts-expect-error unused
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const myCoolEffectFx = createEffect(() => {});

const $inflights = myCoolEffectFx.inFlight.map(Boolean);
const $failHappened = restore(myCoolEffectFx.fail, null);
const $doneHappened = restore(myCoolEffectFx.done, null);
const $finallyHappened = restore(myCoolEffectFx.finally, null);

const $doneData = restore(myCoolEffectFx.doneData, null);
const $failData = restore(myCoolEffectFx.failData, null);

const $pending = restore(myCoolEffectFx.pending.updates, null);
const $inFlight1 = restore(myCoolEffectFx.inFlight.updates, null);

const $combined = combine($pending, $inFlight1, (a, b) => [a, b]);

// @ts-expect-error strange typings
const units: Unit<unknown>[] = [
    myCoolEffectFx,

    // ...Object.values(notificationsModelFactory.createModel({ softDismissTimeoutMs: 100 })),
    // myCoolEffectFx,
    // finalEvent2,
    // finalEvent,
    // numberChanged,
    // $loneStore,
    // looped,

    // ...Object.values(someModelFactory.createModel()).filter(is.unit),
].filter(is.unit);
//endregion

const graphiteMap = makeGraphene(units);

const graphites = Array.from(graphiteMap.values());

const effectorNodesMap: Map<string, EffectorNode> = new Map();

graphites.forEach((node) => {
    effectorNodesMap.set(node.id, makeEffectorNode(node));
});

// add region and factories into nodes
declarations
    .filter((d) => !effectorNodesMap.has(d.id))
    .filter((d) => d.type !== 'unit')
    .forEach((declaration) => {
        effectorNodesMap.set(declaration.id, {
            id: declaration.id,
            nodeType: 'declaration',
            declaration: new EffectorDeclarationDetails(declaration),
            // @ts-expect-error so sad
            meta: declaration.meta,
            linkType: declaration.meta,
        });
    });

console.log('effectorNodesMap', effectorNodesMap);

// generate edges from node graph
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

const cleanedGraph = cleanup(reactiveGraph, effectorNodesMap);
sortNodes(cleanedGraph.nodes); // sort items again before layouting

const linkGraph: EffectorGraph = {
    nodes: initialNodes,
    edges: linkingEdges,
};
const cleanedLinksGraph = cleanup(linkGraph, effectorNodesMap);

const layoutedGraphs = {
    reactive: layoutGraph(reactiveGraph),
    cleaned: layoutGraph(cleanedGraph),
    owning: layoutGraph({ nodes: initialNodes, edges: owningEdges }),
    link: layoutGraph(linkGraph),
    cleanedLinks: layoutGraph(cleanedLinksGraph),
    rxOwn: layoutGraph(
        cleanup(
            {
                nodes: initialNodes,
                edges: [...owningEdges, ...reactiveEdges],
            },
            effectorNodesMap
        )
    ),
};

export default function App() {
    const [nodes, setNodes] = useState<EffectorNode[]>([]);
    const [edges, setEdges] = useState<MyEdge[]>([]);

    const onNodesChange = useCallback<OnNodesChange<EffectorNode>>((changes) => {
        if (changes.length === 1) {
            const change = changes[0];
            if (change.type === 'select' && change.selected) {
                const id = change.id;

                const effectorNode = effectorNodesMap.get(id);
                if (effectorNode && effectorNode.nodeType !== NodeFamily.Declaration) {
                    console.log('node', { meta: effectorNode });
                    const owning = owningEdges.filter((edge) => edge.source === id);

                    if (effectorNode.effector.meta.op === 'effect') {
                        owning.forEach((edge) => {
                            changes.push({
                                id: edge.target,
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

    const [viewMode, setViewMode] = useState<
        'next' | 'owning' | 'link' | 'clean' | 'clean link' | 'reactive owning (clean)'
    >('reactive owning (clean)');

    const setGraph = useCallback((graph: EffectorGraph) => {
        setNodes(graph.nodes);
        setEdges(graph.edges);
    }, []);

    useEffect(() => {
        switch (viewMode) {
            case 'clean':
                setGraph(layoutedGraphs.cleaned);
                break;
            case 'next':
                setGraph(layoutedGraphs.reactive);
                break;
            case 'owning':
                setGraph(layoutedGraphs.owning);
                break;
            case 'link':
                setGraph(layoutedGraphs.link);
                break;
            case 'clean link':
                setGraph(layoutedGraphs.cleanedLinks);
                break;
            case 'reactive owning (clean)':
                setGraph(layoutedGraphs.rxOwn);
                break;
            default:
                absurd(viewMode);
        }
    }, [setGraph, viewMode]);

    const handleNodeClick = useCallback<NodeMouseHandler>((_, { id }: Node) => {
        const node = effectorNodesMap.get(id);

        console.log('node', { id, node });
    }, []);

    const handleEdgeClick = useCallback((_: ReactMouseEvent, edge: Edge) => {
        console.log('edge', edge);

        const myEdge = edge as MyEdge;

        if (myEdge.relatedNodes.collapsed) {
            myEdge.relatedNodes.collapsed.forEach((c) => {
                console.log('collapsed', isRegularNode(c) ? c.effector.graphite.scope.fn : 'wtf', c);
            });
        }
    }, []);

    // useEffect(() => {
    //     const timer = setInterval(() => handlerToggle(), 2000)
    //     return () => clearInterval(timer)
    // }, []);

    const {isDarkMode} = useDarkMode({});

    return (
        <>
            <Buttons>
                <button onClick={() => setViewMode('next')}>Reactive</button>
                <button onClick={() => setViewMode('clean')}>Reactive Cleaned</button>
                <button onClick={() => setViewMode('owning')}>Owning</button>
                <button onClick={() => setViewMode('link')}>Links</button>
                <button onClick={() => setViewMode('clean link')}>Links Cleaned</button>
                <button onClick={() => setViewMode('reactive owning (clean)')}>Rx + Own (🧼🧹)</button>
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
                    <Background bgColor={isDarkMode ? '#303030' : undefined} />
                    <MiniMap pannable zoomable bgColor={isDarkMode ? '#303030' : undefined} />
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
