import type { Effect } from 'effector';
import { attach, createEffect, createStore } from 'effector';

export type WithAbortSignal = {
	signal: AbortSignal;
};

type OmitAbortSignal<Params extends WithAbortSignal> = keyof Omit<Params, 'signal'> extends never
	? void
	: Omit<Params, 'signal'>;

export type AbortableFxModel<Params extends WithAbortSignal, Done, Fail = Error> = {
	abortableFx: Effect<OmitAbortSignal<Params>, Done, Fail>;
	abortFx: Effect<void, void>;
};

export function abortable<Params extends WithAbortSignal, Done, Fail = Error>(
	effect: Effect<Params, Done, Fail>,
): AbortableFxModel<Params, Done, Fail> {
	const $source = createStore(new AbortController());

	const abortFx = attach({
		source: $source,
		effect(source) {
			source.abort('Just aborted');
		},
	});

	$source.on(abortFx.done, () => new AbortController());

	const withCancelTokenAttachedFx = attach({
		effect: effect,
		source: $source,
		mapParams: (params: OmitAbortSignal<Params>, { signal }): Params =>
			// @ts-expect-error false-positive type substitution error
			({ ...params, signal: signal } as Params),
		name: `${effect.shortName}.abortable`,
	});

	const abortableFx = createEffect<OmitAbortSignal<Params>, Done, Fail>(async (params) => {
		void abortFx();
		return withCancelTokenAttachedFx(params);
	});

	return {
		abortableFx,
		abortFx,
	};
}
