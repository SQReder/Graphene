import type { Unit } from 'effector';
import type { Comparator } from './comparison';
import { combineComparators } from './comparison';
import { createOwnershipEdge, createReactiveEdge } from './edge-factories';
import type { GraphCleaner } from './graph-morphers/cleaners/types';
import { layoutGraph } from './layouters';
import type { Layouter } from './layouters/types';
import type {
	DeclarationEffectorNode,
	EffectorGraph,
	EffectorNode,
	Graphite,
	LinkEdge,
	Meta,
	MyEdge,
	OwnershipEdge,
	ReactiveEdge,
	RegularEffectorDetails,
	RegularEffectorNode,
	UnitMeta,
} from './types';
import { EdgeType, EffectorNodeDetails, MetaType, NodeFamily, OpType } from './types';

export function absurd(value: never): never {
	throw new Error(`Expect to be unreachable, however receive ${JSON.stringify(value)}`);
}

export const getMetaIcon = (meta: Meta): string => {
	switch (meta.op) {
		case OpType.Watch:
			return '👓';
		case OpType.On:
			return '🔛';
		case OpType.Map:
			return '➡️';
		case OpType.FilterMap:
			return '📝';
		case OpType.Combine:
			return '⊕';
		case OpType.Store:
			return '📦';
		case OpType.Event:
			return '🔔';
		case OpType.Sample:
			return '🔁';
		case OpType.Effect:
			return meta.attached ? '⚡️~⚡️' : '⚡️';
		case OpType.Merge:
			return '🔀';
		case OpType.Domain:
			return '🌐';
		default:
			switch (meta.type) {
				case MetaType.Factory:
					return '🏭';
				default:
					return '❓';
			}
	}
};

export function formatMeta(id: string, meta: Meta) {
	const id_ = `[${id}]`;
	switch (meta.op) {
		case OpType.Watch:
			return `${id_} .watch`;
		case OpType.On:
			return `${id_} .on`;
		case OpType.Map:
			return `${id_} .map`;
		case OpType.FilterMap:
			return `${id_} .filterMap`;
		case OpType.Combine:
			return `${id_} combine`;
		case OpType.Store:
			return `📦 ${id_} ${meta.name}${meta.derived ? ' (derived)' : ''}`;
		case OpType.Event:
			return `🔔 ${id_} ${meta.name}${meta.derived ? ' (derived)' : ''}`;
		case OpType.Sample:
			return `${id_} 📊➕🔄 ` + meta.joint;
		case OpType.Effect:
			return `${meta.attached ? '⚡️~⚡️' : '⚡️'}  ${id_}` + meta.name;
		case OpType.Merge:
			return `${id_} merge`;
		case OpType.Domain:
			return `🌐 ${meta.name}${meta.derived ? ' (derived)' : ''}`;
		default:
			switch (meta.type) {
				case MetaType.Factory:
					return `🏭 ${meta.method}(${meta.name})`;
				case MetaType.Domain:
					return '🫠 domain ' + meta.name;
				default:
					try {
						absurd(meta.type);
					} catch {
						console.warn('Unexpected node - returning unknown', id, meta);
					}
					return `${id} unknown`;
			}
	}
}

export function hasGraphite(unit: Unit<unknown>): unit is Unit<unknown> & { graphite: Graphite } {
	return 'graphite' in unit;
}

export function isUnitMeta(meta: Meta): meta is UnitMeta {
	return meta.op === OpType.Store || meta.op === OpType.Event || meta.op === OpType.Effect;
}

