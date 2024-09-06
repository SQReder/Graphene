import { Graphite, Meta, MetaInfo, MetaType, MyEdge, OpType, UnitMeta } from './types.ts';
import { Unit } from 'effector';

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
            return `⚡ ${id_}` + meta.name;
        default:
            switch (meta.type) {
                case MetaType.Factory:
                    return 'factory ' + meta.method;
                default:
                    console.log(meta);
                    try {
                        absurd(meta);
                    } catch (e) {
                        console.error(e, meta);
                    }
                    return 'unknown';
            }
    }
}

export function hasGraphite(unit: Unit<any>): unit is Unit<any> & { graphite: Graphite } {
    return 'graphite' in unit;
}

export function isUnitMeta(meta: Meta): meta is UnitMeta {
    return meta.op === OpType.Store || meta.op === OpType.Event || meta.op === OpType.Effect;
}

export function makeGraphene(units: Unit<any>[]) {
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

function isForDeletion(current: Graphite, next: Graphite) {
    if (current.meta.op === OpType.Store && next.meta.op === OpType.Event && next.meta.derived && next.meta.name === 'updates') {
        return next.next.length === 0
    }

    return false
}

export function makeEdgesFromMetaMap(metasMap: Map<string, MetaInfo>) {
    const reactiveEdges: MyEdge[] = [];
    const owningEdges: MyEdge[] = [];

    const visited = new Set<string>();

    function traverseForGood(current: Graphite) {
        if (visited.has(current.id)) {
            return;
        } else {
            visited.add(current.id);
        }

        current.next.forEach((next) => {
            try {
                reactiveEdges.push({
                    fromId: current.id,
                    toId: next.id,
                    from: current.meta,
                    to: next.meta,
                    fromFormatted: formatMeta(current.id, current.meta),
                    toFormatted: formatMeta(next.id, next.meta),
                    __graphite_from: current,
                    __graphite_to: next,
                    isForDeletion: isForDeletion(current,next)
                });
            } catch (e) {
                console.error(e, current, next);
            }

            traverseForGood(next);
        });

        current.family.owners.forEach((owner) => {
            try {
                owningEdges.push({
                    fromId: current.id,
                    toId: owner.id,
                    from: current.meta,
                    to: owner.meta,
                    fromFormatted: formatMeta(current.id, current.meta),
                    toFormatted: formatMeta(owner.id, owner.meta),
                    __graphite_from: current,
                    __graphite_to: owner,
                    isForDeletion: false,
                });
            } catch (e) {
                console.error(e, current, owner);
            }
        });
    }

    metasMap.forEach(({ __graphite }) => {
        traverseForGood(__graphite);
    });

    return {
        reactiveEdges,
        owningEdges,
    };
}
