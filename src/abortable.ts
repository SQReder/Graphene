import { attach, createEffect, createEvent, createStore, type Effect, type Event, sample } from 'effector';

export type WithAbortSignal = {
	signal: AbortSignal;
};

type OmitAbortSignal<Params extends WithAbortSignal> = keyof Omit<Params, 'signal'> extends never
	? void
	: Omit<Params, 'signal'>;

export type AbortableFxModel<Params extends WithAbortSignal, Done, Fail = Error> = {
	abortableFx: Effect<OmitAbortSignal<Params>, Done, Fail>;
	abort: Event<void>;
};

export function abortable<Params extends WithAbortSignal, Done, Fail = Error>(
	effect: Effect<Params, Done, Fail>,
): AbortableFxModel<Params, Done, Fail> {
	const $source = createStore(new AbortController());

	const abort = createEvent();

	const abortFx = attach({
		source: $source,
		async effect(controller) {
			console.log('🟢🟡🔴');
			controller.abort(new Error('Just Aborted'));
			return new AbortController();
		},
	});

	$source.on(abortFx.doneData, (_, controller) => controller);

	const abortableFx = createEffect<OmitAbortSignal<Params>, Done, Fail>({
		name: effect.shortName + ' (abortable)',
		async handler(params) {
			const controller = await abortFx();
			return effect({ ...params, signal: controller.signal } as unknown as Params);
		},
	});

	sample({
		clock: abort,
		target: abortFx,
	});

	return {
		abortableFx,
		abort,
	};
}
