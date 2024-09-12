import {
    DeclarationEffectorNode,
    EdgeType,
    EffectorGraph,
    EffectorNode,
    EffectorNodeDetails,
    Graphite,
    Meta,
    MetaType,
    MyEdge,
    NodeFamily,
    OpType,
    OwnershipEdge,
    ReactiveEdge,
    RegularEffectorDetails,
    RegularEffectorNode,
    UnitMeta,
} from './types.ts';
import { Unit } from 'effector';
import { getElkLayouter } from './GetLayouter.tsx';
import { ensureDefined } from './oo/model.ts';
import { MarkerType } from '@xyflow/system';

export function absurd(value: never): never {
    throw new Error(`Expect to be unreachable, however receive ${JSON.stringify(value)}`);
}

export const getMetaIcon = (meta: Meta): string => {
    switch (meta.op) {
        case OpType.Watch:
            return '👓';
        case OpType.On:
            return '🔛';
        case OpType.Map:
            return '➡️';
        case OpType.FilterMap:
            return '📝';
        case OpType.Combine:
            return '⊕';
        case OpType.Store:
            return '📦';
        case OpType.Event:
            return '🔔';
        case OpType.Sample:
            return '🔁';
        case OpType.Effect:
            return meta.attached ? '⚡️~⚡️' : '⚡️';
        default:
            switch (meta.type) {
                case MetaType.Factory:
                    return '🏭';
                default:
                    return '❓';
            }
    }
};

export function formatMeta(id: string, meta: Meta) {
    const id_ = `[${id}]`;
    switch (meta.op) {
        case OpType.Watch:
            return `${id_} .watch`;
        case OpType.On:
            return `${id_} .on`;
        case OpType.Map:
            return `${id_} .map`;
        case OpType.FilterMap:
            return `${id_} .filterMap`;
        case OpType.Combine:
            return `${id_} combine`;
        case OpType.Store:
            return `📦 ${id_} ${meta.name}${meta.derived ? ' (derived)' : ''}`;
        case OpType.Event:
            return `🔔 ${id_} ${meta.name}${meta.derived ? ' (derived)' : ''}`;
        case OpType.Sample:
            return `${id_} 📊➕🔄 ` + meta.joint;
        case OpType.Effect:
            return `${meta.attached ? '⚡️~⚡️' : '⚡️'}  ${id_}` + meta.name;
        default:
            switch (meta.type) {
                case MetaType.Factory:
                    return '🏭 factory ' + meta.method;
                default:
                    try {
                        absurd(meta.type);
                    } catch {
                        console.warn('Unexpected node - returning unknown', id, meta);
                    }
                    return `${id} unknown`;
            }
    }
}

export function hasGraphite(unit: Unit<unknown>): unit is Unit<unknown> & { graphite: Graphite } {
    return 'graphite' in unit;
}

export function isUnitMeta(meta: Meta): meta is UnitMeta {
    return meta.op === OpType.Store || meta.op === OpType.Event || meta.op === OpType.Effect;
}

export function makeGraphene(units: Unit<unknown>[]): Map<string, Graphite> {
    const grapheneMap = new Map<string, Graphite>();

    function traverse(graphite: Graphite) {
        if (grapheneMap.has(graphite.id)) {
            console.warn('graphene already exists', graphite);
            return;
        } else {
            grapheneMap.set(graphite.id, graphite);
        }

        if (graphite.family) {
            graphite.family.owners.forEach(traverse);
            graphite.family.links.forEach(traverse);
            graphite.next.filter(traverse);
        }
    }

    console.groupCollapsed('traversing');

    units.forEach((unit) => {
        if (!hasGraphite(unit)) {
            console.log('no graphite', unit);
            return;
        }

        traverse(unit.graphite);
    });

    console.groupEnd();

    return grapheneMap;
}

