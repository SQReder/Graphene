import { EffectorGraph } from '../types';
import { Layouter } from './types';

export * as Layouters from './namespace';

export async function layoutGraph(graph: EffectorGraph, layouterFactory: () => Layouter) {
	const layouter = layouterFactory();
	return layouter.getLayoutedElements(graph.nodes, graph.edges);
}
