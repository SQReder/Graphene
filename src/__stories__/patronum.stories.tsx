import { createFactory, invoke } from '@withease/factories';
import { createEvent, createStore, restore } from 'effector';
import { combineEvents, debounce, readonly } from 'patronum';
import { debounceStore } from '../debounceStore';
import { type GrapheneMeta, type GrapheneStory, grapheneStoryMeta } from './meta-factored';

const meta: GrapheneMeta = {
	...grapheneStoryMeta,
	title: 'Patronum',
};

export default meta;

const eventsSampleClockModelFactory = createFactory(() => {
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
});

export const CombineEvents: GrapheneStory = {
	args: {
		factory: () => invoke(eventsSampleClockModelFactory),
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

export const DebouncedStore = {
	args: {
		factory: () => {
			const $store = createStore(0);
			const $debounced = debounceStore({ source: $store, defaultState: 0, timeoutMs: 100 });

			const $mapped = $debounced.map((x) => x);

			return $mapped;
		},
	},
};

export const readonlyOwnershipDemoInlined = {
	args: {
		factory: () => {
			const debouncedStoreValueChanged = createEvent<number>();
			const $inlined = readonly(restore(debouncedStoreValueChanged, 0));

			const $fooed = $inlined.map(Boolean);
			return $fooed;
		},
	},
};

export const readonlyOwnershipDemoSepearted = {
	args: {
		factory: () => {
			const debouncedStoreValueChanged = createEvent<number>();
			const $separate = restore(debouncedStoreValueChanged, 0);
			const $separated = readonly($separate);
			const $fooed = $separated.map(Boolean);

			return $fooed;
		},
	},
};
