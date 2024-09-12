import {
    DeclarationEffectorNode,
    EdgeType,
    EffectorNode,
    LinkEdge,
    MyEdge,
    NodeFamily,
    OpType,
    OwnershipEdge,
    ReactiveEdge,
    RegularEffectorNode,
    UnknownEdge,
} from './types.ts';
import {getEdgeRelatedGraphite, hasOpType, isRegularNode, isUnitMeta} from './lib.ts';
import { MarkerType } from '@xyflow/system';
import { ensureDefined } from './oo/model.ts';

interface EdgeCleaner<T extends MyEdge = MyEdge> {
    (edges: T[], nodeMap: Map<string, EffectorNode>): T[];
}

type ReactiveEdgeCleaner = EdgeCleaner<ReactiveEdge>;

function isDeclarationNode(node: EffectorNode): node is DeclarationEffectorNode {
    return node.data.nodeType === NodeFamily.Declaration;
}

function isReactiveEdge(edge: MyEdge): edge is ReactiveEdge {
    return edge.data.edgeType === 'reactive';
}

// -----------------

/**
 * Remove reactive edges to nodes that are store updates with no outcoming edges.
 */
const removeStoreUpdatesWithNoInputs: ReactiveEdgeCleaner = (edges) => {
    return edges.filter((edge) => {
        if (!isReactiveEdge(edge)) return true;

        const target = edge.data!.relatedNodes.target;
        if (isDeclarationNode(target)) return true;

        const nodeDetails = target.data.effector;
        const meta = nodeDetails.meta;

        // remove updates event if it has no next nodes
        return !(
            meta.op === 'event' &&
            Boolean(meta.derived) &&
            meta.name === 'updates' &&
            nodeDetails.graphite.next.length === 0
        );
    });
};

const makeTransitiveNodeReplacer = (transitiveOpType: OpType | undefined, nextOpType: OpType): ReactiveEdgeCleaner => {
    const replaceTransitiveNodesWithEdge: ReactiveEdgeCleaner = (edges, nodeMap) => {
        return edges.map((edge): ReactiveEdge => {
            //region Incoming edge of .on node
            const targetGraphite = getEdgeRelatedGraphite(edge, 'target');
            if (!targetGraphite) return edge;

            if (!hasOpType(targetGraphite, transitiveOpType)) return edge;

            const nextNodesCount = targetGraphite.next.length;

            if (nextNodesCount !== 1) {
                console.warn(`${transitiveOpType} with ${nextNodesCount} next nodes`, targetGraphite);
                return edge;
            }

            const nextGraphite = targetGraphite.next[0]!;

            if (!hasOpType(nextGraphite, nextOpType)) {
                console.warn(
                    `${transitiveOpType} with no ${nextOpType} in next node, found ${nextGraphite.meta.op}`,
                    nextGraphite
                );
                return edge;
            }

            const name = transitiveOpType ? transitiveOpType.toLowerCase() : '???';
            const id = `${edge.source} => ${nextGraphite.id}.${name}`;

            return {
                id: id,
                source: edge.source,
                target: nextGraphite.id,
                label: `.${name}`,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                },
                animated: true,
                data: {
                    edgeType: EdgeType.Reactive,
                    relatedNodes: {
                        source: edge.data.relatedNodes.source,
                        target: ensureDefined(nodeMap.get(nextGraphite.id)),
                        collapsed: [],
                    },
                },
            } satisfies ReactiveEdge;
            //endregion
        });
    };

    const clearTransitiveNodeOutcomingEdges: ReactiveEdgeCleaner = (edges) => {
        return edges.filter((edge) => {
            const sourceGraphite = getEdgeRelatedGraphite(edge, 'source');
            if (!sourceGraphite) {
                console.error('no source graphite', edge);
                return true;
            }

            return !hasOpType(sourceGraphite, transitiveOpType);
        });
    };

    return (edges, nodeMap) => {
        return [replaceTransitiveNodesWithEdge, clearTransitiveNodeOutcomingEdges].reduce(
            (cleaned, cleaner) => cleaner(cleaned, nodeMap),
            edges
        );
    };
};

const clearDotOnNodeEdges = makeTransitiveNodeReplacer(OpType.On, OpType.Store);
const clearStoreDotMapNodeEdges = makeTransitiveNodeReplacer(OpType.Map, OpType.Store);
const clearEventDotMapNodeEdges = makeTransitiveNodeReplacer(OpType.Map, OpType.Event);
const clearDotFilterMapNodeEdges = makeTransitiveNodeReplacer(OpType.FilterMap, OpType.Event);
const clearUnknownMapNodeEdges = makeTransitiveNodeReplacer(undefined, OpType.Store);

// -----------------

