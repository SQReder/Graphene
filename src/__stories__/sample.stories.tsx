import { createFactory, invoke } from '@withease/factories';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { type GrapheneMeta, type GrapheneStory, grapheneStoryMeta } from './meta-factored';

const meta: GrapheneMeta = {
	...grapheneStoryMeta,
	title: 'Effector/Operators/Sample',
	tags: ['autodocs'],
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

export const OneClockEvent_OneTargetEvent: GrapheneStory = {
	args: {
		factory: () => {
			const clockEvent = createEvent();
			const targetEvent = createEvent();

			sample({
				clock: clockEvent,
				target: targetEvent,
			});

			return {
				targetEvent,
			};
		},
	},
};

export const StoreClockEvent__TargetEvent: GrapheneStory = {
	args: {
		factory: () => {
			const clockEvent = createEvent();
			const clockStore = createStore(0);
			const targetEvent = createEvent();

			sample({
				clock: [clockEvent, clockStore],
				target: targetEvent,
			});

			return {
				targetEvent,
			};
		},
	},
};

export const ClockEvents_TargetEvent: GrapheneStory = {
	args: {
		factory: () => {
			const clockEvent1 = createEvent();
			const clockEvent2 = createEvent();
			const targetEvent = createEvent();

			sample({
				clock: [clockEvent1, clockEvent2],
				target: targetEvent,
			});

			return {
				targetEvent,
			};
		},
	},
};

export const ClockEvents_TargetEvents: GrapheneStory = {
	args: {
		factory: () => {
			const clockEvent1 = createEvent();
			const clockEvent2 = createEvent();
			const targetEvent1 = createEvent();
			const targetEvent2 = createEvent();

			sample({
				clock: [clockEvent1, clockEvent2],
				target: [targetEvent1, targetEvent2],
			});

			return {
				targetEvent1,
			};
		},
	},
};

export const SourceStore_TargetEvent: GrapheneStory = {
	args: {
		factory: () => {
			const sourceStore = createStore(0);
			const targetEvent = createEvent();

			sample({
				source: sourceStore,
				target: targetEvent,
			});

			return {
				targetEvent,
			};
		},
	},
};

export const SourceEvent_TargetEvent: GrapheneStory = {
	args: {
		factory: () => {
			const sourceEvent = createEvent();
			const targetEvent = createEvent();

			sample({
				source: sourceEvent,
				target: targetEvent,
			});

			sample({
				source: sourceEvent,
				target: targetEvent,
			});

			return {
				targetEvent,
			};
		},
	},
};

export const SourceSingleStoreShape_TargetEvent: GrapheneStory = {
	args: {
		factory: () => {
			const sourceStore = createStore(0);
			const targetEvent = createEvent();

			sample({
				source: { sourceStore },
				target: targetEvent,
			});

			return {
				targetEvent,
			};
		},
	},
};

export const SourceManyStoresShape_TargetEvent: GrapheneStory = {
	args: {
		factory: () => {
			const sourceStore1 = createStore(0);
			const sourceStore2 = createStore(0);
			const targetEvent = createEvent();

			sample({
				source: { sourceStore1, sourceStore2 },
				target: targetEvent,
			});

			return {
				targetEvent,
			};
		},
	},
};

export const SourceManyStoresArray_TargetEvent: GrapheneStory = {
	args: {
		factory: () => {
			const sourceStore1 = createStore(0);
			const sourceStore2 = createStore(0);
			const targetEvent = createEvent();

			sample({
				source: [sourceStore1, sourceStore2],
				target: targetEvent,
			});

			return {
				targetEvent,
			};
		},
	},
};
export const ClockManyStores_TargetEvent: GrapheneStory = {
	args: {
		factory: () => {
			const sourceStore1 = createStore(0);
			const sourceStore2 = createStore(0);
			const targetEvent = createEvent();

			sample({
				clock: [sourceStore1, sourceStore2],
				target: targetEvent,
			});

			return {
				targetEvent,
			};
		},
	},
};

export const Monstrous: GrapheneStory = {
	args: {
		factory: () => {
			const clockEvent = createEvent();
			const clockSource = createStore<any>(null);
			const clockEffect = createEffect<any, any>();

			const sourceStore1 = createStore<any>(null);
			const sourceStore2 = createStore<any>(null);

			const filterStore = createStore<any>(null);

			const targetEvent = createEvent();
			const targetStore = createStore<any>(null);
			const targetEffect = createEffect<any, any>();

			sample({
				clock: [clockEvent, clockSource, clockEffect, clockEffect.doneData],
				source: { sourceStore1, sourceStore2 },
				filter: filterStore,
				target: [targetEvent, targetStore, targetEffect],
			});

			return {
				targetEvent,
			};
		},
	},
};
