import {EffectorGraph, EffectorNode, Graphite, MyEdge, NodeFamily, OpType, RegularEffectorNode} from './types.ts';
import {isRegularNode, isUnitMeta} from './lib.ts';
import { MarkerType } from '@xyflow/system';
import { ensureDefined } from './oo/model.ts';

interface Cleaner {
    (graph: EffectorGraph, nodeMap: Map<string, EffectorNode>): EffectorGraph;
}

export const removeUnusedUpdatesEvent: Cleaner = (graph): EffectorGraph => {
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

    const edgesForDeletion = graph.edges.filter(({ relatedNodes }) => {
        if (
            relatedNodes.source.data.nodeType !== NodeFamily.Declaration &&
            relatedNodes.target.data.nodeType !== NodeFamily.Declaration
        )
            return isForDeletion(
                relatedNodes.source.data.effector.graphite,
                relatedNodes.target.data.effector.graphite
            );
    });

    const cleanedGraph = shallowCopyGraph(graph);

    for (const edge of edgesForDeletion) {
        cleanedGraph.nodes = cleanedGraph.nodes.filter(({ id }) => id !== edge.target);
    }

    cleanedGraph.edges = cleanedGraph.edges.filter((edge) => !edgesForDeletion.includes(edge));

    return cleanedGraph;
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
            relatedNodes: {
                source: ensureDefined(nodeMap.get(ownerId)),
                target: ensureDefined(nodeMap.get(nextId)),
                collapsed: [ensureDefined(nodeMap.get(node.id))],
            },
            // targetHandle: '.on',
            markerEnd: {
                type: MarkerType.Arrow,
            },
            animated: true,
            label: '.on',
            data: {
                edgeType: 'unknown',
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

export const collapseDotOn: Cleaner = (graph, nodeMap): EffectorGraph => {
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

function removeUnusedReinitNodes(graph: EffectorGraph): EffectorGraph {
    const cleanedGraph = shallowCopyGraph(graph);

    const nodeIdsToRemove = new Set<string>();

    cleanedGraph.nodes.filter(isRegularNode).forEach((node) => {
        if (
            node.data.effector.graphite.meta.op === OpType.Event &&
            node.data.effector.graphite.meta.name === 'reinit'
        ) {
            if (node.data.effector.graphite.family.owners.length === 0) {
                nodeIdsToRemove.add(node.id);
            } else {
                console.log('Node has owners, not removing:', node.data.effector.graphite);
            }
        }
    });

    cleanedGraph.nodes = cleanedGraph.nodes.filter((node) => !nodeIdsToRemove.has(node.id));
    cleanedGraph.edges = cleanedGraph.edges.filter(
        (edge) => !nodeIdsToRemove.has(edge.source) && !nodeIdsToRemove.has(edge.target)
    );

    return cleanedGraph;
}

function resetPositions(graph: EffectorGraph) {
    graph.nodes.forEach((node) => {
        node.position = {
            x: 0,
            y: 0,
        };
    });

    return graph;
}

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
            relatedNodes: {
                source: ensureDefined(nodeMap.get(ownerId)),
                target: ensureDefined(nodeMap.get(nextId)),
                collapsed: [node],
            },
            animated: true,
            label: '.map',
            data: {
                edgeType: 'unknown',
            },
        });

        nodesIdsForDeletion.add(node.id);
    } else {
        console.warn('not regular node', ownerNode, nextNode);
    }
}

const collapseMappingNodes: Cleaner = (graph, nodeMap) => {
    const cleanedGraph = shallowCopyGraph(graph);

    const nodesIdsForDeletion = new Set<string>();

    cleanedGraph.nodes.filter(isRegularNode).forEach((node) => {
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
                replaceMapNodeWithEdge(cleanedGraph, node, nodesIdsForDeletion, nodeMap);
            } else {
                console.log('.map with too many owners', node, owners);
            }
        }
    });

    cleanedGraph.edges = cleanedGraph.edges.filter(
        (edge) => !nodesIdsForDeletion.has(edge.target) && !nodesIdsForDeletion.has(edge.source)
    );
    cleanedGraph.nodes = cleanedGraph.nodes.filter((node) => !nodesIdsForDeletion.has(node.id));

    return cleanedGraph;
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
            relatedNodes: {
                source: ensureDefined(nodeMap.get(ownerId)),
                target: ensureDefined(nodeMap.get(nextId)),
                collapsed: [node],
            },
            data: {
                edgeType: 'unknown',
            },
        });

        nodesIdsForDeletion.add(node.id);
    } else {
        console.warn('not regular node', ownerNode, nextNode);
    }
}

