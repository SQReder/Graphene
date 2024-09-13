import { Lookups } from '../../lib';
import { EffectorGraph, EffectorNode, MyEdge, OpType } from '../../types';

export interface GraphCleaner {
	(graph: EffectorGraph): EffectorGraph;
}

export interface EdgeCleaner<T extends MyEdge = MyEdge> {
	(edges: T[], lookups: Lookups): {
		edgesToRemove?: T[];
		edgesToAdd?: T[];
	};
}

export type EdgeCreator<T extends MyEdge> = (
	inbound: T,
	outbound: T,
	node: EffectorNode,
	transitiveOpType: OpType,
) => T;
