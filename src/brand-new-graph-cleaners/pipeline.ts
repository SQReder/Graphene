import type { BufferedGraph } from '../graph-manager';
import type { NamedGraphVisitor } from './types';
import { detachFactories } from './visitors/detach-factories';
import { dropUselessReinit } from './visitors/drop-useless-reinit';
import { dropUselessUpdates } from './visitors/drop-useless-updates';
import { dropUselessWatch } from './visitors/drop-useless-watch';
import { regionOwnershipReflow } from './visitors/region-ownership-reflow';
import { removeSourceWhereReactivePresent } from './visitors/remove-source-where-reactive-present';
import { transitiveNodeReplacers } from './visitors/transitive-node-replacer';

export const newPipeline: NamedGraphVisitor[] = [
	// locEnricher,
	regionOwnershipReflow,
	detachFactories,
	removeSourceWhereReactivePresent,
	...transitiveNodeReplacers,
	dropUselessReinit,
	dropUselessUpdates,
	dropUselessWatch,
];

function runPipeline(graph: BufferedGraph, pipeline: NamedGraphVisitor[]) {
	console.group('runPipeline');
	for (const visitor of pipeline) {
		console.groupCollapsed(visitor.name);
		visitor.visit(graph);
		graph.applyOperations();
		console.groupEnd();
	}
	console.groupEnd();
}

export default runPipeline;
