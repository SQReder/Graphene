import type { Meta, StoryObj } from '@storybook/react';
import { invoke } from '@withease/factories';
import { fork, is } from 'effector';
import { Provider as EffectorScopeProvider, useUnit } from 'effector-react';
import { inspectGraph } from 'effector/inspect';
import { useEffect } from 'react';
import { ownershipEdgeCleaners } from '../graph-morphers/cleaners/edge-ownership';
import type { NamedOwnershipEdgeCleaner } from '../graph-morphers/cleaners/edge-ownership/types';
import { reactiveEdgeCleaners } from '../graph-morphers/cleaners/edge-reactive';
import type { NamedReactiveEdgeCleaner } from '../graph-morphers/cleaners/edge-reactive/types';
import { graphCleaners } from '../graph-morphers/cleaners/graph';
import type { NamedGraphCleaner } from '../graph-morphers/cleaners/types';
import { Graphene } from '../Graphene';
import { Layouters } from '../layouters';
import { appModelFactory, createDeclarationsStore, grapheneModelFactory } from '../model';
import { CleanerSelector } from '../ui/CleanerSelector';

export type Params = { factory: () => Record<string, unknown> };

const declarationsModel = invoke(createDeclarationsStore);
const grapheneModel = invoke(grapheneModelFactory, { declarationsModel });
const graphCleanerSelector = invoke(CleanerSelector.factory<NamedGraphCleaner>(), graphCleaners);
const ownershipEdgeCleanerSelector = invoke(
	CleanerSelector.factory<NamedOwnershipEdgeCleaner>(),
	ownershipEdgeCleaners,
);
const reactiveEdgeCleanerSelector = invoke(CleanerSelector.factory<NamedReactiveEdgeCleaner>(), reactiveEdgeCleaners);

const appModel = invoke(appModelFactory, {
	grapheneModel,
	layouterFactory: Layouters.ELK,
	graphCleanerSelector,
	ownershipEdgeCleanerSelector,
	reactiveEdgeCleanerSelector,
});

export type GrapheneMeta = Meta<Params>;
export const grapheneStoryMeta: GrapheneMeta = {
	title: 'Graphene',
	// @ts-expect-error don't know how to fix
	component: Graphene,
	tags: ['!autodocs'],
	render: function Render({ factory }) {
		const appendUnits = useUnit(appModel.appendUnits);
		const addDeclaration = useUnit(declarationsModel.addDeclaration);
		const clearDeclarations = useUnit(declarationsModel.clearDeclarations);

		useEffect(() => {
			console.group('foo');
			const id = Math.floor(Math.random() * 10000).toString(16);

			console.log('subscribe', id);

			const subscription = inspectGraph({
				fn: (declaration) => {
					console.log(id, '...', declaration.id, declaration);
					addDeclaration(declaration);
				},
			});

			clearDeclarations();

			console.group('🫨 make units');
			const model = factory();
			const units = Object.values(model).filter(is.unit);

			console.log('appendUnits', units);
			appendUnits(units);
			console.groupEnd();

			console.groupEnd();

			return () => {
				console.log('unsubscribe', id);
				subscription.unsubscribe();
			};
		}, [addDeclaration, appendUnits, clearDeclarations, factory]);

		return <Graphene model={appModel} />;
	},
	args: {
		factory: () => ({}),
	},
	argTypes: {
		factory: {
			table: {
				disable: true,
			},
		},
	},
	decorators: [
		(Story) => {
			const scope = fork();

			// @ts-expect-error untyped
			scope._debugId = (Math.random() * 100000).toString(16);

			return (
				<EffectorScopeProvider value={scope}>
					<Story />
				</EffectorScopeProvider>
			);
		},
	],
};

export type GrapheneStory = StoryObj<Params>;
