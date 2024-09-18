import { createFactory, invoke } from '@withease/factories';
import { createEvent, sample } from 'effector';
import { type GrapheneMeta, type GrapheneStory, grapheneStoryMeta } from './meta-factored';

const meta: GrapheneMeta = {
	...grapheneStoryMeta,
	title: 'Effector/Sample',
};

export default meta;

const eventsSampleClockModelFactory = createFactory(() => {
	const clockEvent = createEvent();
	const targetEvent = createEvent();

	sample({
		clock: clockEvent,
		target: targetEvent,
	});

	return {
		clockEvent,
		targetEvent,
	};
});

export const Sample: GrapheneStory = {
	args: {
		factory: () => invoke(eventsSampleClockModelFactory),
	},
};
