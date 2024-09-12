import {
    EdgeType,
    EffectorGraph,
    EffectorNode,
    Graphite,
    MyEdge,
    OpType,
    OwnershipEdge,
    ReactiveEdge,
} from './types.ts';
import { findNodesByOpType, getEdgesBy, GraphTypedEdges, shallowCopyGraph } from './lib.ts';
import { is } from 'effector';
import { MarkerType } from '@xyflow/system';

type Lookups = { nodes: Map<string, EffectorNode>; edgesBySource: GraphTypedEdges; edgesByTarget: GraphTypedEdges };

interface EnricherImpl {
    (
        graph: EffectorGraph,
        lookups: Lookups,
        edgesType: EdgeType // kostyl!!!!!11
    ): {
        edgesToRemove?: MyEdge[];
        edgesToAdd?: MyEdge[];
    };
}

const attachedEffectEnricher: EnricherImpl = (graph, lookups, edgesType) => {
    const fxNodes = findNodesByOpType(OpType.Effect, graph.nodes);

    const edgesToAdd: MyEdge[] = [];

    console.log('fxNodes', fxNodes);

    for (const fxNode of fxNodes) {
        if (fxNode.data.effector.graphite.meta.op !== OpType.Effect) {
            console.warn('Unexpected op type', fxNode.data.effector.graphite.meta.op);
            continue;
        }

        // @ts-ignore
        const handler = fxNode.data.effector.graphite.scope.runner.scope.handler;

        if (!handler) {
            console.debug('Empty handler', fxNode.data.effector.graphite.scope);
            continue;
        }

        const isEffect = is.effect(handler);

        if (!isEffect) {
            console.debug('Function handler', handler);
            continue;
        }

        // @ts-ignore
        const graphite = handler.graphite as Graphite;
        const id = graphite.id;

        const target = lookups.nodes.get(id)!;

        const edgesFromFx = lookups.edgesBySource.owhership.get(fxNode.id);

        console.log('edgesFromFx', edgesFromFx);

        const some = edgesFromFx?.some((edge) => edge.target === id);

        console.log('some', some);

        console.log(edgesType, edgesType === EdgeType.Ownership);
        if (!some && edgesType === EdgeType.Ownership) {
            edgesToAdd.push({
                id: `${fxNode.id} owns ${id}`,
                source: fxNode.id,
                target: id,
                style: {
                    stroke: 'rgba(132,215,253,0.7)',
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                },
                data: {
                    edgeType: EdgeType.Ownership,
                    synthetic: true,
                    relatedNodes: {
                        source: fxNode,
                        target: target,
                        collapsed: [],
                    },
                },
            } satisfies OwnershipEdge);
        }

        if (
            !lookups.edgesBySource.reactive.get(fxNode.id)?.some((edge) => edge.target === id) &&
            edgesType === EdgeType.Reactive
        ) {
            edgesToAdd.push({
                id: `${fxNode.id} ==> ${id}`,
                source: fxNode.id,
                target: id,
                data: {
                    edgeType: EdgeType.Reactive,
                    relatedNodes: {
                        source: fxNode,
                        target: target,
                        collapsed: [],
                    },
                },
                style: {
                    zIndex: 10,
                },
                animated: true,
            } satisfies ReactiveEdge);
        }
    }

    console.debug('added', edgesToAdd, 'ownership and reactive edges');

    return { edgesToAdd };
};

export const enrichGraph = (graph: EffectorGraph, edgesType: EdgeType) => {
    console.log(
        'Enriching',
        graph.edges.filter((edge) => edge.source === '149')
    );

    const enrichers: EnricherImpl[] = [attachedEffectEnricher];
    return enrichers.reduce((graph, enrich) => {
        const { edgesToRemove = [], edgesToAdd = [] } =
            enrich(
                graph,
                {
                    edgesBySource: getEdgesBy(graph.edges, 'source'),
                    edgesByTarget: getEdgesBy(graph.edges, 'target'),
                    nodes: new Map(graph.nodes.map((node) => [node.id, node])),
                },
                edgesType
            ) || {};

        return {
            nodes: graph.nodes,
            edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd),
        };
    }, shallowCopyGraph(graph));
};
