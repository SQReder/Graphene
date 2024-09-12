import { EdgeType, EffectorGraph, EffectorNode, MyEdge, OpType, ReactiveEdge, RegularEffectorNode } from './types.ts';
import { getEdgesBy, GraphTypedEdges, isRegularNode } from './lib.ts';
import { MarkerType } from '@xyflow/system';

interface GraphCleaner {
    (graph: EffectorGraph): EffectorGraph;
}

function shallowCopyGraph(graph: EffectorGraph) {
    return {
        nodes: [...graph.nodes],
        edges: [...graph.edges],
    };
}

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

export const cleanup: GraphCleaner = (graph: EffectorGraph) => {
    return [foldEffect2, removeUnlinkedNodes].reduce((graph, cleaner) => cleaner(graph), shallowCopyGraph(graph));
};
