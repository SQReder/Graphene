import { createFactory } from '@withease/factories';
import { createEvent, createStore } from 'effector';
import { readonly } from 'patronum';
import type { Comparator } from '../../comparison';
import type { NamedCleaner } from '../../graph-morphers/cleaners/types';

const byPriority: Comparator<NamedCleaner<unknown>> = (a, b) => (a.priority ?? 0) - (b.priority ?? 0);

export const namedCleanerSelectorModelFactoryFactory = <T extends NamedCleaner<unknown>>() =>
	createFactory((availableCleaners: readonly T[]) => {
		const selectedCleanersChanged = createEvent<readonly T[]>();
		const selectedCleanersResetted = createEvent<readonly T[]>();
		const $selectedCleaners = readonly(
			createStore<readonly T[]>(availableCleaners).on(
				[selectedCleanersChanged, selectedCleanersResetted],
				(_, cleaners) => [...cleaners].sort(byPriority),
			),
		);

		return {
			$selectedCleaners: $selectedCleaners,
			selectedCleanersResetted,
			'@@ui': {
				availableCleaners,
				'@@unitShape': () => ({
					selectedCleanersChanged,
					selectedCleaners: $selectedCleaners,
				}),
			},
		};
	});

export type NamedCleanerSelector<T> = ReturnType<
	ReturnType<typeof namedCleanerSelectorModelFactoryFactory<NamedCleaner<T>>>
>;
