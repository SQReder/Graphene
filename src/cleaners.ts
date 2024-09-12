import {
    EdgeType,
    EffectorGraph,
    EffectorNode,
    Graphite,
    MyEdge,
    NodeFamily,
    OpType,
    ReactiveEdge,
    RegularEffectorNode,
} from './types.ts';
import { getEdgesBy, GraphTypedEdges, isDeclarationNode, isRegularNode } from './lib.ts';
import { MarkerType } from '@xyflow/system';
import { ensureDefined } from './oo/model.ts';

interface GraphCleaner {
    (graph: EffectorGraph, nodeMap: Map<string, EffectorNode>): EffectorGraph;
}

export const removeUnusedUpdatesEvent: GraphCleaner = (graph): EffectorGraph => {
    function isForDeletion(current: Graphite, next: Graphite) {
        if (
            current.meta.op === OpType.Store &&
            next.meta.op === OpType.Event &&
            next.meta.derived &&
            next.meta.name === 'updates'
        ) {
            return next.next.length === 0;
        }

        return false;
    }

    const edgesForDeletion = graph.edges.filter((edge) => {
        const { source, target } = edge.data!.relatedNodes;
        if (source.data.nodeType !== NodeFamily.Declaration && target.data.nodeType !== NodeFamily.Declaration)
            return isForDeletion(source.data.effector.graphite, target.data.effector.graphite);
    });

    for (const edge of edgesForDeletion) {
        graph.nodes = graph.nodes.filter(({ id }) => id !== edge.target);
    }

    graph.edges = graph.edges.filter((edge) => !edgesForDeletion.includes(edge));

    return graph;
};

function foo(
    cleanedGraph: EffectorGraph,
    node: EffectorNode,
    nodesIdsForDeletion: Set<string>,
    nodeMap: Map<string, EffectorNode>
) {
    if (!isRegularNode(node)) return;

    const next = node.data.effector.graphite.next;
    if (next.length !== 1) {
        if (next.length > 1) {
            console.warn('.on node with several next nodes', next);
        } else {
            console.info('.on with no next nodes', next);
        }
    }

    const nextId = next[0].id;
    const ownerIds = node.data.effector.graphite.family.owners.map((x) => x.id).filter((id) => id !== nextId);
    if (ownerIds.length !== 1) {
        if (ownerIds.length > 1) {
            console.warn('.on node with several owner nodes', ownerIds);
        } else {
            console.info('.on with no owner nodes', ownerIds);
            node.style!.background = 'red';
        }
    }

    const ownerId = ownerIds[0];

    const nextNode = cleanedGraph.nodes.find((x) => x.id === nextId);
    if (!nextNode) {
        console.warn('next node not found', nextId);
        return;
    }

    const ownerNode = cleanedGraph.nodes.find((x) => x.id === ownerId);

    if (!ownerNode) {
        console.warn('owner node not found', ownerId);
        return;
    }

    if (isRegularNode(ownerNode) && isRegularNode(nextNode)) {
        cleanedGraph.edges.push({
            id: ownerId + '::' + nextId,
            source: ownerId,
            target: nextId,
            markerEnd: {
                type: MarkerType.Arrow,
            },
            animated: true,
            label: '.on',
            data: {
                edgeType: EdgeType.Unknown,
                relatedNodes: {
                    source: ensureDefined(nodeMap.get(ownerId)),
                    target: ensureDefined(nodeMap.get(nextId)),
                    collapsed: [ensureDefined(nodeMap.get(node.id))],
                },
            },
        });

        nodesIdsForDeletion.add(node.id);
    } else {
        console.warn('not regular node', ownerNode, nextNode);
    }
}

function shallowCopyGraph(graph: EffectorGraph) {
    return {
        nodes: [...graph.nodes],
        edges: [...graph.edges],
    };
}

export const collapseDotOn: GraphCleaner = (graph, nodeMap): EffectorGraph => {
    const cleanedGraph = shallowCopyGraph(graph);

    const nodesIdsForDeletion = new Set<string>();

    cleanedGraph.nodes.filter(isRegularNode).forEach((node) => {
        if (node.data.effector.graphite.meta.op === OpType.On) {
            foo(cleanedGraph, node, nodesIdsForDeletion, nodeMap);
        }
    });

    cleanedGraph.edges = cleanedGraph.edges.filter(
        (edge) => !nodesIdsForDeletion.has(edge.target) || !nodesIdsForDeletion.has(edge.source)
    );
    cleanedGraph.nodes = cleanedGraph.nodes.filter((node) => !nodesIdsForDeletion.has(node.id));

    return cleanedGraph;
};

