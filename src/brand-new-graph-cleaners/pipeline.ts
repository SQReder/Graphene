import { ensureDefined } from '../ensureDefined';
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
	foldCreateQuery,
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
import { foldGate, generateSyntheticGateNode } from './visitors/generate-synthetic-gate-node';
import { locEnricher } from './visitors/loc-enricher';
import { rebindAttachedEffectSource } from './visitors/rebind-attached-effect-source';
import { regionOwnershipReflow } from './visitors/region-ownership-reflow';
import { removeSourceWhereReactivePresent } from './visitors/remove-source-where-reactive-present';
import { transitiveNodeReplacers } from './visitors/transitive-node-replacer';

export const newPipeline: NamedGraphVisitor[] = [
	...withOrder(0, locEnricher),
	...withOrder(50, factoryOwnershipEnricher),
	...withOrder(100, regionOwnershipReflow, detachFactories, dimFactoryLinks),
	...withOrder(200, removeSourceWhereReactivePresent),
	...withOrder(300, ...transitiveNodeReplacers),
	...withOrder(400, dropUselessReinit, dropUselessUpdates, dropUselessWatch),
	...withOrder(450, generateSyntheticGateNode),
	...withOrder(460, foldGate),
	...withOrder(500, foldMergeNode, foldSampleJoints, foldSample),
	...withOrder(600, foldEffect, bindHandlersToAttachedFx, rebindAttachedEffectSource, foldHypernodes),
	...withOrder(
		700,
		foldDebounce,
		foldCombineEvents,
		foldReadonly,
		foldReshape,
		foldSplitMap,
		foldSpread,
		foldCondition,
	),
	...withOrder(750, foldCreateQuery),
	...withOrder(800, foldAbortable, foldLogEffectFail),
	...withOrder(1000, foldDomains),
	...withOrder(1100, detachDomains),
	...withOrder(999999, dropUnlinkedNodes, dropNodesWithNoLocation),
];

async function runPipeline(
	graph: BufferedGraph,
	pipeline: readonly NamedGraphVisitor[],
	progress: (stage: { name: string; percent: number }) => void,
) {
	console.group('runPipeline');
	console.time('pipeline');
	for (let i = 0; i < pipeline.length; i++) {
		const visitor = ensureDefined(pipeline[i]);
		console.groupCollapsed(visitor.name);
		await visitor.visit(graph);

		await graph.applyOperations();
		console.timeLog('pipeline', visitor.name);

		progress({ name: visitor.name, percent: (i / pipeline.length) * 100 });

		console.groupEnd();
	}
	console.timeEnd('pipeline');
	console.groupEnd();
}

export default runPipeline;
