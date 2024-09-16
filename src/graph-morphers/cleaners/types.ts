import type { Lookups } from '../../lib';
import type { EffectorGraph, EffectorNode, MyEdge, OpType } from '../../types';

export interface NamedCleaner<T> {
	name: string;
	apply: T;
	priority?: number;
}

export interface GraphCleaner {
	(graph: EffectorGraph): EffectorGraph;
}

export type NamedGraphCleaner = NamedCleaner<GraphCleaner>;

export type NamedEdgeCleaner<T extends MyEdge> = NamedCleaner<EdgeCleaner<T>>;

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
	transitiveOpType: OpType | undefined,
) => T;