export function traverseEffectorGraph(units: ReadonlyArray<Unit<unknown>>): Graphite[] {
	const result: Graphite[] = [];
	const visited = new Set<string>();

	console.groupCollapsed('traversing');

	function traverse(graphite: Graphite) {
		if (visited.has(graphite.id)) {
			console.debug('already known graphite', graphite.id);
			return;
		} else {
			console.debug('add graphite', graphite.id);
			result.push(graphite);
			visited.add(graphite.id);
		}

		if (graphite.family) {
			graphite.family.owners.forEach(traverse);
			graphite.family.links.forEach(traverse);
			graphite.next.filter(traverse);
		}
	}

	units.forEach((unit) => {
		if (!hasGraphite(unit)) {
			console.log('no graphite', unit);
			return;
		}

		traverse(unit.graphite);
	});

	console.groupEnd();

	return result;
}

export function makeEdgesFromNodes(nodesMap: Map<string, EffectorNode>): {
	linkingEdges: LinkEdge[];
	ownerhipEdges: OwnershipEdge[];
	reactiveEdges: ReactiveEdge[];
} {
	const reactiveEdges: ReactiveEdge[] = [];
	const ownershipEdges: OwnershipEdge[] = [];
	const linkingEdges: LinkEdge[] = [];

	const visited = new Set<string>();

	function traverseForGood(current: Graphite) {
		if (visited.has(current.id)) {
			return;
		} else {
			visited.add(current.id);
		}

		const links = [...current.family.links];

		if (current.family.type === 'regular') {
			current.family.owners.forEach((owner) => {
				const singleDuplicatedOwner = links.findIndex((link) => link.id === owner.id);
				if (singleDuplicatedOwner !== -1) links.splice(singleDuplicatedOwner, 1);
			});
		}

		new Set(links).forEach((link) => {
			linkingEdges.push({
				id: current.id + ' linked to ' + link.id,
				source: current.id,
				target: link.id,
				data: {
					edgeType: EdgeType.Link,
					relatedNodes: {
						source: ensureDefined(nodesMap.get(current.id)),
						target: ensureDefined(nodesMap.get(link.id)),
					},
				},
			});
		});

		new Set(current.next).forEach((next) => {
			try {
				const id = `${current.id} --> ${next.id}`;

				reactiveEdges.push(
					createReactiveEdge({
						id,
						source: nodesMap.get(current.id)!,
						target: nodesMap.get(next.id)!,
					}),
				);
			} catch (e) {
				console.error(e, current, next);
			}

			traverseForGood(next);
		});

		new Set(current.family.owners).forEach((owner) => {
			try {
				const id = `${owner.id} owns ${current.id}`;

				ownershipEdges.push(
					createOwnershipEdge({
						id,
						source: ensureDefined(nodesMap.get(owner.id)),
						target: ensureDefined(nodesMap.get(current.id)),
					}),
				);
			} catch (e) {
				console.error(e, current, owner);
			}
		});
	}

	Array.from(nodesMap.values())
		.filter(isRegularNode)
		.forEach(({ data }) => {
			traverseForGood(data.effector.graphite);
		});

	return {
		reactiveEdges,
		ownerhipEdges: ownershipEdges,
		linkingEdges,
	};
}

const isDerived = (graphite: Graphite) => isUnitMeta(graphite.meta) && graphite.meta.derived;

export function makeEffectorNode(graphite: Graphite): RegularEffectorNode {
	const nodeDetails = new EffectorNodeDetails(graphite);

	return {
		id: graphite.id,
		position: { x: 0, y: 0 },
		data: {
			label: formatMeta(graphite.id, graphite.meta),
			effector: nodeDetails,
			nodeType: nodeDetails.type,
		},
		type:
			graphite.meta.op === 'store'
				? 'storeNode'
				: graphite.meta.op === 'event'
				? 'eventNode'
				: graphite.meta.op === 'effect'
				? 'effectNode'
				: graphite.meta.op === 'sample'
				? 'sampleNode'
				: graphite.meta.op === 'combine'
				? 'combineNode'
				: graphite.meta.op === undefined && graphite.meta.type === 'factory'
				? 'factoryNode'
				: undefined,

		style: {
			border: isDerived(graphite) ? '1px dotted gray' : '1px solid black',
			background: getBackground(graphite.family.type),
			...(graphite.meta.op === 'combine'
				? {
						width: '20px',
						height: '20px',
						borderRadius: '10px',
				  }
				: {}),
		},
	};
}