export function makeEdgesFromMetaMap(nodesMap: Map<string, EffectorNode>): {
    linkingEdges: Array<MyEdge>;
    owningEdges: Array<MyEdge>;
    reactiveEdges: Array<MyEdge>;
} {
    const reactiveEdges: MyEdge[] = [];
    const owningEdges: MyEdge[] = [];
    const linkingEdges: MyEdge[] = [];

    const visited = new Set<string>();

    function traverseForGood(current: Graphite) {
        if (visited.has(current.id)) {
            return;
        } else {
            visited.add(current.id);
        }

        const links = [...current.family.links];

        if (current.family.type === 'regular') {
            current.family.owners.forEach((owner) => {
                const singleDuplicatedOwner = links.findIndex((link) => link.id === owner.id);
                if (singleDuplicatedOwner !== -1) links.splice(singleDuplicatedOwner, 1);
            });
        }

        new Set(links).forEach((link) => {
            linkingEdges.push({
                id: current.id + ' linked to ' + link.id,
                source: current.id,
                target: link.id,
                data: {
                    edgeType: EdgeType.Link,
                    relatedNodes: {
                        source: ensureDefined(nodesMap.get(current.id)),
                        target: ensureDefined(nodesMap.get(link.id)),
                    },
                },
            });
        });

        new Set(current.next).forEach((next) => {
            try {
                const id = `${current.id} --> ${next.id}`;

                reactiveEdges.push({
                    id,
                    source: current.id,
                    target: next.id,
                    animated: true,
                    style: {
                        zIndex: 10,
                    },
                    data: {
                        edgeType: EdgeType.Reactive,
                        relatedNodes: {
                            source: ensureDefined(nodesMap.get(current.id)),
                            target: ensureDefined(nodesMap.get(next.id)),
                        },
                    },
                });
            } catch (e) {
                console.error(e, current, next);
            }

            traverseForGood(next);
        });

        new Set(current.family.owners).forEach((owner) => {
            try {
                const id = `${owner.id} owns ${current.id}`;

                owningEdges.push({
                    id,
                    source: owner.id,
                    target: current.id,
                    // label: `${owner.id} 🔽 ${current.id}`,
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                    },
                    style: {
                        stroke: 'rgba(132,215,253,0.7)',
                    },
                    data: {
                        edgeType: EdgeType.Ownership,
                        relatedNodes: {
                            source: ensureDefined(nodesMap.get(owner.id)),
                            target: ensureDefined(nodesMap.get(current.id)),
                        },
                    },
                });
            } catch (e) {
                console.error(e, current, owner);
            }
        });
    }

    Array.from(nodesMap.values())
        .filter(isRegularNode)
        .forEach(({ data }) => {
            traverseForGood(data.effector.graphite);
        });

    return {
        reactiveEdges,
        owningEdges,
        linkingEdges,
    };
}

const isDerived = (graphite: Graphite) => isUnitMeta(graphite.meta) && graphite.meta.derived;

export function makeEffectorNode(graphite: Graphite): RegularEffectorNode {
    const nodeDetails = new EffectorNodeDetails(graphite);

    return {
        id: graphite.id,
        position: { x: 0, y: 0 },
        data: {
            label: formatMeta(graphite.id, graphite.meta),
            effector: nodeDetails,
            nodeType: nodeDetails.type,
        },
        type:
            graphite.meta.op === 'store'
                ? 'storeNode'
                : graphite.meta.op === 'event'
                  ? 'eventNode'
                  : graphite.meta.op === 'effect'
                    ? 'effectNode'
                    : graphite.meta.op === 'sample'
                      ? 'sampleNode'
                      : undefined,

        style: {
            border: isDerived(graphite) ? '1px dotted gray' : '1px solid black',
            background: getBackground(graphite.family.type),
        },
    };
}

function getBackground(linkType: NodeFamily) {
    switch (linkType) {
        case NodeFamily.Crosslink:
            return '#f3f38f';
        case NodeFamily.Regular:
            return '#dadada';
        case NodeFamily.Declaration:
            return '#efefef';
        default:
            absurd(linkType);
    }
}

export function isDeclarationNode(node: EffectorNode): node is DeclarationEffectorNode {
    return node.data.nodeType === NodeFamily.Declaration;
}

export function isRegularNode(node: EffectorNode): node is RegularEffectorNode {
    return node.data.nodeType === NodeFamily.Regular || node.data.nodeType === NodeFamily.Crosslink;
}

export function assertIsRegularEffectorDetails(details: unknown): asserts details is RegularEffectorDetails {
    if (details === null || details === undefined) {
        throw new Error('assertIsRegularEffectorDetails: given value is null or undefined');
    }

    if (typeof details !== 'object') {
        throw new Error(`assertIsRegularEffectorDetails: given value is not an object, but ${typeof details}`);
    }

    if (!('nodeType' in details)) {
        throw new Error(`assertIsRegularEffectorDetails: given object does not have nodeType property`);
    }

    if (details.nodeType !== NodeFamily.Regular && details.nodeType !== NodeFamily.Crosslink) {
        throw new Error(
            `assertIsRegularEffectorDetails: given nodeType is not a regular effector node type, but ${details.nodeType}`
        );
    }
}

export function layoutGraph(graph: EffectorGraph, direction: 'horizontal' | 'vertical') {
    const layouter = getElkLayouter();

    return layouter.getLayoutedElements(graph.nodes, graph.edges);
}

