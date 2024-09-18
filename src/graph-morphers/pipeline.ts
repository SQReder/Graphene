import { Cleaners } from './cleaners';
import type { NamedGraphCleaner } from './cleaners/types';

export const pipeline: NamedGraphCleaner[] = [
	...Cleaners.reverseOwnershipCleaners,
	...Cleaners.transitiveNodeCleaners,
	Cleaners.regionOwnershipReflow,
	Cleaners.reinit,
	Cleaners.storeUpdatesWithNoChildren,
	Cleaners.foldEffect,
	Cleaners.foldReadonly,
	Cleaners.foldDebounce,
	Cleaners.foldCombineEvents,
	Cleaners.foldDomain,
	Cleaners.dropWatch,
	Cleaners.dimFactories,
	Cleaners.dropFactories,
	// Cleaners.parentEnricher,
];

export const dropPipeline: NamedGraphCleaner[] = [Cleaners.removeUnlinkedNodes];
