import type { BufferedGraph } from '../graph-manager';
import { withOrder } from '../lib';
import type { NamedGraphVisitor } from './types';
import { bindHandlersToAttachedFx } from './visitors/bind-attached-fx-to-handler';
import { detachFactories } from './visitors/detach-factories';
import { dimFactoryLinks } from './visitors/dim-factory-links';
import { dropNodesWithNoLocation } from './visitors/drop-nodes-with-no-location';
import { dropUnlinkedNodes } from './visitors/drop-unlinked-nodes';
import { dropUselessReinit } from './visitors/drop-useless-reinit';
import { dropUselessUpdates } from './visitors/drop-useless-updates';
import { dropUselessWatch } from './visitors/drop-useless-watch';
import { factoryOwnershipEnricher } from './visitors/factory-ownership-enricher';
import { detachDomains, foldDomains } from './visitors/fold-domains';
import { foldEffect } from './visitors/fold-effect';
import {
	foldAbortable,
	foldCombineEvents,
	foldCondition,
	foldDebounce,
	foldLogEffectFail,
	foldReadonly,
	foldReshape,
	foldSplitMap,
	foldSpread,
} from './visitors/fold-factories';
import { foldHypernodes } from './visitors/fold-hypernodes';
import { foldMergeNode } from './visitors/fold-merge-node';
import { foldSample, foldSampleJoints } from './visitors/fold-sample';
import { locEnricher } from './visitors/loc-enricher';
import { rebindAttachedEffectSource } from './visitors/rebind-attached-effect-source';
import { regionOwnershipReflow } from './visitors/region-ownership-reflow';
import { removeSourceWhereReactivePresent } from './visitors/remove-source-where-reactive-present';
import { transitiveNodeReplacers } from './visitors/transitive-node-replacer';

export const newPipeline: NamedGraphVisitor[] = [
	...withOrder(0, locEnricher, factoryOwnershipEnricher),
	...withOrder(10, regionOwnershipReflow, detachFactories, dimFactoryLinks),
	...withOrder(20, removeSourceWhereReactivePresent),
	...withOrder(30, ...transitiveNodeReplacers),
	...withOrder(40, dropUselessReinit, dropUselessUpdates, dropUselessWatch),
	...withOrder(50, foldMergeNode, foldSampleJoints, foldSample),
	...withOrder(60, foldEffect, bindHandlersToAttachedFx, rebindAttachedEffectSource, foldHypernodes),
	...withOrder(70, foldDebounce, foldCombineEvents, foldReadonly, foldReshape, foldSplitMap, foldSpread, foldCondition),
	...withOrder(80, foldAbortable, foldLogEffectFail),
	...withOrder(100, foldDomains),
	...withOrder(110, detachDomains),
	...withOrder(999999, dropUnlinkedNodes, dropNodesWithNoLocation),
];

async function runPipeline(graph: BufferedGraph, pipeline: readonly NamedGraphVisitor[]) {
	console.group('runPipeline');
	console.time('pipeline');
	for (const visitor of pipeline) {
		console.groupCollapsed(visitor.name);
		await visitor.visit(graph);

		await graph.applyOperations();
		console.timeLog('pipeline', visitor.name);

		console.groupEnd();
	}
	console.timeEnd('pipeline');
	console.groupEnd();
}

export default runPipeline;
