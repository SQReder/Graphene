import { Cleaners } from './cleaners';
import { withOrder } from './cleaners/lib';
import type { NamedGraphCleaner } from './cleaners/types';

export const pipeline: NamedGraphCleaner[] = [
	...withOrder(10, Cleaners.regionOwnershipReflow),

	...withOrder(20, ...Cleaners.reverseOwnershipCleaners),
	...withOrder(30, ...Cleaners.transitiveNodeCleaners),
	...withOrder(35, Cleaners.mergeCombines),

	...withOrder(40, Cleaners.reinit, Cleaners.storeUpdatesWithNoChildren),

	...withOrder(
		50,
		Cleaners.foldReadonly,
		Cleaners.foldEffect,
		Cleaners.foldDebounce,
		Cleaners.foldCombineEvents,
		Cleaners.foldDomain,
	),

	...withOrder(60, Cleaners.parentEnricher),

	...withOrder(70, Cleaners.dropWatch),
	...withOrder(80, Cleaners.dimFactories),

	...withOrder(100, Cleaners.dropFactories),
	...withOrder(Number.MAX_VALUE, Cleaners.removeUnlinkedNodes),
];
