import { createFactory, invoke } from '@withease/factories';
import { Layouters } from './layouters';
import { appModelFactory, declarationsStoreModelFactory, grapheneModelFactory } from './model';

export const fastStart = createFactory(() => {
	const declarationsModel = invoke(declarationsStoreModelFactory);
	const grapheneModel = invoke(grapheneModelFactory, { declarationsModel });

	const app = invoke(appModelFactory, {
		grapheneModel,
		layouterFactory: Layouters.ELK,
	});

	return app;
});