const removeEdgeFromReinitWithNoInputs: ReactiveEdgeCleaner = (edges) => {
    return edges.filter((edge) => {
        const sourceGraphite = getEdgeRelatedGraphite(edge, 'source');
        if (!sourceGraphite) {
            console.error('no source graphite', edge);
            return true;
        }

        if (!hasOpType(sourceGraphite, OpType.Event)) return true;
        if (!(sourceGraphite.meta.name === 'reinit')) return true;

        console.log('source', sourceGraphite);

        return edges.some((e) => e.target === edge.source);
    });
};

// -----------------

const foldEffect: ReactiveEdgeCleaner = (edges, nodeMap) => {
    const regularEffectorNodes = [...nodeMap.values()].filter(isRegularNode);

    const effectNodes = regularEffectorNodes.filter((node) => hasOpType(node.data.effector.graphite, OpType.Effect));

    const nodesByEffect = new Map<string, RegularEffectorNode[]>();

    effectNodes.forEach((effectNode) => {
        const ownedNodes = regularEffectorNodes.flatMap((node): RegularEffectorNode[] => {
            const details = node.data.effector;
            const isEventOrStore = details.hasOpType(OpType.Event) || details.hasOpType(OpType.Store);

            if (!isEventOrStore) return []

            if (details.graphite.family.owners.some((owner) => owner.id === effectNode.id))
            {
                const meta = details.meta;
                if (meta.op === 'event' && meta.name === 'finally' && meta.derived){
                    const found = edges.filter(edge => edge.source === node.id).find(edge => {

                        const target = edge.data.relatedNodes.target;
                        if (!isRegularNode(target)) {
                            return false;
                        }
                        if (target.data.effector.meta.op !== OpType.Store) return false;

                        const damnName = effectNode.data.effector.name! + '.inFlight';
                        const name = target.data.effector.name;
                        console.log(damnName, name)
                        return name === damnName;
                    })

                    console.log('found', found)

                    return [node, found?.data.relatedNodes.target].filter(<T>(x: T): x is NonNullable<T> => !!x).filter(isRegularNode)
                } else {
                    return [node]
                }
            } else {
                // no fx in owners
                return []
            }

        });
        nodesByEffect.set(effectNode.id, ownedNodes);
    });

    console.log('nodesByEffect',nodesByEffect)

    const fff = Array.from(nodesByEffect.entries()).map(([effectNodeId, children]) => {
        const childrenIds = children.map((child) => child.id);
        const edgesStartedFromOwnedNodes = children.flatMap((child) => {
            return edges.filter((edge) => {
                return edge.source === child.id && !childrenIds.includes(edge.target);
            });
        });
        return [effectNodeId, edgesStartedFromOwnedNodes] as const;
    });

    const newEdges = fff.flatMap(([effectNodeId, edgesStartedFromOwnedNodes]) => {
        return edgesStartedFromOwnedNodes.map((edge) => {
            if (!isRegularNode(edge.data.relatedNodes.source)) {
                throw new RangeError('Accidentally found non-regular node');
            }
            const sourceMeta = edge.data.relatedNodes.source.data.effector.graphite.meta;
            if (!isUnitMeta(sourceMeta)) {
                throw new RangeError('Accidentally found non-unit meta');
            }

            return {
                ...edge,
                id: 'fx:' + effectNodeId + ' ' + edge.source + ' => ' + edge.target,
                source: effectNodeId,
                sourceHandle: sourceMeta.name,
                target: edge.target,
                label: edge.label,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                },
                data: {
                    edgeType: EdgeType.Reactive,
                    relatedNodes: {
                        source: effectNodes.find((node) => node.id === effectNodeId)!,
                        target: edge.data.relatedNodes.target,
                        collapsed: [edge.data.relatedNodes.source, ...(edge.data.relatedNodes.collapsed ?? [])],
                    },
                },
            } satisfies ReactiveEdge;
        });
    });

    const edgesToRemove = fff.flatMap(([, edgesStartedFromOwnedNodes]) => {
        return edgesStartedFromOwnedNodes
    })

    return [...edges.filter(edge => !edgesToRemove.includes(edge)),/*...newEdges*/];
};

// -----------------

export const cleanReactiveEdges: EdgeCleaner = (edges, nodeMap) => {
    const reactive: ReactiveEdge[] = [];
    const other: (OwnershipEdge | LinkEdge | UnknownEdge)[] = [];

    for (const edge of edges) {
        if (isReactiveEdge(edge)) {
            reactive.push(edge);
        } else {
            other.push(edge);
        }
    }

    const cleanedReactiveEdges = [
        removeEdgeFromReinitWithNoInputs,
        removeStoreUpdatesWithNoInputs,
        clearDotOnNodeEdges,
        clearStoreDotMapNodeEdges,
        clearEventDotMapNodeEdges,
        clearDotFilterMapNodeEdges,
        clearUnknownMapNodeEdges,
        // foldEffect,
    ].reduce((cleaned, cleaner) => cleaner(cleaned, nodeMap), reactive);
    return [...cleanedReactiveEdges, ...other];
};
