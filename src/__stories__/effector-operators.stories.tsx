import { createFactory, invoke } from '@withease/factories';
import { combine, createEvent, createStore, merge } from 'effector';
import { type GrapheneMeta, type GrapheneStory, grapheneStoryMeta } from './meta-factored';

const meta: GrapheneMeta = {
	...grapheneStoryMeta,
	title: 'Effector/Operators',
};

export default meta;

const eventsMergeModelFactory = createFactory(() => {
	const firstEvent = createEvent();
	const secondEvent = createEvent();

	const merged = merge([firstEvent, secondEvent]);

	return {
		merged,
	};
});

export const MergeEvents: GrapheneStory = {
	args: {
		factory: () => invoke(eventsMergeModelFactory),
	},
};

const combineModelFactory = createFactory(() => {
	const $first = createStore(null);
	const $second = createStore(null);

	const combined = combine([$first, $second]);

	return {
		combined,
	};
});

export const CombineStores: GrapheneStory = {
	args: {
		factory: () => invoke(combineModelFactory),
	},
};
