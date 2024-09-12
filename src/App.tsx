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
import { combine, createEffect, createEvent, createStore, is, restore, sample, Unit } from 'effector';
import { EdgeType, EffectorDeclarationDetails, EffectorGraph, EffectorNode, MyEdge, NodeFamily } from './types.ts';
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
import { nodeTypes } from './nodeTypes.ts';
import styled from '@emotion/styled';
import { Declaration, inspectGraph } from 'effector/inspect';
import { useDarkMode } from 'usehooks-ts';
import { notificationsModelFactory } from './oo/model.ts';
import { cleanReactiveEdges } from './reactive-edge-cleaners.ts';
import { cleanup } from './cleaners.ts';
import { cleanOwnershipEdges } from './ownership-edge-cleaner.ts';
import { createFactory, invoke } from '@withease/factories';
import { ConfigurationContext } from './ConfigurationContext.ts';
import { enrichGraph } from './enrichers.ts';
import { someModelFactory } from './simpleTestFactory.ts';

//region Preconfiguration
const declarations: Declaration[] = [];

inspectGraph({
    fn: (declaration) => {
        declarations.push(declaration);
    },
});
//endregion

//region Test units creation

const loneStoreFactory = createFactory(() => {
    const $loneStore = createStore(0);
    return {
        $loneStore,
    };
});

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

// @ts-expect-error unused
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const myCoolEffectFx = createEffect(() => {});
myCoolEffectFx.map((x) => x);

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
    // myCoolEffectFx,
    ...Object.values(invoke(loneStoreFactory)),
    // ...Object.values(invoke(createTodoListApi,[])),
    // ...Object.values(createAsyncStorageExample()),
    ...Object.values(notificationsModelFactory.createModel({ softDismissTimeoutMs: 100 })),
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
            data: {
                nodeType: 'declaration',
                declaration: new EffectorDeclarationDetails(declaration),
                // label: (declaration.meta.name as string) ?? 'unknown',
            },
            position: { x: 0, y: 0 },
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

const initialNodes = sortNodes(makeInitialNodes(effectorNodesMap));

// отсюда берутся мапы и семплы
effectorNodesMap.forEach((effectorNode) => {
    const found = initialNodes.find((n) => n.id === effectorNode.id);
    if (!found) {
        initialNodes.push(effectorNode);
    }
});

console.log('initialNodes', initialNodes);

const direction: 'horizontal' | 'vertical' = 'vertical';

//region Reactive graph
console.group('Reactive graph');
const layoutedRxGraph = await layoutGraph(
    enrichGraph(
        {
            nodes: initialNodes,
            edges: reactiveEdges,
        },
        EdgeType.Reactive
    ),
    direction
);

console.groupEnd();

const cleanedRxGraph: EffectorGraph = {
    nodes: layoutedRxGraph.nodes,
    edges: cleanReactiveEdges(layoutedRxGraph.edges, effectorNodesMap),
};

const cleanedRxNoNodesGraph: EffectorGraph = cleanup(cleanedRxGraph);
//endregion

console.group('Ownerhip graph');

const ownerhipGraph: EffectorGraph = await layoutGraph(
    enrichGraph(
        {
            nodes: initialNodes,
            edges: owningEdges,
        },
        EdgeType.Ownership
    ),
    direction
);

console.groupEnd();

const cleanedOwnershipGraph: EffectorGraph = {
    nodes: ownerhipGraph.nodes,
    edges: cleanOwnershipEdges(ownerhipGraph),
};

const cleanedOwnershipNoNodesGraph: EffectorGraph = cleanup(cleanedOwnershipGraph);

const rxOwnershipGraph: EffectorGraph = await layoutGraph(
    {
        nodes: initialNodes,
        edges: [...cleanedOwnershipGraph.edges, ...cleanedRxGraph.edges],
    },
    direction
);

const bestGraph = cleanup(rxOwnershipGraph);
const layoutedGraphs = {
    rx: layoutedRxGraph,
    rxCleaned: cleanedRxGraph,
    rxCleanedNoNodes: cleanedRxNoNodesGraph,
    rxCleanedNoNodesLayouted: await layoutGraph(cleanup(cleanedRxNoNodesGraph), direction),
    ownership: ownerhipGraph,
    ownershipCleaned: cleanedOwnershipGraph,
    ownershipCleanedNoNodes: cleanedOwnershipNoNodesGraph,
    ownershipCleanedNoNodesLayouted: await layoutGraph(cleanedOwnershipNoNodesGraph, direction),
    rxOwnershipGraph: await layoutGraph(
        {
            nodes: sortNodes(bestGraph.nodes),
            edges: bestGraph.edges,
        },
        direction
    ),
};

