import { EffectorGraph, EffectorNode, Graphite, NodeFamily, OpType } from './types.ts';
import { isRegularNode } from './lib.ts';
import { MarkerType } from '@xyflow/system';
import { ensureDefined } from './oo/model.ts';

interface Cleaner {
    (graph: EffectorGraph, nodeMap: Map<string, EffectorNode>): EffectorGraph;
}

export const removeUnusedUpdatesEvent: Cleaner = (graph: EffectorGraph): EffectorGraph => {
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
            relatedNodes.source.nodeType !== NodeFamily.Declaration &&
            relatedNodes.target.nodeType !== NodeFamily.Declaration
        )
            return isForDeletion(relatedNodes.source.effector.graphite, relatedNodes.target.effector.graphite);
    });

    const cleanedGraph = shallowCopyGraph(graph);

    for (const edge of edgesForDeletion) {
        cleanedGraph.nodes = cleanedGraph.nodes.filter(({ id }) => id !== edge.target);
    }

    cleanedGraph.edges = cleanedGraph.edges.filter((edge) => !edge.markedForDeletion);

    return cleanedGraph;
};

function foo(
    cleanedGraph: EffectorGraph,
    node: EffectorNode,
    nodesIdsForDeletion: Set<string>,
    nodeMap: Map<string, EffectorNode>
) {
    if (!isRegularNode(node)) return;

    const next = node.effector.graphite.next;
    if (next.length !== 1) {
        if (next.length > 1) {
            console.warn('.on node with several next nodes', next);
        } else {
            console.info('.on with no next nodes', next);
        }
    }

    const nextId = next[0].id;
    const ownerIds = node.effector.graphite.family.owners.map((x) => x.id).filter((id) => id !== nextId);
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
        if (node.effector.graphite.meta.op === OpType.On) {
            foo(cleanedGraph, node, nodesIdsForDeletion, nodeMap);
        }
    });

    cleanedGraph.nodes = cleanedGraph.nodes.filter((node) => !nodesIdsForDeletion.has(node.id));

    return cleanedGraph;
};

function removeUnusedReinitNodes(graph: EffectorGraph): EffectorGraph {
    const cleanedGraph = shallowCopyGraph(graph);

    const nodeIdsToRemove = new Set<string>();

    cleanedGraph.nodes.filter(isRegularNode).forEach((node) => {
        if (node.effector.graphite.meta.op === OpType.Event && node.effector.graphite.meta.name === 'reinit') {
            if (node.effector.graphite.family.owners.length === 0) {
                nodeIdsToRemove.add(node.id);
            } else {
                console.log('Node has owners, not removing:', node.effector.graphite);
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

    const next = node.effector.graphite.next;
    if (next.length !== 1) {
        if (next.length > 1) {
            console.warn('.map node with several next nodes', next);
        } else {
            console.info('.map with no next nodes', next);
        }
    }

    const nextId = next[0].id;
    const ownerIds = node.effector.graphite.family.owners.map((x) => x.id).filter((id) => id !== nextId);
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
        if (node.effector.graphite.meta.op === OpType.Map) {
            const owners = node.effector.graphite.family.owners
                .filter((owner) => {
                    console.log('try op', owner.meta);
                    if (owner.meta.op == null) {
                        console.log(owner.meta);
                        if (owner.meta.type === 'factory') {
                            return false;
                        }
                    }

                    return true;
                })
                .filter((owner) => !node.effector.graphite.next.includes(owner));

            if (owners.length === 1) {
                replaceMapNodeWithEdge(cleanedGraph, node, nodesIdsForDeletion, nodeMap);
            } else {
                console.log('.map with too many owners', node, owners);
            }
        }
    });

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

    const next = node.effector.graphite.next;
    if (next.length !== 1) {
        if (next.length > 1) {
            console.warn('.map node with several next nodes', next);
        } else {
            console.info('.map with no next nodes', next);
        }
    }

    const nextId = next[0].id;
    const ownerIds = node.effector.graphite.family.owners.map((x) => x.id).filter((id) => id !== nextId);
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
        if (node.effector.graphite.meta.op === OpType.FilterMap) {
            const owners = node.effector.graphite.family.owners.filter(
                (owner) => !node.effector.graphite.next.includes(owner)
            );

            if (owners.length === 1) {
                replaceFilterMapNodeWithEdge(cleanedGraph, node, nodesIdsForDeletion, nodeMap);
            } else {
                console.log('.map with too many owners', node, owners);
            }
        }
    });

    cleanedGraph.nodes = cleanedGraph.nodes.filter((node) => !nodesIdsForDeletion.has(node.id));

    return cleanedGraph;
};

// ToDo don't delete instantly - just mark for deletion - ease to debug

export const cleanup = (graph: EffectorGraph, nodeMap: Map<string, EffectorNode>): EffectorGraph => {
    return [
        removeUnusedUpdatesEvent,
        collapseDotOn,
        removeUnusedReinitNodes,
        resetPositions,
        collapseMappingNodes,
        collapseFilterMappingNodes,
    ].reduce((graph, cleaner) => cleaner(graph, nodeMap), graph);
};
