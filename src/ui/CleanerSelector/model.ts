import { createFactory } from '@withease/factories';
import { createEvent, createStore } from 'effector';
import isEqual from 'lodash.isequal';
import { readonly } from 'patronum';
import type { Comparator } from '../../comparison';
import type { NamedCleaner } from '../../graph-morphers/cleaners/types';

const byPriority =
	(origin: ReadonlyArray<NamedCleaner<unknown>>): Comparator<NamedCleaner<unknown>> =>
	(a, b) =>
		(a.order ?? origin.indexOf(a)) - (b.order ?? origin.indexOf(b));

export const namedCleanerSelectorModelFactoryFactory = <T extends NamedCleaner<unknown>>() =>
	createFactory(({ availableCleaners }: { availableCleaners: readonly T[] }) => {
		const selectedCleanersChanged = createEvent<readonly T[]>();
		const selectedCleanersResetted = createEvent<readonly T[]>();
		const $selectedCleaners = readonly(
			createStore<readonly T[]>(availableCleaners, { updateFilter: (update, current) => !isEqual(update, current) }).on(
				[selectedCleanersChanged, selectedCleanersResetted],
				(_, cleaners) => cleaners,
			),
		);

		const $sortedCleaners = $selectedCleaners.map((selectedCleaners) =>
			[...selectedCleaners].sort(byPriority(availableCleaners)),
		);

		return {
			$selectedCleaners: $sortedCleaners,
			selectedCleanersResetted,
			'@@ui': {
				availableCleaners,
				'@@unitShape': () => ({
					selectedCleanersChanged,
					selectedCleaners: $sortedCleaners,
				}),
			},
		};
	});

export type NamedCleanerSelector<T> = ReturnType<
	ReturnType<typeof namedCleanerSelectorModelFactoryFactory<NamedCleaner<T>>>
>;