function getBackground(linkType: NodeFamily) {
	switch (linkType) {
		case NodeFamily.Crosslink:
			return '#f3f38f';
		case NodeFamily.Regular:
			return 'transparent';
		case NodeFamily.Declaration:
			return '#efefef';
		case NodeFamily.Domain:
			return '#8fe4f3';
		default:
			absurd(linkType);
	}
}

export function isDeclarationNode(node: EffectorNode): node is DeclarationEffectorNode {
	return node.data.nodeType === NodeFamily.Declaration;
}

export function isRegularNode(node: EffectorNode): node is RegularEffectorNode {
	return node.data.nodeType === NodeFamily.Regular || node.data.nodeType === NodeFamily.Crosslink;
}

export function assertIsRegularEffectorDetails(details: unknown): asserts details is RegularEffectorDetails {
	if (details === null || details === undefined) {
		throw new Error('assertIsRegularEffectorDetails: given value is null or undefined');
	}

	if (typeof details !== 'object') {
		throw new Error(`assertIsRegularEffectorDetails: given value is not an object, but ${typeof details}`);
	}

	if (!('nodeType' in details)) {
		throw new Error(`assertIsRegularEffectorDetails: given object does not have nodeType property`);
	}

	if (details.nodeType !== NodeFamily.Regular && details.nodeType !== NodeFamily.Crosslink) {
		throw new Error(
			`assertIsRegularEffectorDetails: given nodeType is not a regular effector node type, but ${details.nodeType}`,
		);
	}
}

const idComparator: Comparator<EffectorNode> = (a, b) => Number(a.id) - Number(b.id);
const parentIdComparator: Comparator<EffectorNode> = (a, b) => {
	if (a.parentId === undefined && b.parentId === undefined) return 0;

	if (a.parentId === undefined) return -1;
	if (b.parentId === undefined) return 1;

	return Number(b.parentId) - Number(a.parentId);
};

const combined = combineComparators(parentIdComparator, idComparator);

export const sortNodes = (initialNodes: EffectorNode[]): EffectorNode[] => {
	return [...initialNodes].sort(combined);
};

export function getEdgeRelatedGraphite(edge: MyEdge, relation: 'source' | 'target'): Graphite | undefined {
	const node = edge.data.relatedNodes[relation];
	if (isRegularNode(node)) return node.data.effector.graphite;
	else {
		return undefined;
	}
}

export function hasOpType<Op extends OpType>(
	graphite: Graphite,
	opType: Op | undefined,
): graphite is Graphite & { meta: { op: Op } } {
	return graphite.meta.op === opType;
}

export function nodeHasOpType<Op extends OpType>(
	node: EffectorNode,
	opType: Op | undefined,
): node is RegularEffectorNode & {
	data: { effector: { graphite: Graphite & { meta: { op: Op } } } };
} {
	return isRegularNode(node) && hasOpType(node.data.effector.graphite, opType);
}

export function isReactiveEdge(edge: MyEdge): edge is ReactiveEdge {
	return edge.data.edgeType === EdgeType.Reactive;
}

export function isOwnershipEdge(edge: MyEdge): edge is OwnershipEdge {
	return edge.data.edgeType === EdgeType.Ownership;
}

export type GraphTypedEdges = {
	ownership: Map<string, OwnershipEdge[]>;
	reactive: Map<string, ReactiveEdge[]>;
};

export type GraphTypedEdgesSelector<T extends MyEdge> = T['data']['edgeType'] & keyof GraphTypedEdges;

