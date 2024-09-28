import { createSourceEdge } from '../../edge-factories';
import { ensureDefined, isRegularNode } from '../../lib';
import type { MyEdge, RegularEffectorNode } from '../../types';
import { makeGraphLookups } from './lib';
import type { NamedGraphCleaner } from './types';

function hasNoFields(obj: Record<keyof any, unknown>): boolean {
	return Object.keys(obj).length === 0;
}

const isRegionRoot = (node: RegularEffectorNode) => {
	if (node.data.declaration?.type === 'region') return true;

	// пытаемся по косвенным признакам определить корневой узел региона
	const graphite = node.data.effector.graphite;
	const emptyMeta = hasNoFields(graphite.meta);
	const emptyScope = hasNoFields(graphite.scope);
	const noNextLinks = graphite.next.length === 0;
	const noSeqItems = 'seq' in graphite && Array.isArray(graphite.seq) && graphite.seq.length === 0;

	const noOwners = graphite.family.owners.length === 0;
	const manyLinks = graphite.family.links.length > 0;

	const likelyAnRegionRoot = emptyMeta && emptyScope && noNextLinks && noSeqItems && noOwners && manyLinks;

	return likelyAnRegionRoot;
};

export const regionOwnershipReflow: NamedGraphCleaner = {
	name: 'Region Ownership Reflow',
	apply: (graph) => {
		console.groupCollapsed('Region Ownership Reflow');
		const lookups = makeGraphLookups(graph);

		const edgesToRemove: MyEdge[] = [];
		const edgesToAdd: MyEdge[] = [];

		for (const regionNode of lookups.nodes.values()) {
			if (!isRegularNode(regionNode) || !isRegionRoot(regionNode)) {
				continue;
			}

			console.groupCollapsed(`Processing node: ${regionNode.id}`);

			const regionOwnershipEdges = lookups.edgesBySource.source.get(regionNode.id);

			const restricted = regionOwnershipEdges
				?.filter((edge) => {
					const edgesWithSameTarget = lookups.edgesByTarget.source.get(edge.target);
					return edgesWithSameTarget && edgesWithSameTarget?.length > 1;
				})
				.filter((edge) => {
					// i want to exclude from deletion edges that have reactive link to regionNode

					// get ownership target node and check for node type
					const target = edge.data.relatedNodes.target;
					if (!isRegularNode(target)) return true;

					// then check for reactive nodes from regionNode to this target
					// if reactive node from regionNode to target exists - then do not remove edge

					// const ops: OpType[] = [OpType.On, OpType.Map, OpType.FilterMap, OpType.Combine, OpType.Merge];

					const toTarget = lookups.edgesByTarget.reactive.get(target.id);
					const edgesFromRegionToTarget = toTarget?.filter((edge) => edge.source === regionNode.id) ?? [];
					if (edgesFromRegionToTarget.length > 0) {
						return false;
					}

					// const opType = target.data.effector.meta.value.op;
					// return opType == null || !ops.includes(opType);
					return true;
				});

			if (restricted) {
				edgesToRemove.push(...restricted);

				const factoryOwnerId = lookups.edgesByTarget.source
					.get(regionNode.id)
					?.find(
						(edge) =>
							isRegularNode(edge.data.relatedNodes.source) && edge.data.relatedNodes.source.data.effector.isFactory,
					)?.data.relatedNodes.source.id;
				if (factoryOwnerId) {
					const map = restricted.map((edge) => {
						const id = edge.id + ' reflowed from ' + regionNode.id + ' to ' + factoryOwnerId;
						console.log('id', id);
						return createSourceEdge({
							id: id,
							source: ensureDefined(lookups.nodes.get(factoryOwnerId)),
							target: edge.data.relatedNodes.target,
						});
					});
					const reflowed = map.filter((edge) => {
						const ownershipEdgedFromFactory = lookups.edgesBySource.source.get(factoryOwnerId);
						const ownershipEdgedFromFactoryToTarget = ownershipEdgedFromFactory?.find(
							(fromFactory) => fromFactory.target === edge.target,
						);
						console.log(
							`reflowed edge ${edge.id} from factory ${factoryOwnerId} to ${edge.target} is ${
								ownershipEdgedFromFactoryToTarget == null ? 'added' : 'not added'
							}`,
						);
						return ownershipEdgedFromFactoryToTarget == null;
					});
					edgesToAdd.push(...reflowed);
				}
			}
			console.groupEnd();
		}

		console.log('Edges to remove:', edgesToRemove);
		console.log('Edges to add:', edgesToAdd);
		console.groupEnd();

		return {
			nodes: graph.nodes,
			edges: graph.edges.filter((edge) => !edgesToRemove.includes(edge)).concat(...edgesToAdd),
		};
	},
};
