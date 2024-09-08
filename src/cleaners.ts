import { EffectorGraph, EffectorNode, Graphite, OpType } from './types.ts';
import { formatMeta, isRegularNode } from './lib.ts';
import { MarkerType } from '@xyflow/system';

export const removeUnusedUpdatesEvent = (graph: EffectorGraph): EffectorGraph => {
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

    const edgesForDeletion = graph.edges.filter((edge) => isForDeletion(edge.__graphite_from, edge.__graphite_to));

    const cleanedGraph = shallowCopyGraph(graph);

    for (const edge of edgesForDeletion) {
        cleanedGraph.nodes = cleanedGraph.nodes.filter(({ id }) => id !== edge.toId);
    }

    cleanedGraph.edges = cleanedGraph.edges.filter((edge) => !edge.isForDeletion);

    return cleanedGraph;
};

function foo(cleanedGraph: EffectorGraph, node: EffectorNode, nodesIdsForDeletion: Set<string>) {
    if (!isRegularNode(node)) return;

    const next = node.graphite.next;
    if (next.length !== 1) {
        if (next.length > 1) {
            console.warn('.on node with several next nodes', next);
        } else {
            console.info('.on with no next nodes', next);
        }
    }

    const nextId = next[0].id;
    const ownerIds = node.graphite.family.owners.map((x) => x.id).filter((id) => id !== nextId);
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
            fromId: ownerId,
            toId: nextId,
            from: ownerNode.graphite.meta,
            to: nextNode.graphite.meta,
            fromFormatted: formatMeta(ownerId, ownerNode.graphite.meta),
            toFormatted: formatMeta(nextId, nextNode.graphite.meta),
            isForDeletion: false,
            __graphite_from: ownerNode.graphite,
            __graphite_to: nextNode.graphite,
            // targetHandle: '.on',
            markerEnd: {
                type: MarkerType.Arrow,
            },
            animated: true,
            collapsed: [node],
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

export const collapseDotOn = (graph: EffectorGraph): EffectorGraph => {
    const cleanedGraph = shallowCopyGraph(graph);

    const nodesIdsForDeletion = new Set<string>();

    cleanedGraph.nodes.filter(isRegularNode).forEach((node) => {
        if (node.graphite.meta.op === OpType.On) {
            foo(cleanedGraph, node, nodesIdsForDeletion);
        }
    });

    cleanedGraph.nodes = cleanedGraph.nodes.filter((node) => !nodesIdsForDeletion.has(node.id));

    return cleanedGraph;
};

function removeUnusedReinitNodes(graph: EffectorGraph): EffectorGraph {
    const cleanedGraph = shallowCopyGraph(graph);

    const nodeIdsToRemove = new Set<string>();

    cleanedGraph.nodes.filter(isRegularNode).forEach((node) => {
        if (node.graphite.meta.op === OpType.Event && node.graphite.meta.name === 'reinit') {
            if (node.graphite.family.owners.length === 0) {
                nodeIdsToRemove.add(node.id);
            } else {
                console.log('Node has owners, not removing:', node.graphite);
            }
        }
    });

    cleanedGraph.nodes = cleanedGraph.nodes.filter((node) => !nodeIdsToRemove.has(node.id));
    cleanedGraph.edges = cleanedGraph.edges.filter(
        (edge) => !nodeIdsToRemove.has(edge.fromId) && !nodeIdsToRemove.has(edge.toId)
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

function replaceMapNodeWithEdge(cleanedGraph: EffectorGraph, node: EffectorNode, nodesIdsForDeletion: Set<string>) {
    if (!isRegularNode(node)) return;

    const next = node.graphite.next;
    if (next.length !== 1) {
        if (next.length > 1) {
            console.warn('.map node with several next nodes', next);
        } else {
            console.info('.map with no next nodes', next);
        }
    }

    const nextId = next[0].id;
    const ownerIds = node.graphite.family.owners.map((x) => x.id).filter((id) => id !== nextId);
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
            fromId: ownerId,
            toId: nextId,
            from: ownerNode.graphite.meta,
            to: nextNode.graphite.meta,
            fromFormatted: formatMeta(ownerId, ownerNode.graphite.meta),
            toFormatted: formatMeta(nextId, nextNode.graphite.meta),
            isForDeletion: false,
            __graphite_from: ownerNode.graphite,
            __graphite_to: nextNode.graphite,
            // sourceHandle: '.map',
            markerEnd: {
                type: MarkerType.Arrow,
            },
            animated: true,
            collapsed: [node],
            label: '.map',
        });

        nodesIdsForDeletion.add(node.id);
    } else {
        console.warn('not regular node', ownerNode, nextNode);
    }
}

