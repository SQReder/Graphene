import { createFactory, invoke } from '@withease/factories';
import { combine, createEvent, createStore, type Unit } from 'effector';
import type { Declaration } from 'effector/inspect';
import { debug, readonly } from 'patronum';
import { debounceStore, debounceStoreFactory } from '../debounceStore';
import { cleanupEdges, generateEdges } from '../edges-generator';
import { createEffectorNodesLookup } from '../lib';
import { type DeclarationEffectorNode, EffectorDeclarationDetails, type EffectorNode } from '../types';
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

		const $edges = $regularNodes.map((nodes) => {
			const edges = generateEdges(nodes);
			return cleanupEdges(edges, nodes);
		});

		const $debouncedDeclarations = invoke(debounceStoreFactory<readonly Declaration[]>, {
			source: declarationsModel.$declarations,
			defaultState: [],
			timeoutMs: 100,
		});

		const $nodes = combine(
			{ effectorNodesById: $regularNodes, declarations: $debouncedDeclarations },
			({ effectorNodesById, declarations }): EffectorNode[] => {
				// if (effectorNodesById.length === 0) {
				// 	console.log('skip graph computing');
				// 	return [];
				// }

				console.log('Nodes:', effectorNodesById);
				console.log('Declarations:', declarations);

				const regularNodeIds = new Set(effectorNodesById.map((node) => node.id));

				const nonUnitNodes: DeclarationEffectorNode[] = [];
				console.groupCollapsed('matching declarations');
				for (const declaration of declarations) {
					const declarationDetails = new EffectorDeclarationDetails(declaration);

					if (!regularNodeIds.has(declaration.id)) {
						console.log('Declaration', declaration.id, 'not matched with regular unit');
						if (declaration.type !== 'unit') {
							console.log('Declaration', declaration.id, 'is not a unit');
							nonUnitNodes.push({
								id: declaration.id,
								data: {
									id: declaration.id,
									nodeType: 'declaration',
									declaration: declarationDetails,
									label: declaration.name,
								},
								position: { x: 0, y: 0 },
							});
						} else {
							console.log('Declaration', declaration.id, 'is a unit');
							console.debug('Declaration', declaration);
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

				return [...effectorNodesById, ...nonUnitNodes];
			},
		);

		debug($nodes);

		return {
			$edges,
			$nodes,
			appendUnits,
		};
	},
);

export type GrapheneModel = ReturnType<typeof grapheneModelFactory>;
