import { Cleaners } from './cleaners';
import { withOrder } from './cleaners/lib';
import type { NamedGraphCleaner } from './cleaners/types';

export const pipeline: NamedGraphCleaner[] = [
	...withOrder(0, Cleaners.locEnricher),
	...withOrder(10, Cleaners.regionOwnershipReflow),

	// // ...withOrder(20, ...Cleaners.reverseOwnershipCleaners),
	// ...withOrder(30, ...Cleaners.transitiveNodeCleaners),
	// // ...withOrder(35, Cleaners.mergeCombines),
	//
	// ...withOrder(40, Cleaners.reinit, Cleaners.storeUpdatesWithNoChildren),
	// ...withOrder(45, Cleaners.combineNodeFold, Cleaners.foldMergeNode),
	//
	// ...withOrder(
	// 	50,
	// 	Cleaners.foldReadonly,
	// 	Cleaners.foldEffect,
	// 	Cleaners.foldDebounce,
	// 	Cleaners.foldCombineEvents,
	// 	Cleaners.foldDomain,
	// ),
	//
	// ...withOrder(60, Cleaners.parentEnricher),
	//
	// ...withOrder(70, Cleaners.dropWatch),
	// ...withOrder(80, Cleaners.dimFactories),
	//
	// ...withOrder(95, Cleaners.ShadowClones),
	//
	// ...withOrder(100, Cleaners.dropFactories, Cleaners.dropDomains),
	// ...withOrder(115, Cleaners.foldSample),
	// ...withOrder(110, Cleaners.dropNoLocNodes),
	// ...withOrder(120, Cleaners.removeOwnershipWhereReactiveEdgePresent),
	// ...withOrder(Number.MAX_VALUE, Cleaners.removeUnlinkedNodes),
];
