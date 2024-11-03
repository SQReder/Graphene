import { createQuery } from '@farfetched/core';
import { createEvent, is, sample } from 'effector';
import { type GrapheneMeta, type GrapheneStory, grapheneStoryMeta } from './meta-factored';

const genericGrapheneMeta: GrapheneMeta = {
	...grapheneStoryMeta,
	title: 'Farfetched',
};

export default genericGrapheneMeta;

export const CreateQuery: GrapheneStory = {
	args: {
		factory: () => {
			const query = createQuery({
				handler: async () => true,
			});

			const startQuery = createEvent();

			sample({
				clock: startQuery,
				target: query.start,
			});

			Object.values(query)
				.filter(is.store<unknown, unknown>)
				.forEach(($store) => {
					if (is.targetable($store)) {
						const clock = createEvent<any>();
						sample({
							clock: clock,
							target: $store,
						});
					}
					$store.watch(console.log);
				});
			Object.values(query)
				.filter(is.event<unknown, unknown>)
				.forEach((event) => {
					if (is.targetable(event)) {
						const clock = createEvent<any>();
						sample({
							clock: clock,
							target: event,
						});
					}
					event.watch(console.log);
				});
			Object.values(query.finished)
				.filter(is.event)
				.forEach((event) => {
					if (is.targetable(event)) {
						const clock = createEvent<any>();
						sample({
							clock: clock,
							target: event,
						});
					}
					event.watch(console.log);
				});

			return { startQuery };
		},
	},
};
