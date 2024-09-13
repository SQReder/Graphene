import { shallowCopyGraph } from '../../../lib';
import { EffectorGraph } from '../../../types';
import { GraphCleaner } from '../types';
import { foldEffects } from './cleaners';
import { removeUnlinkedNodes } from './removeUnlinkedNodes';

export const cleanGraph: GraphCleaner = (graph: EffectorGraph) => {
	return [foldEffects, removeUnlinkedNodes].reduce((graph, cleaner) => cleaner(graph), shallowCopyGraph(graph));
};
