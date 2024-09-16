import { invoke } from '@withease/factories';
import { ownershipEdgeCleaners } from './graph-morphers/cleaners/edge-ownership';
import type { NamedOwnershipEdgeCleaner } from './graph-morphers/cleaners/edge-ownership/types';
import { reactiveEdgeCleaners } from './graph-morphers/cleaners/edge-reactive';
import type { NamedReactiveEdgeCleaner } from './graph-morphers/cleaners/edge-reactive/types';
import { graphCleaners } from './graph-morphers/cleaners/graph';
import type { NamedGraphCleaner } from './graph-morphers/cleaners/types';
import { Layouters } from './layouters';
import { appModelFactory, grapheneModelFactory } from './model';
import { CleanerSelector } from './ui/CleanerSelector';

const grapheneModel = invoke(grapheneModelFactory);
const graphCleanerSelector = invoke(CleanerSelector.factory<NamedGraphCleaner>(), graphCleaners);
const ownershipEdgeCleanerSelector = invoke(
	CleanerSelector.factory<NamedOwnershipEdgeCleaner>(),
	ownershipEdgeCleaners,
);
const reactiveEdgeCleanerSelector = invoke(CleanerSelector.factory<NamedReactiveEdgeCleaner>(), reactiveEdgeCleaners);

export const bootstrapped = invoke(appModelFactory, {
	grapheneModel,
	layouterFactory: Layouters.ELK,
	graphCleanerSelector,
	ownershipEdgeCleanerSelector,
	reactiveEdgeCleanerSelector,
});
