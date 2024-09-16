import type { Meta, StoryObj } from '@storybook/react';
import { createFactory, invoke } from '@withease/factories';
import type { Unit } from 'effector';
import { createEvent, fork, sample } from 'effector';
import { Provider as EffectorScopeProvider, useUnit } from 'effector-react';
import { useEffect } from 'react';
import { ownershipEdgeCleaners } from '../graph-morphers/cleaners/edge-ownership';
import type { NamedOwnershipEdgeCleaner } from '../graph-morphers/cleaners/edge-ownership/types';
import { reactiveEdgeCleaners } from '../graph-morphers/cleaners/edge-reactive';
import type { NamedReactiveEdgeCleaner } from '../graph-morphers/cleaners/edge-reactive/types';
import { graphCleaners } from '../graph-morphers/cleaners/graph';
import type { NamedGraphCleaner } from '../graph-morphers/cleaners/types';
import { Graphene } from '../Graphene';
import { Layouters } from '../layouters';
import { appModelFactory, grapheneModelFactory } from '../model';
import { CleanerSelector } from '../ui/CleanerSelector';

const grapheneModel = invoke(grapheneModelFactory);
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

type Params = { units: Array<Unit<unknown>> };
type Story = StoryObj<Params>;

const meta: Meta<Params> = {
	title: 'Graphene/Samples',
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

const eventsSampleClockModelFactory = createFactory(() => {
	const clockEvent = createEvent();
	const targetEvent = createEvent();

	sample({
		clock: clockEvent,
		target: targetEvent,
	});

	return {
		clockEvent,
		targetEvent,
	};
});

const eventsSampleClockModel = invoke(eventsSampleClockModelFactory);

export const Sample: Story = {
	args: {
		units: Object.values(eventsSampleClockModel),
	},
};
