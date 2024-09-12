import {
    EdgeType,
    EffectorGraph,
    EffectorNode,
    LinkEdge,
    MyEdge,
    OpType,
    OwnershipEdge,
    ReactiveEdge, RegularEffectorNode,
    UnknownEdge,
} from './types.ts';
import { MarkerType } from '@xyflow/system';
import { ensureDefined } from './oo/model.ts';
import {
    getEdgeRelatedGraphite,
    getEdgesBy,
    getOwnershipEdgesBy,
    GraphTypedEdges,
    hasOpType,
    isDeclarationNode,
    isRegularNode,
    nodeHasOpType,
} from './lib.ts';

interface EdgeCleaner {
    (graph: EffectorGraph): MyEdge[];
}

type Lookups = { nodes: Map<string, EffectorNode>; edgesBySource: GraphTypedEdges; edgesByTarget: GraphTypedEdges };

interface EdgeCleanerImpl<T extends MyEdge = MyEdge> {
    (edges: T[], lookups: Lookups): T[];
}

type OwnershipEdgeCleaner = EdgeCleanerImpl<OwnershipEdge>;

function isOwnershipEdge(edge: MyEdge): edge is OwnershipEdge {
    return edge.data.edgeType === EdgeType.Ownership;
}

// -----------------

type NodeWithRelatedEdges = { incoming: OwnershipEdge[]; outgoing: OwnershipEdge[]; node: EffectorNode };

function findNodeByOpTypeWithRelatedEdges(opType: OpType, lookups: Lookups, extraFilter: (node:RegularEffectorNode) => boolean = () => true): NodeWithRelatedEdges[] {
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

const makeTransitiveNodeReplacer = (transitiveOpType: OpType): OwnershipEdgeCleaner => {
    const replaceTransitiveNodesWithEdge: OwnershipEdgeCleaner = (edges, lookups) => {
        const edgesToRemove: OwnershipEdge[] = [];
        const newEdges: OwnershipEdge[] = [];

        findNodeByOpTypeWithRelatedEdges(transitiveOpType, lookups).forEach(({ node, incoming, outgoing }) => {
            console.log('nodeWithRelatedEdges', { node, incoming, outgoing });

            const { factoryOwners, nonFactoryOwners } = incoming.reduce<{
                factoryOwners: OwnershipEdge[];
                nonFactoryOwners: OwnershipEdge[];
            }>(
                (acc, edge) => {
                    const owner = lookups.nodes.get(edge.source)!;
                    if (isRegularNode(owner)) {
                        if (owner.data.effector.isFactory) {
                            acc.factoryOwners.push(edge);
                        } else {
                            acc.nonFactoryOwners.push(edge);
                        }
                    }
                    return acc;
                },
                { factoryOwners: [], nonFactoryOwners: [] }
            );

            const regularChildren = outgoing.filter((edge) => {
                const child = lookups.nodes.get(edge.target)!;
                return isRegularNode(child) && !child.data.effector.isFactory;
            });

            console.log('factoryOwners', factoryOwners);
            console.log('nonFactoryOwners', nonFactoryOwners);
            console.log('regularChildren', regularChildren);

            if (nonFactoryOwners.length === 0) {
                console.warn('transitive node has no non-factory owners', node);
                return;
            }

            if (nonFactoryOwners.length > 1) {
                console.warn('transitive node has multiple non-factory owners', node);
                return;
            }

            const owner = nonFactoryOwners[0];

            if (regularChildren.length === 0) {
                console.warn('transitive node has no regular children', node);
                return;
            }

            if (regularChildren.length > 1) {
                console.warn('transitive node has multiple regular children', node);
                return;
            }

            const child = regularChildren[0];

            newEdges.push({
                id: `${owner.source} owns ${child.target}`,
                source: owner.source,
                target: child.target,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                },
                style: {
                    stroke: 'rgba(132,215,253,0.7)',
                },
                data: {
                    edgeType: EdgeType.Ownership,
                    relatedNodes: {
                        source: owner.data.relatedNodes.source,
                        target: child.data.relatedNodes.target,
                        collapsed: [node],
                    },
                },
                label: `.${transitiveOpType}`,
            });

            edgesToRemove.push(...factoryOwners, ...nonFactoryOwners, ...regularChildren);
        });

        return edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...newEdges);

        // return edges.flatMap((edge): OwnershipEdge[] => {
        //     //region Incoming edge of .on node
        //     const targetNode = nodeMap.get(edge.target);
        //     if (!targetNode) return [edge];
        //
        //     if (!nodeHasOpType(targetNode, transitiveOpType)) return [edge];
        //
        //     const nextEdges = edgesBySource.get(edge.target);
        //     const nextNodesCount = nextEdges?.length;
        //
        //     if (nextNodesCount !== 1) {
        //         console.warn(`${transitiveOpType} with ${nextNodesCount} next nodes`, targetNode);
        //         return [edge];
        //     }
        //
        //     const nextGraphite = targetNode.next[0]!;
        //
        //     if (!hasOpType(nextGraphite, nextOpType)) {
        //         console.warn(
        //             `${transitiveOpType} with no ${nextOpType} in next node, found ${nextGraphite.meta.op}`,
        //             nextGraphite
        //         );
        //         return [edge];
        //     }
        //
        //     if (edge.source === nextGraphite.id) {
        //         console.debug('loop - remove edge', edge);
        //         return [];
        //     }
        //
        //     const id = `${edge.source} owns ${nextGraphite.id}`;
        //
        //     return [
        //         {
        //             id: id,
        //             source: edge.source,
        //             target: nextGraphite.id,
        //             label: `.${transitiveOpType ? transitiveOpType.toLowerCase() : '???'}`,
        //             markerEnd: {
        //                 type: MarkerType.ArrowClosed,
        //             },
        //             style: {
        //                 stroke: 'rgba(132,215,253,0.7)',
        //             },
        //             data: {
        //                 edgeType: EdgeType.Ownership,
        //                 relatedNodes: {
        //                     source: edge.data.relatedNodes.source,
        //                     target: ensureDefined(nodeMap.get(nextGraphite.id)),
        //                     collapsed: [],
        //                 },
        //             },
        //         },
        //     ] satisfies OwnershipEdge[];
        //     //endregion
        // });
    };

    const clearTransitiveNodeOutcomingEdges: OwnershipEdgeCleaner = (edges) => {
        return edges; /*.filter((edge) => {
            const sourceGraphite = getEdgeRelatedGraphite(edge, 'source');
            if (!sourceGraphite) {
                console.error('no source graphite', edge);
                return true;
            }

            return !hasOpType(sourceGraphite, transitiveOpType);
        });*/
    };

    return (edges, nodeMap) => {
        return [replaceTransitiveNodesWithEdge, clearTransitiveNodeOutcomingEdges].reduce(
            (cleaned, cleaner) => cleaner(cleaned, nodeMap),
            edges
        );
    };
};

