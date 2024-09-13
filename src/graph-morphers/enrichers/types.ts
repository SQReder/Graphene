import { GraphTypedEdges } from '../../lib';
import { EdgeType, EffectorGraph, EffectorNode, MyEdge } from '../../types';

export type Lookups = {
	nodes: Map<string, EffectorNode>;
	edgesBySource: GraphTypedEdges;
	edgesByTarget: GraphTypedEdges;
};

export interface EnricherImpl {
	(
		graph: EffectorGraph,
		lookups: Lookups,
		edgesType: EdgeType, // kostyl!!!!!11
	): {
		edgesToRemove?: MyEdge[];
		edgesToAdd?: MyEdge[];
	};
}
