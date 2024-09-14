import { Meta, StoryObj } from '@storybook/react';
import { createFactory, invoke } from '@withease/factories';
import { createDomain, createEffect, createEvent, createStore, Event, fork, restore, sample, Unit } from 'effector';
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

const grapheneModel = invoke(grapheneModelFactory, { layouterFactory: Layouters.ELK });

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore
const $slowData = restore(slowedEvent, null);

export const Debounce: Story = {
	args: {
		units: [slowedEvent],
	},
};

const $writeableStore = createStore(0);
const $readonlyStore = readonly($writeableStore);

const $writeableStore2 = createStore(0);
const $readonlyStore2 = readonly($writeableStore2);
$readonlyStore2.watch(console.log);

export const Readonly: Story = {
	args: {
		units: [$readonlyStore, $readonlyStore2],
	},
};

const effectFactory = () => {
	const trigerEffect = createEvent();
	const testEffect = createEffect();

	sample({
		clock: trigerEffect,
		target: testEffect,
	});

	testEffect.finally.watch((result) => console.log('finally', result));

	testEffect.done.watch((result) => console.log('done', result));
	testEffect.doneData.watch((result) => console.log('doneData', result));
	testEffect.fail.watch((result) => console.log('fail', result));
	testEffect.failData.watch((result) => console.log('failData', result));

	testEffect.pending.watch((result) => console.log('pending', result));
	testEffect.inFlight.watch((result) => console.log('inFlight', result));

	return [trigerEffect, testEffect];
};

export const Effect: Story = {
	args: {
		units: [...effectFactory()],
	},
};

const childFactory = createFactory((event: Event<unknown>) => {
	const $value = restore(event, []);

	return { $value };
});

const parentFactory = createFactory(() => {
	const event = createEvent();

	const childModel = invoke(childFactory, event);

	return { event, $value: childModel.$value };
});

const parentModel = invoke(parentFactory);

export const NestedFactories = {
	args: {
		units: [...Object.values(parentModel)],
	},
};
