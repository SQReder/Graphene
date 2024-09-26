import { createFactory } from '@withease/factories';
import { combine, createEvent, createStore, type Unit } from 'effector';
import { readonly, reshape } from 'patronum';
import { debounceStore } from '../debounceStore';
import { createEffectorNodesLookup, makeEdgesFromNodes } from '../lib';
import {
	type DeclarationEffectorNode,
	EffectorDeclarationDetails,
	type EffectorNode,
	type RegularEffectorNode,
} from '../types';
import type { DeclarationsStoreModel } from './declarationsStore';

export const grapheneModelFactory = createFactory(
	({ declarationsModel }: { declarationsModel: DeclarationsStoreModel }) => {
		const appendUnits = createEvent<ReadonlyArray<Unit<unknown>>>();

		const $units = readonly(
			createStore<Array<Unit<unknown>>>([]).on(appendUnits, (state, units) => [...state, ...units]),
		);

		const $debouncedUnits = debounceStore({
			source: $units,
			defaultState: [],
			timeoutMs: 100,
		});
		const $regularNodes = $debouncedUnits.map((units) => (units.length > 0 ? createEffectorNodesLookup(units) : []));

		const $debouncedDeclarations = debounceStore({
			source: declarationsModel.$declarations,
			defaultState: [],
			timeoutMs: 100,
		});

		const $effectorNodesLookup = combine(
			$regularNodes,
			$debouncedDeclarations,
			(effectorNodesById, declarations): Map<string, EffectorNode> => {
				if (effectorNodesById.length === 0) {
					console.log('skip graph computing');
					return new Map();
				}

				console.log('Nodes:', effectorNodesById);
				console.log('Declarations:', declarations);

				const regularNodeIds = new Set(effectorNodesById.map((node) => node.id));

				const nonUnitNodes: Array<[string, DeclarationEffectorNode]> = [];
				console.groupCollapsed('matching declarations');
				for (const declaration of declarations) {
					const declarationDetails = new EffectorDeclarationDetails(declaration);

					if (!regularNodeIds.has(declaration.id)) {
						if (declaration.type !== 'unit') {
							nonUnitNodes.push([
								declaration.id,
								{
									id: declaration.id,
									data: {
										nodeType: 'declaration',
										declaration: declarationDetails,
										label: declaration.name,
									},
									position: { x: 0, y: 0 },
								},
							]);
						}
					} else {
						console.groupCollapsed(`Declaration ${declaration.id} matched with regular unit`);
						console.log('Declaration:', declaration);
						const foundRegularUnit = effectorNodesById.find((node) => node.id === declaration.id);
						console.log('Regular unit:', foundRegularUnit);

						if (foundRegularUnit) {
							foundRegularUnit.data.declaration = declarationDetails;
						}
						console.groupEnd();
					}
				}
				console.groupEnd();

				const regularNodeEntries: Array<[string, RegularEffectorNode]> = effectorNodesById.map((node) => [
					node.id,
					node,
				]);
				return new Map<string, EffectorNode>([...regularNodeEntries, ...nonUnitNodes]);
			},
		);

		const edges = reshape({
			source: $effectorNodesLookup.map((map) => {
				try {
					return makeEdgesFromNodes(map);
				} catch (e) {
					console.error(e);
					return { linkingEdges: [], ownerhipEdges: [], reactiveEdges: [] } satisfies ReturnType<
						typeof makeEdgesFromNodes
					>;
				}
			}),
			shape: {
				$reactive: (edges) => edges.reactiveEdges,
				$ownership: (edges) => edges.ownerhipEdges,
				$linking: (edges) => edges.linkingEdges,
			},
		});

		const $nodes = $effectorNodesLookup.map((nodes) => [...nodes.values()]);

		return {
			$effectorNodesLookup,
			...edges,
			$nodes,
			appendUnits,
		};
	},
);

export type GrapheneModel = ReturnType<typeof grapheneModelFactory>;