// const clearStoreDotMapEdges = makeTransitiveNodeReplacer(OpType.Map, OpType.Store);
// const clearEventDotMapEdges = makeTransitiveNodeReplacer(OpType.Map, OpType.Event);
const clearDotOnEdges = makeTransitiveNodeReplacer(OpType.On);
const clearDotMapEdges = makeTransitiveNodeReplacer(OpType.Map);
const clearDotFilterMapEdges = makeTransitiveNodeReplacer(OpType.FilterMap);
// const clearStoreUnknownEdges = makeTransitiveNodeReplacer(undefined, OpType.Store);

// -----------------

function isTargetedIntoReinit(edge: OwnershipEdge, key: 'target' | 'source') {
    const target = edge.data!.relatedNodes[key];
    if (isDeclarationNode(target)) return false;

    const nodeDetails = target.data.effector;
    const meta = nodeDetails.meta;

    // take a look. is it derived event names 'updates'?
    const isDerivedUpdatedEvent = meta.op === 'event' && Boolean(meta.derived) && meta.name === 'updates';

    return isDerivedUpdatedEvent;
}

const removeStoreUpdatesWithNoChildren: OwnershipEdgeCleaner = (edges,lookups) => {
    const edgesToRemove: OwnershipEdge[] = [];

    const nodes = findNodeByOpTypeWithRelatedEdges(OpType.Event, lookups, node => node.data.effector.name === 'updates' && node.data.effector.isDerived)

    for (const {incoming, outgoing} of nodes) {
        if (outgoing.length === 0) {
            edgesToRemove.push(...incoming)
        }
    }

    return edges.filter((edge) => !edgesToRemove.includes(edge));
};

// -----------------

