import { createFactory, invoke } from '@withease/factories';
import { createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, condition, debounce, readonly, reshape, splitMap, spread } from 'patronum';
import { type GrapheneMeta, type GrapheneStory, grapheneStoryMeta } from './meta-factored';

const meta: GrapheneMeta = {
	...grapheneStoryMeta,
	title: 'Patronum',
};

export default meta;

export const CombineEvents: GrapheneStory = {
	args: {
		factory: () => {
			const first = createEvent();
			const second = createEvent();

			const combined = combineEvents({
				events: [first, second],
			});

			const result = createEvent();

			sample({
				clock: combined,
				target: result,
			});

			return {
				combined,
			};
		},
	},
};

export const CombineEventsWithReset: GrapheneStory = {
	args: {
		factory: () => {
			const first = createEvent();
			const second = createEvent();
			const reset = createEvent();

			const combined = combineEvents({
				events: [first, second],
				reset: reset,
			});

			return {
				combined,
			};
		},
	},
};

const debounceModelFactory = createFactory(() => {
	const tooFastEvent = createEvent();
	const slowedEvent = debounce(tooFastEvent, 100);
	const $slowData = restore(slowedEvent, null);

	return { $slowData };
});

export const Debounce: GrapheneStory = {
	args: {
		factory: () => invoke(debounceModelFactory),
	},
};

const readonlyModelFactory = createFactory(() => {
	const $writeableStore = createStore(0);
	const $readonlyStore = readonly($writeableStore);

	const $writeableStore2 = createStore(0);
	const $readonlyStore2 = readonly($writeableStore2);
	$readonlyStore2.watch(console.log);

	return { $readonlyStore, $readonlyStore2 };
});

export const Readonly: GrapheneStory = {
	args: {
		factory: () => invoke(readonlyModelFactory),
	},
};

export const SplitMap: GrapheneStory = {
	args: {
		factory: () => {
			const event = createEvent<{ type: string; demo: string }>();

			const shape = splitMap({
				source: event,
				cases: {
					getType: (input) => input.type,
					getDemo: (input) => input.demo,
				},
			});

			shape.getDemo.compositeName.shortName = 'getDemo';

			shape.getType.watch((type) => console.log('TYPE', type));
			shape.getDemo.watch((demo) => console.log('DEMO', demo));
			shape.__.watch((other) => console.log('OTHER', other));

			return { event, ...shape };
		},
	},
};

export const Reshape: GrapheneStory = {
	args: {
		factory: () => {
			const $original = createStore<string>('Example');

			const result = reshape({
				source: $original,
				shape: {
					length: (string) => string.length,
					lowercase: (string) => string.toLowerCase(),
					uppercase: (string) => string.toUpperCase(),
				},
			});

			result.length.watch((length) => console.log('String length:', length));
			result.lowercase.watch((lowercase) => console.log('lowercase:', lowercase));
			result.uppercase.watch((uppercase) => console.log('uppercase:', uppercase));

			return { ...result, $original };
		},
	},
};

export const Spread: GrapheneStory = {
	args: {
		factory: () => {
			const $first = createStore('');
			const $last = createStore('');

			const formReceived = createEvent<{ first: string; last: string }>();

			sample({
				source: formReceived,
				filter: (form) => form.first.length > 0 && form.last.length > 0,
				target: spread({
					first: $first,
					last: $last,
				}),
			});

			$first.watch((first) => console.log('First name', first));
			$last.watch((last) => console.log('Last name', last));

			return { $first, $last, formReceived };
		},
	},
};

export const Condition: GrapheneStory = {
	args: {
		factory: () => {
			const emitNumber = createEvent<number>();

			const emitEven = createEvent<number>();
			const emitOdd = createEvent<number>();

			condition({
				source: emitNumber,
				if: (value) => value % 2 === 0,
				then: emitEven,
				else: emitOdd,
			});
			return { emitEven, emitOdd };
		},
	},
};
