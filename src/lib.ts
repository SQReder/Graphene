import {
    DeclarationEffectorNode,
    EffectorGraph,
    EffectorNode,
    Graphite,
    Meta,
    MetaType,
    MyEdge,
    NodeFamily,
    OpType,
    RegularEffectorNode,
    UnitMeta,
} from './types.ts';
import { Unit } from 'effector';
import { getLayouter } from './GetLayouter.tsx';

export function absurd(value: never): never {
    throw new Error(`Expect to be unreachable, however receive ${JSON.stringify(value)}`);
}

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
        case OpType.Store:
            return `📦 ${id_} ${meta.name}${meta.derived ? ' (derived)' : ''}`;
        case OpType.Event:
            return `🔔 ${id_} ${meta.name}${meta.derived ? ' (derived)' : ''}`;
        case OpType.Sample:
            return `${id_} sample ` + meta.joint;
        case OpType.Effect:
            return `${meta.attached ? '⚡️~⚡️' : '⚡️'}  ${id_}` + meta.name;
        default:
            switch (meta.type) {
                case MetaType.Factory:
                    return 'factory ' + meta.method;
                default:
                    console.log(meta);
                    try {
                        // @ts-expect-error bad typification
                        absurd(meta);
                    } catch (e) {
                        console.error(e, meta);
                    }
                    return 'unknown';
            }
    }
}

export function hasGraphite(unit: Unit<unknown>): unit is Unit<unknown> & { graphite: Graphite } {
    return 'graphite' in unit;
}

export function isUnitMeta(meta: Meta): meta is UnitMeta {
    return meta.op === OpType.Store || meta.op === OpType.Event || meta.op === OpType.Effect;
}

export function makeGraphene(units: Unit<unknown>[]) {
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

export function makeEdgesFromMetaMap(metasMap: Map<string, EffectorNode>) {
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
                id: current.id + '::' + link.id,
                fromId: current.id,
                toId: link.id,
                source: current.id,
                target: link.id,
                from: current.meta,
                to: link.meta,
                fromFormatted: formatMeta(current.id, current.meta),
                toFormatted: formatMeta(link.id, link.meta),
                __graphite_from: current,
                __graphite_to: link,
                isForDeletion: false,
            });
        });

        new Set(current.next).forEach((next) => {
            try {
                const id = current.id + '::' + next.id;

                reactiveEdges.push({
                    id,
                    source: current.id,
                    target: next.id,
                    fromId: current.id,
                    toId: next.id,
                    from: current.meta,
                    to: next.meta,
                    fromFormatted: formatMeta(current.id, current.meta),
                    toFormatted: formatMeta(next.id, next.meta),
                    __graphite_from: current,
                    __graphite_to: next,
                    animated: true,
                });
            } catch (e) {
                console.error(e, current, next);
            }

            traverseForGood(next);
        });

        new Set(current.family.owners).forEach((owner) => {
            try {
                const id = current.id + '::' + owner.id;

                owningEdges.push({
                    id,
                    source: current.id,
                    target: owner.id,
                    fromId: current.id,
                    toId: owner.id,
                    from: current.meta,
                    to: owner.meta,
                    fromFormatted: formatMeta(current.id, current.meta),
                    toFormatted: formatMeta(owner.id, owner.meta),
                    __graphite_from: current,
                    __graphite_to: owner,
                    isForDeletion: false,
                    label: `${owner.id} 🔽 ${current.id}`,
                });
            } catch (e) {
                console.error(e, current, owner);
            }
        });
    }

    Array.from(metasMap.values())
        .filter(isRegularNode)
        .forEach(({ graphite }) => {
            traverseForGood(graphite);
        });

    return {
        reactiveEdges,
        owningEdges,
        linkingEdges,
    };
}

const isDerived = (graphite: Graphite) => isUnitMeta(graphite.meta) && graphite.meta.derived;

export function makeEffectorNode(graphite: Graphite): EffectorNode {
    // @ts-expect-error какая-то глупая ошибка
    return {
        graphite,
        meta: graphite.meta,
        nodeType: graphite.family.type,
        id: graphite.id,
        position: { x: 0, y: 0 },
        data: {
            label: formatMeta(graphite.id, graphite.meta),
        },
        type: graphite.meta.op === 'store' ? 'storeNode' : graphite.meta.op === 'event' ? 'eventNode' : undefined,

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
            return '#ef9bef';
        case NodeFamily.Declaration:
            return '#efefef';
        default:
            absurd(linkType);
    }
}

export function isDeclarationNode(node: EffectorNode): node is DeclarationEffectorNode {
    return node.nodeType === NodeFamily.Declaration;
}

export function isRegularNode(node: EffectorNode): node is RegularEffectorNode {
    return node.nodeType === NodeFamily.Regular || node.nodeType === NodeFamily.Crosslink;
}

export function layoutGraph(graph: EffectorGraph): EffectorGraph {
    const layouter = getLayouter();

    return layouter.getLayoutedElements(graph.nodes, graph.edges);
}

export const sortNodes = (initialNodes: EffectorNode[]) => {
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
};
