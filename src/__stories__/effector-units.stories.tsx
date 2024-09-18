import { createFactory, invoke } from '@withease/factories';
import type { Event } from 'effector';
import { createDomain, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { bootstrapped } from '../bootstrap';
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

export const GrapheneItself: GrapheneStory = {
	args: {
		factory: () => bootstrapped['@@unitShape'](),
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
