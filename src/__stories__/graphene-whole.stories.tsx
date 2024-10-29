import { invoke } from '@withease/factories';
import { fastStart } from '../bootstrap';
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
