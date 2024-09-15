import { Effect, sample } from 'effector';

interface EffectsPipeline {
	<A, B, C>(effectA: Effect<A, B>, effectB: Effect<B, C>): void;

	<A, B, C, D>(effectA: Effect<A, B>, effectB: Effect<B, C>, effectC: Effect<C, D>): void;

	<A, B, C, D, E>(effectA: Effect<A, B>, effectB: Effect<B, C>, effectC: Effect<C, D>, effectD: Effect<D, E>): void;

	<A, B, C, D, E, F>(
		effectA: Effect<A, B>,
		effectB: Effect<B, C>,
		effectC: Effect<C, D>,
		effectD: Effect<D, E>,
		effectE: Effect<E, F>,
	): void;

	<A, B, C, D, E, F, G>(
		effectA: Effect<A, B>,
		effectB: Effect<B, C>,
		effectC: Effect<C, D>,
		effectD: Effect<D, E>,
		effectE: Effect<E, F>,
		effectF: Effect<F, G>,
	): void;

	<A, B, C, D, E, F, G, H>(
		effectA: Effect<A, B>,
		effectB: Effect<B, C>,
		effectC: Effect<C, D>,
		effectD: Effect<D, E>,
		effectE: Effect<E, F>,
		effectF: Effect<F, G>,
		effectG: Effect<G, H>,
	): void;
}

// Variadic pipeline function with strong types
export const createEffectPipeline: EffectsPipeline = (...effects: Effect<any, any>[]): void => {
	let currentEffect: Effect<any, any> = effects[0];

	// Loop through the effects and chain them using `sample`
	for (let i = 1; i < effects.length; i++) {
		const nextEffect = effects[i] as Effect<any, any>;

		sample({
			source: currentEffect.doneData,
			target: nextEffect,
		});

		currentEffect = nextEffect;
	}
};
