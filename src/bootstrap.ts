import { createFactory, invoke } from '@withease/factories';
import { newPipeline } from './brand-new-graph-cleaners/pipeline';
import type { NamedGraphVisitor } from './brand-new-graph-cleaners/types';
import { Layouters } from './layouters';
import { appModelFactory } from './model/app';
import { declarationsStoreModelFactory } from './model/declarationsStore';
import { grapheneModelFactory } from './model/graphene';
import { CleanerSelector } from './ui/CleanerSelector';

export const fastStart = createFactory(() => {
	const declarationsModel = invoke(declarationsStoreModelFactory);
	const grapheneModel = invoke(grapheneModelFactory, { declarationsModel });

	const app = invoke(appModelFactory, {
		grapheneModel,
		layouterFactory: Layouters.ELK,
		graphCleanerSelector: invoke(CleanerSelector.factory<NamedGraphVisitor>(), { availableCleaners: newPipeline }),
	});

	return app;
});
