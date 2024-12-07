import { createFactory } from '@withease/factories';
import { attach, createEffect, createEvent, createStore, sample, scopeBind, type Subscription } from 'effector';
import { type Declaration, inspectGraph } from 'effector/inspect';
import { debug, readonly } from 'patronum';

export const declarationsStoreModelFactory = createFactory(() => {
	const addDeclaration = createEvent<Declaration>();
	const clearDeclarations = createEvent();
	const $declarations = readonly(
		createStore<readonly Declaration[]>([])
			.on(addDeclaration, (state, declaration) => [...state, declaration])
			.reset(clearDeclarations),
	);

	const $inspectorSubscription = createStore<Subscription | null>(null);

	const unsubscribeFromInspectorFx = createEffect<Subscription | null, void>((subscription) => {
		subscription?.();
	});

	const subscribeToInspectorFx = createEffect<void, Subscription>(() => {
		const boundAddDeclaration = scopeBind(addDeclaration);
		return inspectGraph({
			fn: (declaration) => {
				boundAddDeclaration(declaration);
			},
		});
	});

	const clearLastSubscriptionAndSubscribeToInspectorFx = createEffect<
		{ lastSubscription: Subscription | null },
		Subscription
	>(async ({ lastSubscription }) => {
		await unsubscribeFromInspectorFx(lastSubscription);
		return subscribeToInspectorFx();
	});

	sample({
		clock: clearLastSubscriptionAndSubscribeToInspectorFx.doneData,
		target: $inspectorSubscription,
	});

	const attachedSubscribeToInspectorFx = attach({
		source: { lastSubscription: $inspectorSubscription },
		effect: clearLastSubscriptionAndSubscribeToInspectorFx,
	});

	debug(clearDeclarations);

	const subscribe = createEvent();
	const unsubscribe = createEvent();

	sample({
		clock: subscribe,
		target: attachedSubscribeToInspectorFx,
	});

	sample({
		clock: unsubscribe,
		source: $inspectorSubscription,
		target: unsubscribeFromInspectorFx,
	});

	sample({
		clock: unsubscribeFromInspectorFx.done,
		target: $inspectorSubscription.reinit,
	});

	debug(subscribe, unsubscribe, subscribeToInspectorFx, unsubscribeFromInspectorFx, addDeclaration);

	return {
		$declarations,
		clearDeclarations,
		subscribe,
		unsubscribe,
	};
});

export type DeclarationsStoreModel = ReturnType<typeof declarationsStoreModelFactory>;