const collapseFilterMappingNodes: Cleaner = (graph, nodeMap) => {
    const cleanedGraph = shallowCopyGraph(graph);

    const nodesIdsForDeletion = new Set<string>();

    cleanedGraph.nodes.filter(isRegularNode).forEach((node) => {
        if (node.data.effector.graphite.meta.op === OpType.FilterMap) {
            const owners = node.data.effector.graphite.family.owners.filter(
                (owner) => !node.data.effector.graphite.next.includes(owner)
            );

            if (owners.length === 1) {
                replaceFilterMapNodeWithEdge(cleanedGraph, node, nodesIdsForDeletion, nodeMap);
            } else {
                console.log('.map with too many owners', node, owners);
            }
        }
    });

    cleanedGraph.edges = cleanedGraph.edges.filter(
        (edge) => !nodesIdsForDeletion.has(edge.target) && !nodesIdsForDeletion.has(edge.source)
    );
    cleanedGraph.nodes = cleanedGraph.nodes.filter((node) => !nodesIdsForDeletion.has(node.id));

    return cleanedGraph;
};

const foldEffect: Cleaner = (graph, nodeMap) => {
    const cleanedGraph = shallowCopyGraph(graph);

    function isEffectNode(node: EffectorNode): node is RegularEffectorNode {
        return isRegularNode(node) && node.data.effector.graphite.meta.op === OpType.Effect;
    }

    const effectNodes = cleanedGraph.nodes.filter(isEffectNode);

    console.log('effect nodes', effectNodes);

    const nodesForDeletion = new Set<RegularEffectorNode>();
    const effectToDeletedNode = new Map<RegularEffectorNode, RegularEffectorNode[]>();

    effectNodes.forEach((effectNode) => {
        nodeMap.forEach((node) => {
            if (!isRegularNode(node)) return;

            if (node.data.effector.graphite.family.owners.some((owner) => owner.id === effectNode.id)) {
                if (node.data.effector.meta.op === OpType.Sample) return;
                nodesForDeletion.add(node);
                const assoc = effectToDeletedNode.get(effectNode);
                if (!assoc) effectToDeletedNode.set(effectNode, [node]);
                else assoc.push(node);
            }
        });
    });

    console.log('effectToDeletedNode', effectToDeletedNode);

    // look for damn `.on --> $inFlight`
    nodesForDeletion.forEach((node) => {
        if (node.data.effector.meta.op !== OpType.On) {
            return;
        }

        nodeMap.forEach((nooooode) => {
            if (!isRegularNode(nooooode)) return;

            if (nooooode.data.effector.graphite.family.owners.some((owner) => owner.id === node.id)) {
                nodesForDeletion.add(nooooode);
            }
        });
    });

    console.log('nodes for deletion', [...nodesForDeletion]);

    const nodesIdsForDeletion = new Set(Array.from(nodesForDeletion.values()).map((x) => x.id));


    const newEdges: MyEdge[] = []

    //region Reconnect edges
    Array.from(effectToDeletedNode.entries()).forEach(([effectNode, nodesForDeletion]) =>{
        console.group(effectNode.data.label)

        const outputNodes: RegularEffectorNode[] = [];

        nodesForDeletion.forEach((node) => {
            if (node.data.effector.meta.op === OpType.Event) {
                outputNodes.push(node);
            } else if (node.data.effector.meta.op === OpType.Store && !node.data.effector.meta.name.endsWith('.inFlight')) {
                outputNodes.push(node);
            }
        });

        console.log('output nodes', outputNodes);

        const outputEdges = cleanedGraph.edges.filter(edge => outputNodes.some(node => node.id === edge.source))

        console.log('output edges', outputEdges);

        const reactiveEdges = outputEdges.filter(edge => edge.data!.edgeType === 'reactive');

        console.log('reactive edges', reactiveEdges);

        reactiveEdges.forEach(edge => {
            const sourceNode = outputNodes.find(on => on.id === edge.source)!;
            const meta = sourceNode.data.effector.meta;
            if (!isUnitMeta(meta)) {
                console.error('now unit meta', sourceNode, meta)
                throw new Error('now unit meta')
            }
            newEdges.push({
                ...edge,
                source: effectNode.id,
                sourceHandle: meta.name
            })
        })

        console.log('new edges', newEdges)

        console.groupEnd()

    })


    // console.log('output nodes', outputNodes);
    //
    // const outputNodeIds = new Set(outputNodes.map((node) => node.id));
    //
    // const outputEdges = cleanedGraph.edges.filter(
    //     (edge) => edge.data!.edgeType === 'reactive' && outputNodeIds.has(edge.source)
    // );
    //
    // console.log('output edges', outputEdges);

    //endregion

    // delete edges
    cleanedGraph.edges = cleanedGraph.edges.filter(
        (edge) => !nodesIdsForDeletion.has(edge.source) && !nodesIdsForDeletion.has(edge.target)
    );

    cleanedGraph.edges.push(...newEdges)

    // delete nodes
    cleanedGraph.nodes = cleanedGraph.nodes.filter((node) =>
        isRegularNode(node) ? !nodesForDeletion.has(node) : true
    );

    return cleanedGraph;
};

export const cleanup: Cleaner = (graph: EffectorGraph, nodeMap: Map<string, EffectorNode>) => {
    return [
        resetPositions,
        collapseDotOn,
        collapseMappingNodes,
        collapseFilterMappingNodes,
        removeUnusedUpdatesEvent,
        removeUnusedReinitNodes,
        foldEffect,
    ].reduce((graph, cleaner) => cleaner(graph, nodeMap), graph);
};
