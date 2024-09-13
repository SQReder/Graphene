import { EffectorGraph, EffectorNode, MyEdge } from '../types';

export interface Layouter {
	getLayoutedElements(nodes: EffectorNode[], edges: MyEdge[], direction?: string): Promise<EffectorGraph>;
}