const removeReinit: OwnershipEdgeCleaner = (edges, lookups) => {
    const nodes = findNodeByOpTypeWithRelatedEdges(OpType.Event, lookups, node => node.data.effector.name === 'reinit')

    const edgesToRemove: OwnershipEdge[] = [];
    const edgesToAdd: OwnershipEdge[] = [];

    console.log('reinit', nodes)

    for (const {node, incoming, outgoing} of nodes) {
        if (outgoing.length === 0) {
            console.warn('no outgoing edges for reinit event', node, outgoing);
            continue;
        }

        if (outgoing.length > 1) {
            console.warn('expected one, but found few outgoing edges for reinit event', node, outgoing);
            continue;
        }

        const singleOutgoingEdge = outgoing[0];

        for (const incomingEdge of incoming) {
            edgesToAdd.push({
                id: `${incomingEdge.source} owns ${singleOutgoingEdge.target} [collaped of ${node.id}]`,
                source: incomingEdge.source,
                target: singleOutgoingEdge.target,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                },
                style: {
                    stroke: 'rgba(132,215,253,0.7)',
                },
                label: `${incomingEdge.source} 🔽 ${singleOutgoingEdge.target}`,
                data: {
                    edgeType: 'ownership',
                    relatedNodes: {
                        source: incomingEdge.data.relatedNodes.source,
                        target: singleOutgoingEdge.data.relatedNodes.target,
                        collapsed: [node],
                    },
                },
            })
        }

        edgesToRemove.push(...incoming, ...outgoing);
    }

    console.log('edgesToRemove', edgesToRemove)
    console.log('edgesToAdd', edgesToAdd)

    return edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd);
    // return edges.filter((edge) => {
    //     const sourceGraphite = getEdgeRelatedGraphite(edge, 'source');
    //     if (!sourceGraphite) {
    //         console.error('no source graphite', edge);
    //         return true;
    //     }
    //
    //     if (!hasOpType(sourceGraphite, OpType.Event)) return true;
    //     if (!(sourceGraphite.meta.name === 'reinit')) return true;
    //
    //     return sourceGraphite.family.owners.length > 0;
    // });
};

// -----------------

const makeReverseOwnershipCleaner = (opType: OpType): OwnershipEdgeCleaner => {
    return (edges, lookups) => {
        const edgesToRemove: Set<OwnershipEdge> = new Set();

        findNodeByOpTypeWithRelatedEdges(opType, lookups).forEach(({ node, incoming, outgoing }) => {
            console.log('nodeWithRelatedEdges', { node, incoming, outgoing });

            for (const outgoingEdge of outgoing) {
                // look for edges that sourced from outgoingEdge.target and targered into outgoingEdge.source

                const edgesFromTarget = lookups.edgesBySource.owhership.get(outgoingEdge.target);
                const looped = edgesFromTarget?.filter((edgeFromTarget) => edgeFromTarget.target === outgoingEdge.source);

                if (looped?.length) {
                    console.log(outgoingEdge, 'looped', looped);
                    if (looped.length > 1) console.error('more than one looped edges', looped);
                    else {
                        edgesToRemove.add(looped[0]);
                    }
                }
            }
        });

        console.log('edgesToRemove', edgesToRemove);

        return edges.filter((edge) => !edgesToRemove.has(edge));
    };

}

// -----------------

export const cleanOwnershipEdges: EdgeCleaner = (graph) => {
    const ownership: OwnershipEdge[] = [];
    const other: (ReactiveEdge | LinkEdge | UnknownEdge)[] = [];

    for (const edge of graph.edges) {
        if (isOwnershipEdge(edge)) {
            ownership.push(edge);
        } else {
            other.push(edge);
        }
    }

    const cleaners: OwnershipEdgeCleaner[] = [
        makeReverseOwnershipCleaner(OpType.On),
        makeReverseOwnershipCleaner(OpType.Map),
        makeReverseOwnershipCleaner(OpType.FilterMap),
        makeReverseOwnershipCleaner(OpType.Sample),
        // clearEventDotMapEdges,
        clearDotOnEdges,
        clearDotMapEdges,
        clearDotFilterMapEdges,
        removeReinit,
        // clearStoreUnknownEdges,
        removeStoreUpdatesWithNoChildren,
    ];
    const cleanedOwnershipEdges = cleaners.reduce((cleaned, cleaner) => {
        return cleaner(cleaned, {
            edgesBySource: getEdgesBy(cleaned, 'source'),
            edgesByTarget: getEdgesBy(cleaned, 'target'),
            nodes: new Map(graph.nodes.map((node) => [node.id, node])),
        });
    }, ownership);
    return [...cleanedOwnershipEdges, ...other];
};
