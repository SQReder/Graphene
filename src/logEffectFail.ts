import { createEffect, Effect, sample } from 'effector';

type EffectFailParams<Params, Fail> = { params: Params; error: Fail };
type LogEffectFailFormatter<Params, Fail> = (failParams: EffectFailParams<Params, Fail>) => string;
type LogEffectFailConfiguration<Params, Fail> = {
	formatter: LogEffectFailFormatter<Params, Fail>;
};

export function logEffectFail<Params, Done, Fail>(
	effect: Effect<Params, Done, Fail>,
	config?: LogEffectFailConfiguration<Params, Fail>,
): void {
	const formatFx = createEffect((data: EffectFailParams<Params, Fail>): string | undefined =>
		config?.formatter?.(data),
	);

	const logFx = createEffect(async (failParams: EffectFailParams<Params, Fail>): Promise<void> => {
		let message: string | undefined;
		try {
			message = await formatFx(failParams);
		} catch (e) {
			console.warn('Message formatter failed', e);
		}

		console.group(`Effect "${effect.compositeName.fullName}" failed`);
		if (message) {
			console.info('Formatted message:', message);
		}
		console.info('Parameters:', failParams.params);
		console.error(failParams.error);
		console.groupEnd();
	});

	sample({
		clock: effect.fail,
		target: logFx,
	});
}