function replaceMapNodeWithEdge(
    cleanedGraph: EffectorGraph,
    node: EffectorNode,
    nodesIdsForDeletion: Set<string>,
    nodeMap: Map<string, EffectorNode>
) {
    if (!isRegularNode(node)) return;

    const next = node.data.effector.graphite.next;
    if (next.length !== 1) {
        if (next.length > 1) {
            console.warn('.map node with several next nodes', next);
        } else {
            console.info('.map with no next nodes', next);
        }
    }

    const nextId = next[0].id;
    const ownerIds = node.data.effector.graphite.family.owners.map((x) => x.id).filter((id) => id !== nextId);
    if (ownerIds.length !== 1) {
        if (ownerIds.length > 1) {
            console.warn('.map node with several owner nodes', ownerIds);
        } else {
            console.info('.map with no owner nodes', ownerIds);
            node.style!.background = 'red';
        }
    }

    const ownerId = ownerIds[0];

    const nextNode = cleanedGraph.nodes.find((x) => x.id === nextId);
    if (!nextNode) {
        console.warn('next node not found', nextId);
        return;
    }

    const ownerNode = cleanedGraph.nodes.find((x) => x.id === ownerId);

    if (!ownerNode) {
        console.warn('owner node not found', ownerId);
        return;
    }

    if (isRegularNode(ownerNode) && isRegularNode(nextNode)) {
        cleanedGraph.edges.push({
            id: ownerId + '::' + nextId,
            source: ownerId,
            target: nextId,
            // sourceHandle: '.map',
            markerEnd: {
                type: MarkerType.Arrow,
            },
            animated: true,
            label: '.map',
            data: {
                edgeType: 'unknown',
                relatedNodes: {
                    source: ensureDefined(nodeMap.get(ownerId)),
                    target: ensureDefined(nodeMap.get(nextId)),
                    collapsed: [node],
                },
            },
        });

        nodesIdsForDeletion.add(node.id);
    } else {
        console.warn('not regular node', ownerNode, nextNode);
    }
}

const collapseMappingNodes: GraphCleaner = (graph, nodeMap) => {
    const nodesIdsForDeletion = new Set<string>();

    graph.nodes.filter(isRegularNode).forEach((node) => {
        if (node.data.effector.graphite.meta.op === OpType.Map) {
            const owners = node.data.effector.graphite.family.owners
                .filter((owner) => {
                    if (owner.meta.op == null) {
                        console.log(owner.meta);
                        if (owner.meta.type === 'factory') {
                            return false;
                        }
                    }

                    return true;
                })
                .filter((owner) => !node.data.effector.graphite.next.includes(owner));

            if (owners.length === 1) {
                replaceMapNodeWithEdge(graph, node, nodesIdsForDeletion, nodeMap);
            } else {
                console.log('.map with too many owners', node, owners);
            }
        }
    });

    graph.edges = graph.edges.filter(
        (edge) => !nodesIdsForDeletion.has(edge.target) && !nodesIdsForDeletion.has(edge.source)
    );
    graph.nodes = graph.nodes.filter((node) => !nodesIdsForDeletion.has(node.id));

    return graph;
};

function replaceFilterMapNodeWithEdge(
    cleanedGraph: EffectorGraph,
    node: EffectorNode,
    nodesIdsForDeletion: Set<string>,
    nodeMap: Map<string, EffectorNode>
) {
    if (!isRegularNode(node)) return;

    const next = node.data.effector.graphite.next;
    if (next.length !== 1) {
        if (next.length > 1) {
            console.warn('.map node with several next nodes', next);
        } else {
            console.info('.map with no next nodes', next);
        }
    }

    const nextId = next[0].id;
    const ownerIds = node.data.effector.graphite.family.owners.map((x) => x.id).filter((id) => id !== nextId);
    if (ownerIds.length !== 1) {
        if (ownerIds.length > 1) {
            console.warn('.map node with several owner nodes', ownerIds);
        } else {
            console.info('.map with no owner nodes', ownerIds);
            node.style!.background = 'red';
        }
    }

    const ownerId = ownerIds[0];

    const nextNode = cleanedGraph.nodes.find((x) => x.id === nextId);
    if (!nextNode) {
        console.warn('next node not found', nextId);
        return;
    }

    const ownerNode = cleanedGraph.nodes.find((x) => x.id === ownerId);

    if (!ownerNode) {
        console.warn('owner node not found', ownerId);
        return;
    }

    if (isRegularNode(ownerNode) && isRegularNode(nextNode)) {
        cleanedGraph.edges.push({
            id: ownerId + '::' + nextId,
            source: ownerId,
            target: nextId,
            // sourceHandle: '.map',
            markerEnd: {
                type: MarkerType.Arrow,
            },
            animated: true,
            label: '.map',
            data: {
                edgeType: 'unknown',
                relatedNodes: {
                    source: ensureDefined(nodeMap.get(ownerId)),
                    target: ensureDefined(nodeMap.get(nextId)),
                    collapsed: [node],
                },
            },
        });

        nodesIdsForDeletion.add(node.id);
    } else {
        console.warn('not regular node', ownerNode, nextNode);
    }
}

