import type { EffectorGraph } from '../types';
import type { Layouter } from './types';

export * as Layouters from './namespace';

export async function layoutGraph(graph: EffectorGraph, layouterFactory: () => Layouter) {
	const layouter = layouterFactory();
	console.log('starting layouter');
	const layouted = layouter.getLayoutedElements(graph.nodes, graph.edges);
	console.log('layouter finished');
	return layouted;
}
