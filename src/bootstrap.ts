import { createFactory, invoke } from '@withease/factories';
import type { NamedGraphCleaner } from './graph-morphers/cleaners/types';
import { pipeline } from './graph-morphers/pipeline';
import { Layouters } from './layouters';
import { appModelFactory, declarationsStoreModelFactory, grapheneModelFactory } from './model';
import { CleanerSelector } from './ui/CleanerSelector';

export const fastStart = createFactory(() => {
	const declarationsModel = invoke(declarationsStoreModelFactory);
	const grapheneModel = invoke(grapheneModelFactory, { declarationsModel });

	const app = invoke(appModelFactory, {
		grapheneModel,
		layouterFactory: Layouters.ELK,
		graphCleanerSelector: invoke(CleanerSelector.factory<NamedGraphCleaner>(), { availableCleaners: pipeline }),
	});

	return app;
});