const collapseFilterMappingNodes: GraphCleaner = (graph, nodeMap) => {
    const nodesIdsForDeletion = new Set<string>();

    graph.nodes.filter(isRegularNode).forEach((node) => {
        if (node.data.effector.graphite.meta.op === OpType.FilterMap) {
            const owners = node.data.effector.graphite.family.owners.filter(
                (owner) => !node.data.effector.graphite.next.includes(owner)
            );

            if (owners.length === 1) {
                replaceFilterMapNodeWithEdge(graph, node, nodesIdsForDeletion, nodeMap);
            } else {
                console.log('.map with too many owners', node, owners);
            }
        }
    });

    graph.edges = graph.edges.filter(
        (edge) => !nodesIdsForDeletion.has(edge.target) && !nodesIdsForDeletion.has(edge.source)
    );
    graph.nodes = graph.nodes.filter((node) => !nodesIdsForDeletion.has(node.id));

    return graph;
};

const removeUnlinkedNodes: GraphCleaner = (graph) => {
    const usedNodeIds = new Set(graph.edges.flatMap((edge) => [edge.source, edge.target]));

    graph.nodes = graph.nodes.filter((node) => usedNodeIds.has(node.id));

    return graph;
};

// -----------------

type EdgeLookups = { edgesBySource: GraphTypedEdges; edgesByTarget: GraphTypedEdges };

const FxInternalNodeNames = {
    Pending: 'pending',
    InFlight: 'inFlight',
    Finally: 'finally',
    Done: 'done',
    DoneData: 'doneData',
    Fail: 'fail',
    FailData: 'failData',
    InFlightAlias: '$.inFlight',
} as const;
type FxInternalNodeNames = (typeof FxInternalNodeNames)[keyof typeof FxInternalNodeNames];

function getFxInternalNodeNames(fxNodeName: undefined | string) {
    return ['pending', 'inFlight', 'finally', 'done', 'doneData', 'fail', 'failData', `${fxNodeName}.inFlight`];
}

type FxInternalNodes = Record<FxInternalNodeNames, RegularEffectorNode>;

const getInternalOwnershipEdges = (
    fxNode: RegularEffectorNode,
    lookups: EdgeLookups,
    nodeById: Map<string, EffectorNode>
) => {
    const fxNodeId = fxNode.id;
    const fxNodeName = fxNode.data.effector.name;
    const ownershipEdges = lookups.edgesBySource.owhership.get(fxNodeId) ?? [];

    if (!ownershipEdges) {
        throw new Error('ownership edges not found');
    }

    const knownNames = getFxInternalNodeNames(fxNodeName);
    console.log('knownNames', knownNames);

    return ownershipEdges.filter((edge) => {
        const targetNode = nodeById.get(edge.target)!;
        if (!isRegularNode(targetNode)) {
            return false;
        }

        const name = targetNode.data.effector.name;

        console.log('name', name);

        if (!name) {
            console.warn('no name found in node', targetNode);
            return;
        }

        return knownNames.includes(name);
    });
};

