import type { Lookups } from '../../lib';
import type { EdgeType, EffectorGraph, MyEdge } from '../../types';

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