function collapseMappingNodes(graph: EffectorGraph): EffectorGraph {
    const cleanedGraph = shallowCopyGraph(graph);

    const nodesIdsForDeletion = new Set<string>();

    cleanedGraph.nodes.filter(isRegularNode).forEach((node) => {
        if (node.graphite.meta.op === OpType.Map) {
            const owners = node.graphite.family.owners
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
                .filter((owner) => !node.graphite.next.includes(owner));

            if (owners.length === 1) {
                replaceMapNodeWithEdge(cleanedGraph, node, nodesIdsForDeletion);
            } else {
                console.log('.map with too many owners', node, owners);
            }
        }
    });

    cleanedGraph.nodes = cleanedGraph.nodes.filter((node) => !nodesIdsForDeletion.has(node.id));

    return cleanedGraph;
}

function replaceFilterMapNodeWithEdge(
    cleanedGraph: EffectorGraph,
    node: EffectorNode,
    nodesIdsForDeletion: Set<string>
) {
    if (!isRegularNode(node)) return;

    const next = node.graphite.next;
    if (next.length !== 1) {
        if (next.length > 1) {
            console.warn('.map node with several next nodes', next);
        } else {
            console.info('.map with no next nodes', next);
        }
    }

    const nextId = next[0].id;
    const ownerIds = node.graphite.family.owners.map((x) => x.id).filter((id) => id !== nextId);
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
            fromId: ownerId,
            toId: nextId,
            from: ownerNode.graphite.meta,
            to: nextNode.graphite.meta,
            fromFormatted: formatMeta(ownerId, ownerNode.graphite.meta),
            toFormatted: formatMeta(nextId, nextNode.graphite.meta),
            isForDeletion: false,
            __graphite_from: ownerNode.graphite,
            __graphite_to: nextNode.graphite,
            // sourceHandle: '.map',
            markerEnd: {
                type: MarkerType.Arrow,
            },
            animated: true,
            collapsed: [node],
            label: '.map',
        });

        nodesIdsForDeletion.add(node.id);
    } else {
        console.warn('not regular node', ownerNode, nextNode);
    }
}

function collapseFilterMappingNodes(graph: EffectorGraph): EffectorGraph {
    const cleanedGraph = shallowCopyGraph(graph);

    const nodesIdsForDeletion = new Set<string>();

    cleanedGraph.nodes.filter(isRegularNode).forEach((node) => {
        if (node.graphite.meta.op === OpType.FilterMap) {
            const owners = node.graphite.family.owners.filter((owner) => !node.graphite.next.includes(owner));

            if (owners.length === 1) {
                replaceFilterMapNodeWithEdge(cleanedGraph, node, nodesIdsForDeletion);
            } else {
                console.log('.map with too many owners', node, owners);
            }
        }
    });

    cleanedGraph.nodes = cleanedGraph.nodes.filter((node) => !nodesIdsForDeletion.has(node.id));

    return cleanedGraph;
}

// ToDo don't delete instantly - just mark for deletion - ease to debug

export const cleanup = (graph: EffectorGraph): EffectorGraph => {
    return [
        removeUnusedUpdatesEvent,
        collapseDotOn,
        removeUnusedReinitNodes,
        resetPositions,
        collapseMappingNodes,
        collapseFilterMappingNodes,
    ].reduce((graph, cleaner) => cleaner(graph), graph);
};
