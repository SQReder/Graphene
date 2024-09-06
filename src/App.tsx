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
import { createEffect, createEvent, createStore, sample, Unit } from 'effector';
import { modelFactory } from 'effector-factorio';
import { Declaration } from 'effector/inspect';
import { readonly } from 'patronum';
import styled from '@emotion/styled';
import { Graphene, LinkType, Meta, OpType, UnitMeta } from './types.ts';
import '@xyflow/react/dist/style.css';
import './App.css';
import { formatMeta } from './lib.ts';

export function absurd(value: never): never {
    throw new Error(`Expect to be unreachable, however receive ${JSON.stringify(value)}`);
}

// const nodesMap: Map<string, Declaration> = new Map();

// inspectGraph({
//     fn: (declaration) => {
//         nodesMap.set(declaration.id, declaration);
//
//         console.log(
//             {
//                 id: declaration.id,
//                 sid: declaration.sid,
//                 name: declaration.name,
//                 method: declaration.type === 'factory' ? declaration.method : undefined,
//             },
//             declaration
//         );
//     },
// });

export const someModelFactory = modelFactory(() => {
    const someEvent = createEvent<number>();
    const $someStore = createStore<number>(0);

    sample({
        clock: someEvent,
        source: $someStore,
        fn: (acc, value) => acc + value,
        target: $someStore,
    });

    const warningFx = createEffect(() => {
        console.warn('some warning');
    });

    sample({
        source: $someStore.updates,
        filter: (value) => value > 5,
        target: warningFx,
    });

    return {
        someEvent: someEvent,
        $someStore: readonly($someStore),
    };
});

console.groupCollapsed('model1');

export const model = someModelFactory.createModel();
// const unitsToTraverse = [model.someEvent, model.$someStore];
const $myStore = createStore(0);
const unitsToTraverse = [$myStore];

// const model = notificationsModelFactory.createModel({ softDismissTimeoutMs: 100 });
// const unitsToTraverse = [model.publish, model.unpublish];

// console.log(nodesMap);

console.groupEnd();

//type guard for graphite field

function hasGraphite(unit: Unit<any>): unit is Unit<any> & { graphite: Graphene } {
    return 'graphite' in unit;
}

// type guard for family field

const graphenes = new Map<string, Graphene>();

function isUnitMeta(meta: Meta): meta is UnitMeta {
    return meta.op === OpType.Store || meta.op === OpType.Event || meta.op === OpType.Effect;
}

function traverse(graphite: Graphene) {
    if (graphenes.has(graphite.id)) {
        return;
    } else {
        graphenes.set(graphite.id, graphite);
    }

    if (graphite.family) {
        graphite.family.owners.forEach(traverse);
        graphite.family.links.forEach(traverse);
    }
}

console.groupCollapsed('traversing');

unitsToTraverse.forEach((unit) => {
    if (!hasGraphite(unit)) {
        console.log('no graphite', unit);
        return;
    }

    const graphite = unit.graphite;

    traverse(graphite);
});

console.groupEnd();

// family type group

console.group('family type group');

interface MetaInfo {
    __graphene: Graphene;

    linkedTo: Set<string>;
    meta: Meta;
    type: LinkType;

    [key: string]: unknown;
}

const metasMap: Map<string, MetaInfo> = new Map();

const grapheneList = Array.from(graphenes.values());

grapheneList.forEach((graphene) => {
    console.log(graphene.id, graphene.family?.type, graphene);

    const meta: MetaInfo = {
        linkedTo: new Set(graphene.family.links.map((link) => link.id)),
        meta: graphene.meta,
        type: graphene.family.type,
        __graphene: graphene,
    };

    metasMap.set(graphene.id, meta);
});

console.groupEnd();

// console.log('metas', [...metas.values()].filter((v) => !([OpType.On, OpType.Watch] as OpType[]).includes(v.meta.op)))
console.log('metas', metasMap);

interface MyEdge {
    fromId: string;
    toId: string;
    fromFormatted: string;
    toFormatted: string;
    from: Meta;
    to: Meta;
    __graphene_from: Graphene;
    __graphene_to: Graphene;
}

const edges: MyEdge[] = [];
const owningEdges: MyEdge[] = [];

const passed = new Set<string>();

function traverseForGood(graphene: Graphene) {
    if (passed.has(graphene.id)) {
        return;
    } else {
        passed.add(graphene.id);
    }

    graphene.next.forEach((next) => {
        try {
            edges.push({
                fromId: graphene.id,
                toId: next.id,
                from: graphene.meta,
                to: next.meta,
                fromFormatted: formatMeta(graphene.id, graphene.meta),
                toFormatted: formatMeta(next.id, next.meta),
                __graphene_from: graphene,
                __graphene_to: next,
            });
        } catch (e) {
            console.log(e, graphene, next);
        }

        traverseForGood(next);
    });

    graphene.family.owners.forEach((owner) => {
        try {
            owningEdges.push({
                fromId: graphene.id,
                toId: owner.id,
                from: graphene.meta,
                to: owner.meta,
                fromFormatted: formatMeta(graphene.id, graphene.meta),
                toFormatted: formatMeta(owner.id, owner.meta),
                __graphene_from: graphene,
                __graphene_to: owner,
            });
        } catch (e) {
            console.log(e, graphene, owner);
        }
    });
}

