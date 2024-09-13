import { Meta, StoryObj } from '@storybook/react';
import { invoke } from '@withease/factories';
import { createDomain, createEvent, createStore, fork, restore, Unit } from 'effector';
import { Provider as EffectorScopeProvider, useUnit } from 'effector-react';
import { debounce, readonly } from 'patronum';
import { useEffect } from 'react';
import { createTodoListApi } from './examples/todo';
import { Graphene } from './Graphene';
import { Layouters } from './layouters';
import { appModelFactory, grapheneModelFactory } from './model';

type Params = { units: Unit<unknown>[] };

const meta: Meta<Params> = {
	title: 'Graphene',
	// @ts-expect-error don't know how to fix
	component: Graphene,
	render: function Render(props) {
		const appendUnits = useUnit(grapheneModel.appendUnits);

		useEffect(() => {
			appendUnits(props.units);
		}, [appendUnits, props.units]);

		return <Graphene model={appModel} />;
	},
	args: {
		units: [],
	},
	argTypes: {
		units: { table: { disable: true } },
	},
	decorators: [
		(Story) => {
			const scope = fork();

			console.log('😈😈😈', scope);
			return (
				<EffectorScopeProvider value={scope}>
					<Story />
				</EffectorScopeProvider>
			);
		},
	],
};

export default meta;

type Story = StoryObj<Params>;

const loneEvent = createEvent();
const $loneStore = createStore(null);

const domain = createDomain('Test');

const grapheneModel = invoke(grapheneModelFactory, {
	domain,
	layouterFactory: Layouters.ELK,
});

grapheneModel.appendUnits([$loneStore, loneEvent]);

const appModel = invoke(appModelFactory, grapheneModel);

const todoModel = invoke(createTodoListApi, []);

export const ToDo: Story = {
	args: {
		units: Object.values(todoModel),
	},
};

export const Test: Story = {
	args: {
		units: [$loneStore, loneEvent],
	},
};

export const GrapheneItself: Story = {
	args: {
		units: Object.values(appModel['@@unitShape']()),
	},
};

const tooFastEvent = createEvent();
const slowedEvent = debounce(tooFastEvent, 100);
const $slowData = restore(slowedEvent, null);

export const Debounce: Story = {
	args: {
		units: [slowedEvent],
	},
};

const $writeableStore = createStore(0);
const $readonlyStore = readonly($writeableStore);

export const Readonly: Story = {
	args: {
		units: [$readonlyStore],
	},
};
