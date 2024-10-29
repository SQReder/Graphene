import { createFactory } from '@withease/factories';
import { createEvent, createStore } from 'effector';
import isEqual from 'lodash.isequal';
import { readonly } from 'patronum';
import type { NamedGraphVisitor } from '../../brand-new-graph-cleaners/types';
import type { Comparator } from '../../comparison';

type NamedAndOrdered = {
	name: string;
	order?: number;
};

const byPriority =
	(origin: readonly NamedAndOrdered[]): Comparator<NamedAndOrdered> =>
	(a, b) =>
		(a.order ?? origin.indexOf(a)) - (b.order ?? origin.indexOf(b));

export const namedCleanerSelectorModelFactoryFactory = <T extends NamedAndOrdered>() =>
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

export type NamedCleanerSelector = ReturnType<
	ReturnType<typeof namedCleanerSelectorModelFactoryFactory<NamedGraphVisitor>>
>;
