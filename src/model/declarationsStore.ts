import { createFactory } from '@withease/factories';
import { createEvent, createStore } from 'effector';
import type { Declaration } from 'effector/inspect';
import { debug, readonly } from 'patronum';

export const declarationsStoreModelFactory = createFactory(() => {
	const addDeclaration = createEvent<Declaration>();
	const clearDeclarations = createEvent();
	const $declarations = readonly(
		createStore<readonly Declaration[]>([])
			.on(addDeclaration, (state, declaration) => [...state, declaration])
			.reset(clearDeclarations),
	);

	debug(clearDeclarations);

	return {
		$declarations,
		clearDeclarations,
		addDeclaration,
	};
});

export type DeclarationsStoreModel = ReturnType<typeof declarationsStoreModelFactory>;
