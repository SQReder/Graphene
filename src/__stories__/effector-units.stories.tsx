import { createFactory, invoke } from '@withease/factories';
import { attach, type Event } from 'effector';
import { createDomain, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { persist } from 'effector-storage/local';
import { debug, readonly } from 'patronum';
import { abortable, type WithAbortSignal } from '../abortable';
import { createBooleanStore } from '../debounceStore';
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

	return { topDomain };
});

const domainNestedTestModelFactory = createFactory(() => {
	const { topDomain } = invoke(topDomainModelFactory);

	const rootDomain = createDomain('root', { domain: topDomain });

	const childDomain = createDomain('child', { domain: rootDomain });

	const someEvent = createEvent({ domain: childDomain });

	return { someEvent };
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
				targreet: $value,
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