metasMap.forEach(({ __graphene }) => {
    traverseForGood(__graphene);
});

console.log(edges);

// @ts-ignore
// const bySid = lookup((declaration: Declaration) => (declaration.method ? (declaration.method + '::') : '') + declaration.name ?? declaration.id, /*prop('meta')*/);
// const foo = bySid(nodes)

// console.log(foo)

function rnd(max: number = 1000): number {
    return Math.floor(Math.random() * max);
}

const initialNodes: Node[] = [];
const initialEdgesNext: Edge[] = [];
const initialEdgesOwning: Edge[] = [];

// nodesMap.forEach((declaration) => {
//     const isUpdates = declaration.meta.op === OpType.Event && declaration.meta.name === 'updates';
//
//     const x = rnd();
//     const y = declaration.meta.op === OpType.Event && declaration.meta.name === 'reinit' ? -100 : rnd();
//
//     console.log(declaration.meta.op, declaration.meta.name, y);
//
//     initialNodes.push({
//         id: declaration.id,
//         position: { x, y },
//         data: { label: formatDeclaration(declaration) },
//     });
// });

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

    const found = initialNodes.find((n) => n.id === meta.__graphene.id);
    if (!found) {
        const linkType = meta.__graphene.family.type;
        const isDerived = isUnitMeta(meta.__graphene.meta) && meta.__graphene.meta.derived;
        initialNodes.push({
            id: meta.__graphene.id,
            position: { x, y },
            data: { label: formatMeta(meta.__graphene.id, meta.__graphene.meta) },
            style: {
                background: getBackground(linkType),
                border: isDerived ? '1px dashed red' : '1px solid black',
            },
            type: meta.meta.op === OpType.Store ? 'storeNode' : undefined,
        });
    } else {
        if (isUpdates) {
            console.log(meta.__graphene.id, meta.__graphene.family.owners, meta.__graphene.family.owners[0]?.id);
            found.parentId = meta.__graphene.family.owners.find((owner) => owner.meta.op === 'store')?.id;
            found.extent = 'parent';
            found.position = { x: 0, y: 10 };
            found.style = { width: 50, height: 25 };
        }
    }
});

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

edges.forEach((edge) => {
    const id = edge.fromId + '::' + edge.toId;

    if (initialEdgesOwning.find((e) => e.id === id)) {
        return;
    }

    initialEdgesNext.push({
        id: id,
        source: edge.fromId,
        target: edge.toId,
        markerEnd: {
            type: MarkerType.Arrow,
        },
        label: edge.__graphene_from.id + ' -> ' + edge.__graphene_to.id,
        animated: true,
        // style: { stroke: 'black' },
    });
});

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
        label: edge.__graphene_from.id + ' -> ' + edge.__graphene_to.id,
        // style: { stroke: '#ddd' },
    });
});

function formatDeclaration(declaration: Declaration) {
    const name = declaration.name ?? declaration.id;
    const id = `[${declaration.id}]`;
    switch (declaration.type) {
        case 'unit':
            switch (declaration.kind) {
                case 'event':
                    return `🔔 ${id} ${name}`;
                case 'store':
                    return `📦 ${id} ${name}`;
                case 'effect':
                    return `⚡️ ${id} ${name}`;
                default:
                    absurd(declaration);
            }
        case 'factory':
            return `✨ ${id} ${declaration.method}::${name}`;
        case 'region':
            return `👀 ${id} ${declaration.method}::${name}`;
        default:
            absurd(declaration);
    }
}

const StoreNodeContainer = styled.div`
    background: burlywood;
    width: 150px;
    height: 50px;

    font-size: 1rem;
`;

const StoreNode = (props: NodeProps) => {
    return (
        <StoreNodeContainer>
            <Handle type='target' position={Position.Top} id='reinit' />
            <Handle type='target' position={Position.Top} id='.on' />
            <Handle type='target' position={Position.Top} />
            <Handle type='source' position={Position.Bottom} />
            <div>{props.data.label}</div>
        </StoreNodeContainer>
    );
};

const nodeTypes: NodeTypes = {
    storeNode: StoreNode,
};

export default function App() {
    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdgesNext);

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
            setEdges(initialEdgesOwning);
        } else {
            setEdges(initialEdgesNext);
        }
    }, [viewMode]);

    const handleNodeClick = useCallback<NodeMouseHandler>((_, node_: Node) => {
        const id = node_.id;

        const meta = metasMap.get(id);

        console.log('node', { id, node, meta });
    }, []);

    return (
        <>
            <button style={{ position: 'absolute', top: 0, right: 0 }} onClick={handlerToggle}>
                Toggle
            </button>
            //{' '}
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
                //{' '}
            </div>
        </>
    );
}
