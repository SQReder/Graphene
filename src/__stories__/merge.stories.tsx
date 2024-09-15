import { Meta, StoryObj } from '@storybook/react';
import { createFactory, invoke } from '@withease/factories';
import { createEvent, fork, merge, Unit } from 'effector';
import { Provider as EffectorScopeProvider, useUnit } from 'effector-react';
import { useEffect } from 'react';
import { Graphene } from '../Graphene';
import { Layouters } from '../layouters';
import { appModelFactory, grapheneModelFactory } from '../model';

const grapheneModel = invoke(grapheneModelFactory);

const appModel = invoke(appModelFactory, { grapheneModel, layouterFactory: Layouters.ELK });

type Params = { units: Unit<unknown>[] };
type Story = StoryObj<Params>;

const meta: Meta<Params> = {
	title: 'Graphene/Merge',
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
		units: {
			table: {
				disable: true,
			},
		},
	},
	decorators: [
		(Story) => {
			const scope = fork();

			return (
				<EffectorScopeProvider value={scope}>
					<Story />
				</EffectorScopeProvider>
			);
		},
	],
};

export default meta;

const eventsMergeModelFactory = createFactory(() => {
	const firstEvent = createEvent();
	const secondEvent = createEvent();

	const merged = merge([firstEvent, secondEvent]);

	return {
		merged,
	};
});

const eventsSampleClockModel = invoke(eventsMergeModelFactory);

export const MergeEvents: Story = {
	args: {
		units: Object.values(eventsSampleClockModel),
	},
};