const foldEffect3 = (
    graph: EffectorGraph,
    fxNode: RegularEffectorNode,
    lookups: EdgeLookups,
    nodeById: Map<string, EffectorNode>
) => {
    const fxNodeId = fxNode.id;
    const fxNodeName = fxNode.data.effector.name;
    console.groupCollapsed(fxNodeId, fxNodeName);

    try {
        const internalOwnershipEdges = getInternalOwnershipEdges(fxNode, lookups, nodeById);

        console.log('internalOwnershipEdges', internalOwnershipEdges);

        const internalFxNodes = internalOwnershipEdges.map((edge) => nodeById.get(edge.target)!).filter(isRegularNode);
        const internalFxNodeIds = internalFxNodes.map((node) => node.id);

        const allInternalEdges = graph.edges.filter((edge) => internalFxNodeIds.includes(edge.target));
        const allExternalEdges = graph.edges.filter((edge) => internalFxNodeIds.includes(edge.source));

        console.log('allInternalEdges', allInternalEdges);
        console.log('allExternalEdges', allExternalEdges);

        console.log('internalFxNodes', internalFxNodes);

        const internalNodesMap = [...internalFxNodes].reduce((map, node) => {
            const internalNodeName = node.data.effector.name!;
            if (internalNodeName === `${fxNodeName}.inFlight`) {
                map['$.inFlight'] = node;
            } else {
                map[internalNodeName as keyof FxInternalNodes] = node;
            }
            return map;
        }, {} as FxInternalNodes);

        console.log('internalNodesMap', internalNodesMap);

        const newEdges = Object.entries(internalNodesMap).flatMap(([key, node]) => {
            console.group('Process edges for', key);
            const outboundEgdes = lookups.edgesBySource.reactive.get(node.id) ?? [];

            console.log('outboundEgdes', outboundEgdes);

            const externalEdges = outboundEgdes.filter((edge) => {
                return !internalFxNodeIds.includes(edge.target);
            });

            console.log('externalEdges', externalEdges);

            const newEdgesForInternalNode = externalEdges.map((externalEdge): ReactiveEdge => {
                const edgeType = externalEdge.data.edgeType;
                if (edgeType !== EdgeType.Reactive) {
                    throw new Error();
                }

                return {
                    id: `${fxNodeId}.${key} => ${externalEdge.target}`,
                    source: fxNodeId,
                    target: externalEdge.target,
                    label: `.${key}`,
                    data: {
                        edgeType: edgeType,
                        relatedNodes: {
                            source: fxNode,
                            target: externalEdge.data.relatedNodes.target,
                            collapsed: [
                                externalEdge.data.relatedNodes.source,
                                ...(externalEdge.data.relatedNodes.collapsed ?? []),
                            ],
                        },
                    },
                    style: {
                        stroke: key.startsWith('done') ? 'green' : key.startsWith('fail') ? 'red' : undefined,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                    },
                    animated: true,
                };
            });

            console.groupEnd();

            return newEdgesForInternalNode;
        });

        console.log('newEdges', newEdges);

        return {
            edgesToRemove: [...internalOwnershipEdges, ...allInternalEdges, ...allExternalEdges],
            edgesToAdd: newEdges,
        };
    } catch (e) {
        console.error(e);
        return {
            edgesToRemove: [],
            edgesToAdd: [],
        };
    } finally {
        console.groupEnd();
    }
};

const foldEffect2: GraphCleaner = (graph) => {
    const lookups: EdgeLookups = {
        edgesBySource: getEdgesBy(graph.edges, 'source'),
        edgesByTarget: getEdgesBy(graph.edges, 'target'),
    };

    const nodeById = new Map<string, EffectorNode>(graph.nodes.map((node) => [node.id, node]));

    const fxNodes = graph.nodes.filter(isRegularNode).filter((node) => node.data.effector.meta.op === OpType.Effect);

    const edgesToRemove: MyEdge[] = [];
    const edgesToAdd: MyEdge[] = [];

    fxNodes.forEach((fxNode) => {
        try {
            const foldedEdges = foldEffect3(graph, fxNode, lookups, nodeById);

            edgesToRemove.push(...foldedEdges.edgesToRemove);
            edgesToAdd.push(...foldedEdges.edgesToAdd);
        } catch (e) {
            console.error(e);
        }
    });

    console.groupCollapsed('Folding results');
    console.log('edgesToRemove', edgesToRemove);
    console.log('edgesToAdd', edgesToAdd);
    console.groupEnd();

    return {
        nodes: graph.nodes,
        edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(edgesToAdd),
    };
};

// -----------------

export const cleanup: GraphCleaner = (graph: EffectorGraph, nodeMap: Map<string, EffectorNode>) => {
    return [
        // resetPositions,
        // collapseDotOn,
        // collapseMappingNodes,
        // collapseFilterMappingNodes,
        // removeUnusedUpdatesEvent,
        // removeUnusedReinitNodes,
        // foldEffect,
        foldEffect2,
        removeUnlinkedNodes,
    ].reduce((graph, cleaner) => cleaner(graph, nodeMap), shallowCopyGraph(graph));
};
