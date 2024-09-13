import { createEffect, createEvent, createStore, sample } from 'effector';
import { modelFactory } from 'effector-factorio';
import { readonly } from 'patronum';

export const someModelFactory = modelFactory(() => {
	const someEvent = createEvent<number>();
	const $someStore = createStore<number>(0);

	sample({
		clock: someEvent,
		source: $someStore,
		fn: (acc, value) => acc + value,
		target: $someStore,
	});

	const warningFx = createEffect(() => {
		console.warn('some warning');
	});

	sample({
		source: $someStore.updates,
		filter: (value) => value > 5,
		target: warningFx,
	});

	return {
		someEvent: someEvent,
		$someStore: readonly($someStore),
	};
});
