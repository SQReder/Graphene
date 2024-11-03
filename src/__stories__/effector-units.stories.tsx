import { createFactory, invoke } from '@withease/factories';
import {
	attach,
	combine,
	createDomain,
	createEffect,
	createEvent,
	createStore,
	type Event,
	restore,
	sample,
	type Store,
} from 'effector';
import { createGate } from 'effector-react';
import { persist } from 'effector-storage/local';
import { debug, readonly } from 'patronum';
import { abortable, type WithAbortSignal } from '../abortable';
import { createBooleanStore, debounceStore } from '../debounceStore';
import { createTodoListApi } from '../examples/todo';
import { type GrapheneMeta, type GrapheneStory, grapheneStoryMeta } from './meta-factored';

const todoModel = invoke(createTodoListApi, []);

export const ToDo: GrapheneStory = {
	args: {
		factory: () => todoModel,
	},
};

export const Test: GrapheneStory = {
	args: {
		factory: () => {
			const loneEvent = createEvent();
			const $loneStore = createStore(null);

			return { $loneStore, loneEvent };
		},
	},
};

const effectFactory = () => {
	const trigerEffect = createEvent();
	const testEffect = createEffect();

	sample({
		clock: trigerEffect,
		target: testEffect,
	});

	testEffect.finally.watch((result) => console.log('finally', result));

	testEffect.done.watch((result) => console.log('done', result));
	testEffect.doneData.watch((result) => console.log('doneData', result));
	testEffect.fail.watch((result) => console.log('fail', result));
	testEffect.failData.watch((result) => console.log('failData', result));

	testEffect.pending.watch((result) => console.log('pending', result));
	testEffect.inFlight.watch((result) => console.log('inFlight', result));

	return { trigerEffect, testEffect };
};

export const Effect: GrapheneStory = {
	args: {
		factory: () => effectFactory(),
	},
};

export const SingleEffect: GrapheneStory = {
	args: {
		factory: () => ({
			effect: createEffect({
				name: 'Single Effect',
			}),
		}),
	},
};

const childFactory = createFactory((event: Event<unknown>) => {
	const $value = restore(event, []);

	return { $value };
});

const parentFactory = createFactory(() => {
	const event = createEvent();

	const childModel = invoke(childFactory, event);

	return { event, $value: childModel.$value };
});

export const NestedFactories = {
	args: {
		factory: () => invoke(parentFactory),
	},
};

const topDomainModelFactory = createFactory(() => {
	const topDomain = createDomain('top');

	const topEvent = createEvent({ domain: topDomain });

	return { topDomain, topEvent };
});

const domainNestedTestModelFactory = createFactory(() => {
	const { topDomain, topEvent } = invoke(topDomainModelFactory);

	const rootDomain = createDomain('root', { domain: topDomain });

	const rootEvent = createEvent({ domain: rootDomain });

	const childDomain = createDomain('child', { domain: rootDomain });

	const childEvent = createEvent({ domain: childDomain });

	return { topEvent, rootEvent, childEvent };
});

export const DomainNested: GrapheneStory = {
	args: {
		factory: () => invoke(domainNestedTestModelFactory),
	},
};

const domainTestModelFactory = createFactory(() => {
	const rootDomain = createDomain('root');

	const someEvent = createEvent({ domain: rootDomain });

	return { someEvent };
});

export const Domain: GrapheneStory = {
	args: {
		factory: () => invoke(domainTestModelFactory),
	},
};

const genericGrapheneMeta: GrapheneMeta = {
	...grapheneStoryMeta,
	title: 'Effector/Units',
};

export default genericGrapheneMeta;

export const TestFactories: GrapheneStory = {
	args: {
		factory: () => {
			const $boolean = createBooleanStore();
			debug($boolean);
			return { $boolean };
		},
	},
};

export const Abortable: GrapheneStory = {
	args: {
		factory: () => {
			const effectFx = createEffect<WithAbortSignal, void>();

			const abortableWrapper = abortable(effectFx);

			return abortableWrapper;
		},
	},
};

export const UnitIsAttachSourceAndTarget: GrapheneStory = {
	args: {
		factory: () => {
			const $source = createStore(new AbortController());

			const abortFx = attach({
				source: $source,
				effect(source) {
					source.abort('Just aborted');
				},
			});

			$source.on(abortFx.done, () => new AbortController());

			return { $source };
		},
	},
};

export const AttachedEffectWithSourceShape: GrapheneStory = {
	args: {
		factory: () => {
			const $source = createStore(0);

			const attachedFx = attach({
				source: { $source },
				effect: function () {
					return;
				},
			});

			return { attachedFx };
		},
	},
};

export const AttachedEffectWithRealEffect: GrapheneStory = {
	args: {
		factory: () => {
			const $source = createStore(0);

			const originalEffect = createEffect<{ source: number }, void>();

			const attachedFx = attach({
				source: { source: $source },
				effect: originalEffect,
			});

			sample({
				clock: $source,
				fn: (source) => ({ source }),
				target: originalEffect,
			});

			return { $source, attachedFx, originalEffect };
		},
	},
};

export const AttachedEffectWithSourceAndUpdateThroughSamlple: GrapheneStory = {
	args: {
		factory: () => {
			const $value = createStore(0);

			const randomFx = attach({
				source: { value: $value },
				effect: ({ value }) => Math.random() * value,
			});

			$value.on(randomFx.doneData, (_, value) => value);

			sample({
				clock: randomFx.doneData,
				source: { value: $value },
				fn: ({ value }, random) => value * random,
				target: $value,
			});

			return { attachedFx: randomFx };
		},
	},
};

export const ReadonlyAsSourceOfAttachedEffect: GrapheneStory = {
	args: {
		factory: () => {
			const $source = readonly(createStore(0));

			const attachedFx = attach({
				source: $source,
				effect: function () {
					return;
				},
			});

			return { attachedFx };
		},
	},
};

export const Persist = {
	args: {
		factory: () => {
			const $store = createStore(0);
			persist({ store: $store });

			return { $store };
		},
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

export const TooManyChildren = {
	args: {
		factory: () => {
			const $store = createStore(0);

			const combined: Array<Store<number>> = [];
			for (let i = 0; i < 15; i++) {
				combined.push($store.map((x) => x * i));
			}

			const $fooed = combine(...combined);

			return $fooed;
		},
	},
};

export const Prepend = {
	args: {
		factory: () => {
			const event = createEvent<number>();
			const prepend = event.prepend(() => 1);
			return { event, prepend };
		},
	},
};

export const GhostedJointSample: GrapheneStory = {
	args: {
		factory: () => {
			const attachedFx = createEffect({
				handler: (...args) => void console.log(args),
			});

			const emit = createEvent();

			sample({
				clock: [sample(attachedFx, attachedFx.done)],
				target: emit,
			});

			return { emit };
		},
	},
};

export const Gate: GrapheneStory = {
	args: {
		factory: () => {
			const TheGate = createGate('TheGate');

			TheGate.open.watch(() => {
				console.log('Gate opened');
			});
			TheGate.close.watch(() => {
				console.log('Gate closed');
			});

			TheGate.state.watch((state) => {
				console.log('Gate state changed', state);
			});

			TheGate.status.watch((status) => {
				console.log('Gate status changed', status);
			});

			return {
				open: TheGate.open,
			};
		},
	},
};