export function getEdgesBy(edges: MyEdge[], variant: 'source' | 'target'): GraphTypedEdges {
	return edges.reduce(
		(maps, edge) => {
			if (isReactiveEdge(edge)) {
				const map = maps.reactive;
				if (map.has(edge[variant])) {
					map.get(edge[variant])!.push(edge);
				} else {
					map.set(edge[variant], [edge]);
				}
			} else if (isOwnershipEdge(edge)) {
				const map = maps.ownership;
				if (map.has(edge[variant])) {
					map.get(edge[variant])!.push(edge);
				} else {
					map.set(edge[variant], [edge]);
				}
			} else {
				console.debug(edge.data.edgeType, 'not supported yet');
			}

			return maps;
		},
		{
			reactive: new Map<string, ReactiveEdge[]>(),
			ownership: new Map<string, OwnershipEdge[]>(),
		},
	);
}

export function getOwnershipEdgesBy(edges: MyEdge[], variant: 'source' | 'target'): Map<string, OwnershipEdge[]> {
	return edges.reduce((map, edge) => {
		if (isOwnershipEdge(edge)) {
			if (map.has(edge[variant])) {
				map.get(edge[variant])!.push(edge);
			} else {
				map.set(edge[variant], [edge]);
			}
		}

		return map;
	}, new Map<string, OwnershipEdge[]>());
}

export function getReactiveEdgesBy(edges: MyEdge[], variant: 'source' | 'target'): Map<string, ReactiveEdge[]> {
	return edges.reduce((map, edge) => {
		if (isReactiveEdge(edge)) {
			if (map.has(edge[variant])) {
				map.get(edge[variant])!.push(edge);
			} else {
				map.set(edge[variant], [edge]);
			}
		}

		return map;
	}, new Map<string, ReactiveEdge[]>());
}

export function shallowCopyGraph(graph: EffectorGraph) {
	return {
		nodes: [...graph.nodes],
		edges: [...graph.edges],
	};
}

export type Lookups = {
	nodes: Map<string, EffectorNode>;
	edgesBySource: GraphTypedEdges;
	edgesByTarget: GraphTypedEdges;
};

type NodeWithRelatedEdges<T extends MyEdge> = {
	incoming: T[];
	outgoing: T[];
	node: EffectorNode;
};

type TypedEdgeList = {
	ownership: OwnershipEdge[];
	reactive: ReactiveEdge[];
};

type NodeWithRelatedTypedEdges = {
	incoming: TypedEdgeList;
	outgoing: TypedEdgeList;
	node: EffectorNode;
};

export function findNodesByOpTypeWithRelatedEdges<T extends MyEdge>(
	opType: OpType | undefined,
	lookups: {
		byTarget: Map<string, T[]>;
		bySource: Map<string, T[]>;
		nodes: Map<string, EffectorNode>;
	},
	extraFilter: (node: RegularEffectorNode) => boolean = () => true,
): Array<NodeWithRelatedEdges<T>> {
	const result: Array<NodeWithRelatedEdges<T>> = [];

	Array.from(lookups.nodes.values()).forEach((node) => {
		if (isRegularNode(node) && node.data.effector.meta.hasOpType(opType) && extraFilter(node)) {
			result.push({
				node,
				incoming: lookups.byTarget.get(node.id) || [],
				outgoing: lookups.bySource.get(node.id) || [],
			});
		}
	});

	return result;
}

export function findNodesByOpTypeWithRelatedTypedEdges(
	opType: OpType | undefined,
	lookups: Lookups,
	extraFilter: (node: RegularEffectorNode) => boolean = () => true,
): NodeWithRelatedTypedEdges[] {
	const result: NodeWithRelatedTypedEdges[] = [];

	Array.from(lookups.nodes.values()).forEach((node) => {
		if (isRegularNode(node) && node.data.effector.meta.hasOpType(opType) && extraFilter(node)) {
			result.push({
				node,
				incoming: {
					ownership: lookups.edgesByTarget.ownership.get(node.id) ?? [],
					reactive: lookups.edgesByTarget.reactive.get(node.id) ?? [],
				},
				outgoing: {
					ownership: lookups.edgesBySource.ownership.get(node.id) ?? [],
					reactive: lookups.edgesBySource.reactive.get(node.id) ?? [],
				},
			});
		}
	});

	return result;
}