export const sortNodes = (initialNodes: EffectorNode[]): EffectorNode[] => {
    return [...initialNodes]
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
};

export function getEdgeRelatedGraphite(edge: MyEdge, relation: 'source' | 'target'): Graphite | undefined {
    const node = edge.data.relatedNodes[relation];
    if (isRegularNode(node)) return node.data.effector.graphite;
    else {
        return undefined;
    }
}

export function hasOpType<Op extends OpType>(
    graphite: Graphite,
    opType: Op | undefined
): graphite is Graphite & { meta: { op: Op } } {
    return graphite.meta.op === opType;
}

export function nodeHasOpType<Op extends OpType>(
    node: EffectorNode,
    opType: Op | undefined
): node is RegularEffectorNode & { data: { effector: { graphite: Graphite & { meta: { op: Op } } } } } {
    return isRegularNode(node) && hasOpType(node.data.effector.graphite, opType);
}

export function isReactiveEdge(edge: MyEdge): edge is ReactiveEdge {
    return edge.data.edgeType === EdgeType.Reactive;
}
export function isOwnershipEdge(edge: MyEdge): edge is OwnershipEdge {
    return edge.data.edgeType === EdgeType.Ownership;
}

export type GraphTypedEdges = {
    owhership: Map<string, OwnershipEdge[]>;
    reactive: Map<string, ReactiveEdge[]>;
};

export function getEdgesBy(edges: MyEdge[], variant: 'source' | 'target'): GraphTypedEdges {
    return edges.reduce(
        (maps, edge) => {
            if (isReactiveEdge(edge)) {
                const map = maps.reactive;
                if (map.has(edge[variant])) {
                    map.get(edge[variant])!.push(edge);
                } else {
                    map.set(edge[variant], [edge]);
                }
            } else if (isOwnershipEdge(edge)) {
                const map = maps.owhership;
                if (map.has(edge[variant])) {
                    map.get(edge[variant])!.push(edge);
                } else {
                    map.set(edge[variant], [edge]);
                }
            } else {
                console.debug(edge.data.edgeType, 'not supported yet');
            }

            return maps;
        },
        {
            reactive: new Map<string, ReactiveEdge[]>(),
            owhership: new Map<string, OwnershipEdge[]>(),
        }
    );
}

export function getOwnershipEdgesBy(edges: MyEdge[], variant: 'source' | 'target'): Map<string, OwnershipEdge[]> {
    return edges.reduce((map, edge) => {
        if (isOwnershipEdge(edge)) {
            if (map.has(edge[variant])) {
                map.get(edge[variant])!.push(edge);
            } else {
                map.set(edge[variant], [edge]);
            }
        }

        return map;
    }, new Map<string, OwnershipEdge[]>());
}

export function getReactiveEdgesBy(edges: MyEdge[], variant: 'source' | 'target'): Map<string, ReactiveEdge[]> {
    return edges.reduce((map, edge) => {
        if (isReactiveEdge(edge)) {
            if (map.has(edge[variant])) {
                map.get(edge[variant])!.push(edge);
            } else {
                map.set(edge[variant], [edge]);
            }
        }

        return map;
    }, new Map<string, ReactiveEdge[]>());
}

export function shallowCopyGraph(graph: EffectorGraph) {
    return {
        nodes: [...graph.nodes],
        edges: [...graph.edges],
    };
}
export type Lookups = {
    nodes: Map<string, EffectorNode>;
    edgesBySource: GraphTypedEdges;
    edgesByTarget: GraphTypedEdges;
};
type NodeWithRelatedEdges = { incoming: OwnershipEdge[]; outgoing: OwnershipEdge[]; node: EffectorNode };

export function findNodesByOpTypeWithRelatedEdges(
    opType: OpType,
    lookups: Lookups,
    extraFilter: (node: RegularEffectorNode) => boolean = () => true
): NodeWithRelatedEdges[] {
    const result: NodeWithRelatedEdges[] = [];

    Array.from(lookups.nodes.values()).forEach((node) => {
        if (isRegularNode(node) && node.data.effector.meta.op === opType && extraFilter(node)) {
            result.push({
                node,
                incoming: lookups.edgesByTarget.owhership.get(node.id) || [],
                outgoing: lookups.edgesBySource.owhership.get(node.id) || [],
            });
        }
    });

    return result;
}

export function findNodesByOpType(
    opType: OpType,
    nodes: EffectorNode[],
    extraFilter: (node: RegularEffectorNode) => boolean = () => true
): RegularEffectorNode[] {
    return nodes.filter(isRegularNode).filter((node) => node.data.effector.meta.op === opType && extraFilter(node));
}
