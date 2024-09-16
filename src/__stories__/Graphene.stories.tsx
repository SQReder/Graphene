import { createFactory, invoke } from '@withease/factories';
import type { Event } from 'effector';
import { createDomain, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { debounce, readonly } from 'patronum';
import { createTodoListApi } from '../examples/todo';
import { appModel, type GrapheneMeta, type GrapheneStory, grapheneStoryMeta } from './meta';

const loneEvent = createEvent();
const $loneStore = createStore(null);

const todoModel = invoke(createTodoListApi, []);

export const ToDo: GrapheneStory = {
	args: {
		units: Object.values(todoModel),
	},
};

export const Test: GrapheneStory = {
	args: {
		units: [$loneStore, loneEvent],
	},
};

export const GrapheneItself: GrapheneStory = {
	args: {
		units: Object.values(appModel['@@unitShape']()),
	},
};

const tooFastEvent = createEvent();
const slowedEvent = debounce(tooFastEvent, 100);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore
const $slowData = restore(slowedEvent, null);

export const Debounce: GrapheneStory = {
	args: {
		units: [slowedEvent],
	},
};

const $writeableStore = createStore(0);
const $readonlyStore = readonly($writeableStore);

const $writeableStore2 = createStore(0);
const $readonlyStore2 = readonly($writeableStore2);
$readonlyStore2.watch(console.log);

export const Readonly: GrapheneStory = {
	args: {
		units: [$readonlyStore, $readonlyStore2],
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

	return [trigerEffect, testEffect];
};

export const Effect: GrapheneStory = {
	args: {
		units: [...effectFactory()],
	},
};

export const SingleEffect: GrapheneStory = {
	args: {
		units: [
			createEffect({
				name: 'Single Effect',
			}),
		],
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

const parentModel = invoke(parentFactory);

export const NestedFactories = {
	args: {
		units: [...Object.values(parentModel)],
	},
};

const domainNestedTestModelFactory = createFactory(() => {
	const rootDomain = createDomain('root');

	const childDomain = createDomain('child', { domain: rootDomain });

	const someEvent = createEvent({ domain: childDomain });

	return { someEvent };
});

export const DomainNested: GrapheneStory = {
	args: {
		units: [...Object.values(invoke(domainNestedTestModelFactory))],
	},
};

const domainTestModelFactory = createFactory(() => {
	const rootDomain = createDomain('root');

	const someEvent = createEvent({ domain: rootDomain });

	return { someEvent };
});

export const Domain: GrapheneStory = {
	args: {
		units: [...Object.values(invoke(domainTestModelFactory))],
	},
};

const genericGrapheneMeta: GrapheneMeta = {
	...grapheneStoryMeta,
	title: 'Graphene/Generic',
};

export default genericGrapheneMeta;