export function findNodesByOpType(
	opType: OpType,
	nodes: EffectorNode[],
	extraFilter: (node: RegularEffectorNode) => boolean = () => true,
): RegularEffectorNode[] {
	return nodes.filter(isRegularNode).filter((node) => node.data.effector.meta.hasOpType(opType) && extraFilter(node));
}

export function ensureDefined<T>(value: T, message?: string): NonNullable<T> {
	if (value === null || value === undefined) {
		const errorMessage = message ?? `Expected a value, but received ${value === null ? 'null' : 'undefined'}`;
		console.error(errorMessage);
		throw new RangeError(errorMessage);
	}
	return value;
}

export function assertDefined<T>(value: T, variableName?: string): asserts value is NonNullable<T> {
	if (value === undefined || value === null) {
		console.error(`${variableName} expected to be defined, but receive ${String(value)}`);
		throw new Error(`${variableName} expected to be defined, but receive ${String(value)}`);
	}
}

export function remap<K, V, U>(map: ReadonlyMap<K, V>, fn: (v: V) => U): Map<K, U> {
	return new Map(Array.from(map.entries()).map(([k, v]) => [k, fn(v)]));
}

export function createEffectorNodesLookup(units: ReadonlyArray<Unit<unknown>>): RegularEffectorNode[] {
	const graphites = traverseEffectorGraph(units);
	return graphites.map(makeEffectorNode);
}

export const GraphVariant = {
	raw: 'raw',
	cleaned: 'cleaned',
	cleanedNoNodes: 'cleanedNoNodes',
	cleanedNoNodesLayouted: 'cleanedNoNodesLayouted',
} as const;

export type GraphVariant = (typeof GraphVariant)[keyof typeof GraphVariant];

export type AsyncGraphVariantGenerators = Record<GraphVariant, (graph: EffectorGraph) => Promise<EffectorGraph>>;

const sortGraphNodes = (graph: EffectorGraph): EffectorGraph => {
	return {
		nodes: sortNodes(graph.nodes),
		edges: graph.edges,
	};
};

function jsonStringifyRecursive(obj) {
	const cache = new Set();
	return JSON.stringify(
		obj,
		(key, value) => {
			if (typeof value === 'object' && value !== null) {
				if (cache.has(value)) {
					// Circular reference found, discard key
					return;
				}
				// Store value in our collection
				cache.add(value);
			}
			return value;
		},
		4,
	);
}

async function digest(value: string) {
	const encoder = new TextEncoder();
	const data = encoder.encode(value);
	const hash = await window.crypto.subtle.digest('SHA-256', data);
	return hash;
}

export function memoize<T extends (...args: any[]) => any>(fn: T): T {
	const cache = new WeakMap();
	return ((...args: any[]) => {
		const key = digest(jsonStringifyRecursive(args));
		if (!cache.has(key)) {
			cache.set(key, fn(...args));
		}
		return cache.get(key);
	}) as T;
}

export function makeGraphVariants(
	edgesCleaner: GraphCleaner,
	nodesCleaner: GraphCleaner,
	layouterFactory: () => Layouter,
): AsyncGraphVariantGenerators {
	const raw = (graph: EffectorGraph) => layoutGraph(graph, layouterFactory);
	const cleaned = async (graph: EffectorGraph) => edgesCleaner(await raw(graph));
	const cleanedNoNodes = async (graph: EffectorGraph) => nodesCleaner(await cleaned(graph));
	const cleanedNoNodesLayouted = async (graph: EffectorGraph) =>
		sortGraphNodes(await layoutGraph(await cleanedNoNodes(graph), layouterFactory));
	return {
		raw,
		cleaned,
		cleanedNoNodes,
		cleanedNoNodesLayouted,
	};
}
