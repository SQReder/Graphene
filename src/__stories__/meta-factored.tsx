import type { Meta, StoryObj } from '@storybook/react';
import { invoke } from '@withease/factories';
import { clearNode, createDomain, fork, is, withRegion } from 'effector';
import { Provider as EffectorScopeProvider, useUnit } from 'effector-react';
import { useEffect } from 'react';
import { newPipeline } from '../brand-new-graph-cleaners/pipeline';
import type { NamedGraphVisitor } from '../brand-new-graph-cleaners/types';
import { Graphene } from '../Graphene';
import { Layouters } from '../layouters';
import { assertDefined } from '../lib';
import { appModelFactory } from '../model/app';
import { declarationsStoreModelFactory } from '../model/declarationsStore';
import { grapheneModelFactory } from '../model/graphene';
import { CleanerSelector } from '../ui/CleanerSelector';

export type Params = { factory: () => Record<string, unknown> };

const declarationsModel = invoke(declarationsStoreModelFactory);
const grapheneModel = invoke(grapheneModelFactory, { declarationsModel });

const appModel = invoke(appModelFactory, {
	grapheneModel,
	layouterFactory: Layouters.ELK,
	graphCleanerSelector: invoke(CleanerSelector.factory<NamedGraphVisitor>(), { availableCleaners: newPipeline }),
});

export type GrapheneMeta = Meta<Params>;

export const grapheneStoryMeta: GrapheneMeta = {
	title: 'Graphene',
	// @ts-expect-error don't know how to fix
	component: Graphene,
	tags: ['!autodocs'],
	render: function Render({ factory }) {
		const appendUnits = useUnit(appModel.appendUnits);
		const clearDeclarations = useUnit(declarationsModel.clearDeclarations);
		const [subscribe, unsubscribe] = useUnit([declarationsModel.subscribe, declarationsModel.unsubscribe]);

		useEffect(() => {
			console.group('foo');

			clearDeclarations();
			subscribe();

			console.groupCollapsed('🫨 make units');
			let model: Record<string, unknown> | undefined;
			const domain = createDomain(`graphene-domain-${Math.random()}`);
			withRegion(domain, () => {
				model = factory();
			});
			assertDefined(model);
			const units = Object.values(model).filter(is.unit);
			unsubscribe();

			console.log('appendUnits', units);
			appendUnits(units);
			appendUnits([domain]);
			console.groupEnd();

			console.groupEnd();

			return () => {
				clearNode(domain, { deep: true });
			};
		}, [appendUnits, clearDeclarations, factory, subscribe, unsubscribe]);

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
