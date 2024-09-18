import { invoke } from '@withease/factories';
import { fastStart } from '../bootstrap';
import { declarationsStoreModelFactory, grapheneModelFactory } from '../model';
import { type GrapheneMeta, type GrapheneStory, grapheneStoryMeta } from './meta-factored';

const genericGrapheneMeta: GrapheneMeta = {
	...grapheneStoryMeta,
	title: 'Graphene',
};

export default genericGrapheneMeta;

export const GrapheneWholesome: GrapheneStory = {
	args: {
		factory: () => invoke(fastStart),
	},
};

export const DeclarationsStore: GrapheneStory = {
	args: {
		factory: () => invoke(declarationsStoreModelFactory),
	},
};

export const Graphene: GrapheneStory = {
	args: {
		factory: () => {
			const declarationsModel = invoke(declarationsStoreModelFactory);
			const grapheneModel = invoke(grapheneModelFactory, { declarationsModel });
			return grapheneModel;
		},
	},
};