export default function App() {
    const [nodes, setNodes] = useState<EffectorNode[]>([]);
    const [edges, setEdges] = useState<MyEdge[]>([]);

    const onNodesChange = useCallback<OnNodesChange<EffectorNode>>(
        (changes) => {
            if (changes.length === 1) {
                const change = changes[0];
                if (change.type === 'select' && change.selected) {
                    const id = change.id;

                    const effectorNode = effectorNodesMap.get(id);
                    if (effectorNode && effectorNode.data.nodeType !== NodeFamily.Declaration) {
                        console.log('edges', edges);
                        console.log('node', { meta: effectorNode });
                        const ownershipEdges = edges.filter((edge) => edge.data.edgeType === 'ownership');

                        console.log('ownershipEdges', ownershipEdges);

                        if (effectorNode.data.effector.meta.op === 'effect') {
                            console.log('id', effectorNode.id);

                            const ownedIds = ownershipEdges
                                .filter((edge) => edge.source === effectorNode.id)
                                .map((edge) => edge.target);

                            console.log('ownedIds', ownedIds);

                            console.log('effectorNode', effectorNode);

                            ownedIds.forEach((target) => {
                                console.log('target', target);
                                changes.push({
                                    id: target,
                                    type: 'select',
                                    selected: true,
                                });
                            });
                        }
                    }
                }
            }

            setNodes((nds) => applyNodeChanges<EffectorNode>(changes, nds));
        },
        [edges]
    );
    const onEdgesChange = useCallback<OnEdgesChange<MyEdge>>(
        (changes) => setEdges((eds) => applyEdgeChanges<MyEdge>(changes, eds)),
        []
    );

    const [viewMode, setViewMode] = useState<
        | 'rx'
        | 'rx-cleaned'
        | 'rx-cleaned-no-nodes'
        | 'rx-cleaned-no-nodes-layouted'
        | 'ownership'
        | 'ownership-cleaned'
        | 'ownership-cleaned-no-nodes'
        | 'ownership-cleaned-no-nodes-layouted'
        | 'rx-ownership-graph'
        // 'next' | 'owning' | 'link' | 'clean' | 'clean link' | 'reactive owning (clean)'
    >('rx-ownership-graph');

    const [replaceNodes, setReplaceNodes] = useState(true);
    const [showNodeIds, setShowNodeIds] = useState(true);

    const setGraph = useCallback(
        (graph: EffectorGraph) => {
            if (replaceNodes || nodes.length === 0) {
                setNodes(graph.nodes);
            }
            setEdges(graph.edges);
        },
        [nodes.length, replaceNodes]
    );

    const [visibleEdges, setVisibleEdges] = useState<'rx' | 'ownership' | 'rx+ownership'>('rx+ownership');

    const edgeFilter = useCallback(
        (edges: MyEdge[]) => {
            switch (visibleEdges) {
                case 'ownership':
                    return edges.filter((edge) => edge.data.edgeType === 'ownership');
                case 'rx':
                    return edges.filter((edge) => edge.data.edgeType === 'reactive');
                case 'rx+ownership':
                    return edges.filter(
                        (edge) => edge.data.edgeType === 'reactive' || edge.data.edgeType === 'ownership'
                    );
                default:
                    absurd(visibleEdges);
            }
        },
        [visibleEdges]
    );

    const graphFilter = useCallback(
        (graph: EffectorGraph): EffectorGraph => {
            return {
                nodes: graph.nodes,
                edges: edgeFilter(graph.edges),
            };
        },
        [edgeFilter]
    );

    useEffect(() => {
        switch (viewMode) {
            case 'rx':
                setGraph(graphFilter(layoutedGraphs.rx));
                break;
            case 'rx-cleaned':
                setGraph(graphFilter(layoutedGraphs.rxCleaned));
                break;
            case 'rx-cleaned-no-nodes':
                setGraph(graphFilter(layoutedGraphs.rxCleanedNoNodes));
                break;
            case 'rx-cleaned-no-nodes-layouted':
                setGraph(graphFilter(layoutedGraphs.rxCleanedNoNodesLayouted));
                break;
            case 'ownership':
                setGraph(graphFilter(layoutedGraphs.ownership));
                break;
            case 'ownership-cleaned':
                setGraph(graphFilter(layoutedGraphs.ownershipCleaned));
                break;
            case 'ownership-cleaned-no-nodes':
                setGraph(graphFilter(layoutedGraphs.ownershipCleanedNoNodes));
                break;
            case 'ownership-cleaned-no-nodes-layouted':
                setGraph(graphFilter(layoutedGraphs.ownershipCleanedNoNodesLayouted));
                break;
            case 'rx-ownership-graph':
                setGraph(graphFilter(layoutedGraphs.rxOwnershipGraph));
                break;
            default:
                absurd(viewMode);
        }
    }, [graphFilter, setGraph, viewMode]);

    const handleNodeClick = useCallback<NodeMouseHandler>((_, { id }: Node) => {
        const node = effectorNodesMap.get(id);

        console.log('node', { id, node });
    }, []);

    const handleEdgeClick = useCallback((_: ReactMouseEvent, edge: Edge) => {
        console.log('edge', edge);

        const myEdge = edge as MyEdge;

        if (myEdge.data.relatedNodes.collapsed) {
            myEdge.data.relatedNodes.collapsed.forEach((c) => {
                console.log('collapsed', isRegularNode(c) ? c.data.effector.graphite.scope.fn : 'wtf', c);
            });
        }
    }, []);

    // useEffect(() => {
    //     const timer = setInterval(() => handlerToggle(), 2000)
    //     return () => clearInterval(timer)
    // }, []);

    const { isDarkMode } = useDarkMode({});

    return (
        <ConfigurationContext.Provider value={{ layoutDirection: direction, showNodeIds }}>
            <Buttons>
                <button onClick={() => setViewMode('rx')}>Reactive</button>
                <button onClick={() => setViewMode('rx-cleaned')}>Reactive Cleaned</button>
                <button onClick={() => setViewMode('rx-cleaned-no-nodes')}>Reactive Cleaned No Nodes</button>
                <button onClick={() => setViewMode('rx-cleaned-no-nodes-layouted')}>
                    Reactive Cleaned No Nodes Layouted
                </button>
                <hr />
                <button onClick={() => setViewMode('ownership')}>Ownership</button>
                <button onClick={() => setViewMode('ownership-cleaned')}>Ownership Cleaned</button>
                <button onClick={() => setViewMode('ownership-cleaned-no-nodes')}>Ownership Cleaned No Nodes</button>
                <button onClick={() => setViewMode('ownership-cleaned-no-nodes-layouted')}>
                    Ownership Cleaned No Nodes Layouted
                </button>
                <hr />

                <button onClick={() => setViewMode('rx-ownership-graph')}>Reactive + Ownership</button>
                <hr />
                <Fieldset>
                    <legend>Visible edges</legend>
                    <label>
                        <input type='radio' checked={visibleEdges === 'rx'} onChange={() => setVisibleEdges('rx')} />
                        Reactive
                    </label>
                    <label>
                        <input
                            type='radio'
                            checked={visibleEdges === 'ownership'}
                            onChange={() => setVisibleEdges('ownership')}
                        />
                        Ownership
                    </label>
                    <label>
                        <input
                            type='radio'
                            checked={visibleEdges === 'rx+ownership'}
                            onChange={() => setVisibleEdges('rx+ownership')}
                        />
                        Reactive + Ownership
                    </label>
                </Fieldset>
                <hr />
                <label title={'Hack to save nodes positions when switching between views'}>
                    <input type='checkbox' checked={replaceNodes} onChange={(e) => setReplaceNodes(e.target.checked)} />
                    Replace nodes
                </label>
                <label title={'Show node ids in the graph'}>
                    <input type='checkbox' checked={showNodeIds} onChange={(e) => setShowNodeIds(e.target.checked)} />
                    Show node ids
                </label>
                <hr />
                <Legend>
                    <div>
                        <strong>legend</strong>
                    </div>
                    <ul>
                        <li>📦 - store</li>
                        <li>🔔 - event</li>
                        <li>⚡️ - effect</li>
                        <li>⚡️~⚡️ - attached effect</li>
                        <li>🏭 - factory</li>
                    </ul>
                </Legend>
            </Buttons>
            <div style={{ width: '100vw', height: '100vh' }}>
                <ReactFlow
                    snapGrid={[10, 10]}
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
                    <Background bgColor={isDarkMode ? '#303030' : undefined} color={'#ccc'} />
                    <MiniMap pannable zoomable bgColor={isDarkMode ? '#303030' : undefined} />
                    <Controls />
                </ReactFlow>
            </div>
        </ConfigurationContext.Provider>
    );
}

const Box = styled.div`
    display: flex;
    flex-flow: column;
    gap: 4px;
    // thin gray border
    border: 1px solid #ccc;
    padding: 4px;

    background: rgba(255, 255, 255, 0.75);
`;

const Buttons = styled(Box)`
    position: absolute;
    top: 10px;
    right: 10px;

    z-index: 100;
`;

const Fieldset = styled(Box)`
    background: rgba(255, 255, 255, 0.75);
`.withComponent('fieldset');

const Legend = styled(Box)`
    ul {
        list-style: none;
        padding: 0;

        margin: 0;
    }
`;
