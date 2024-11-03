import type { Edge, Node } from '@xyflow/react';
import type { Effect, Unit } from 'effector';
import type { Declaration, Region } from 'effector/inspect';
import { ensureDefined } from './lib';

export const NodeFamily = {
	Crosslink: 'crosslink',
	Regular: 'regular',
	Declaration: 'declaration',
	Domain: 'domain',
} as const;
export type NodeFamily = (typeof NodeFamily)[keyof typeof NodeFamily];

interface Family {
	readonly type: NodeFamily;
	readonly links: Graphite[];
	readonly owners: Graphite[];
}

export const OpTypeWithCycles = {
	Map: 'map',
	On: 'on',
	Sample: 'sample',
	FilterMap: 'filterMap',
	Combine: 'combine',
	Merge: 'merge',
	Prepend: 'prepend',
	Empty: undefined,
} as const;

export type OpTypeWithCycles = (typeof OpTypeWithCycles)[keyof typeof OpTypeWithCycles];

export const OpType = {
	...OpTypeWithCycles,
	Watch: 'watch',
	Store: 'store',
	Event: 'event',
	Effect: 'effect',
	Domain: 'domain',
	Filter: 'filter',
	Split: 'split',
} as const;

export type OpType = (typeof OpType)[keyof typeof OpType];

export const MetaType = {
	Factory: 'factory',
	Domain: 'domain',
} as const;

export type MetaType = (typeof MetaType)[keyof typeof MetaType];

export type EmptyMeta = {
	op:
		| typeof OpType.Watch
		| typeof OpType.On
		| typeof OpType.Map
		| typeof OpType.FilterMap
		| typeof OpType.Combine
		| typeof OpType.Merge
		| typeof OpType.Prepend
		| typeof OpType.Filter
		| typeof OpType.Split;
};

export type SampleMeta = {
	joint: number;
	op: typeof OpType.Sample;
	loc?: Location;
};

export type DomainMeta = BaseUnitMeta<typeof OpType.Domain>;

type MetaConfig = {
	loc?: Location;
};

export type BaseUnitMeta<T extends OpType> = {
	op: T;
	name: string;
	derived: number;
	config: MetaConfig;
};

export type EventMeta = BaseUnitMeta<typeof OpType.Event>;

export type StoreMeta = BaseUnitMeta<typeof OpType.Store> & {
	op: typeof OpType.Store;
	isCombine: boolean;
};

export type EffectMeta = BaseUnitMeta<typeof OpType.Effect> & {
	op: typeof OpType.Effect;
	name: string;
	attached: number;
};

export type CombineMeta = BaseUnitMeta<typeof OpType.Combine>;

export type UnitMeta = StoreMeta | EventMeta | EffectMeta | DomainMeta;

type NoOpMeta = {
	op: undefined;
	type: typeof MetaType.Factory | typeof MetaType.Domain;
	name: string;
	method: string;
	loc?: Location;
};

export type Meta = EmptyMeta | UnitMeta | SampleMeta | NoOpMeta;

export interface Graphite {
	readonly id: string;
	readonly family: Family;
	readonly meta: Meta;
	readonly next: Graphite[];
	readonly scope: {
		readonly handler: (...args: unknown[]) => unknown | Effect<unknown, unknown, unknown>;
		readonly runner: {
			readonly scope: {
				readonly handler: Effect<unknown, unknown, unknown> | (() => unknown);
			};
		};

		readonly fn: (...args: unknown[]) => unknown;
		readonly key?: string;
	};
}

export const EdgeType = {
	Reactive: 'reactive',
	Source: 'source',
	ParentToChild: 'parent-to-child',
	FactoryOwnership: 'factory-ownership',
	Unknown: 'unknown',
} as const;

export type EdgeType = (typeof EdgeType)[keyof typeof EdgeType];

type BaseEdgeData = {
	synthetic?: boolean;
	relatedNodes: {
		source: EffectorNode;
		target: EffectorNode;
		collapsed?: EffectorNode[];
	};
};
type MyCoolEdgeData<T extends EdgeType> = { edgeType: T } & BaseEdgeData;

export interface BaseEdge<T extends EdgeType> extends Edge {
	data: MyCoolEdgeData<T>;
}

export type ReactiveEdge = BaseEdge<typeof EdgeType.Reactive> & {
	animated: true;
};
export type SourceEdge = BaseEdge<typeof EdgeType.Source>;
export type ParentToChildEdge = BaseEdge<typeof EdgeType.ParentToChild>;
export type UnknownEdge = BaseEdge<typeof EdgeType.Unknown>;
export type FactoryOwnershipEdge = BaseEdge<typeof EdgeType.FactoryOwnership>;

export type MyEdge = ReactiveEdge | SourceEdge | ParentToChildEdge | FactoryOwnershipEdge | UnknownEdge;

export interface Graph<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
	nodes: NodeType[];
	edges: EdgeType[];
}

export class EffectorNodeDetails {
	get graphite(): Graphite {
		return this._graphite;
	}

	get unit(): Unit<unknown> | undefined {
		return this._unit;
	}

	private readonly _graphite: Graphite;
	private readonly _unit: Unit<unknown> | undefined;

	constructor(graphite: Graphite, unit: Unit<unknown> | undefined) {
		this._graphite = graphite;
		this._unit = unit;
	}

	get type(): typeof NodeFamily.Regular | typeof NodeFamily.Crosslink | typeof NodeFamily.Domain {
		const type = this._graphite.family.type;

		if (type === NodeFamily.Declaration) {
			throw new RangeError('Unexpected declaration type');
		}

		return type;
	}

	private _syntheticLocation?: string;

	set syntheticLocation(loc: string) {
		this._syntheticLocation = loc;
	}

	get loc(): string | undefined {
		return this._syntheticLocation ?? this.meta.loc;
	}

	get meta(): MetaHelper {
		return new MetaHelper(this.graphite.meta);
	}

	get isFactory(): boolean {
		return this.meta.isFactory;
	}

	get name(): string | undefined {
		return this.meta.name;
	}

	get isDerived(): boolean {
		return Boolean(this.meta.isDerived);
	}

	get isCombinedStore(): boolean {
		return !!this.meta.asStore?.isCombine;
	}

	get isInteractive(): boolean {
		return this._unit != null;
	}

	private _isMergeEvent = false;

	get isMergeEvent(): boolean {
		return this._isMergeEvent;
	}

	set isMergeEvent(value: boolean) {
		if (!this.meta.isEvent) {
			throw new Error('isMergeEvent can be set only for events');
		}
		this._isMergeEvent = value;
	}

	// get isMergeEvent(): boolean {
	// 	return this.isMergeEvent;
	//
	// 	// const notFactoryOrDomain = this._graphite.family.owners.filter(
	// 	// 	(owner) => owner.meta.op !== undefined && owner.meta.op !== OpType.Domain,
	// 	// );
	// 	//
	// 	// if (notFactoryOrDomain.length !== 1) return false;
	// 	//
	// 	// const owner = notFactoryOrDomain[0];
	// 	//
	// 	// if (!owner) return false;
	// 	//
	// 	// return owner.meta && owner.meta.op === OpType.Merge;
	// }
}

export function formatLocation(loc: Location | undefined): string | undefined {
	return loc ? `${loc.file}:${loc.line}:${loc.column}` : undefined;
}

export function hasOpType<T extends OpType>(meta: Meta, opType: T): meta is Meta & { op: T } {
	return this._meta.op === opType;
}

export function assertOpType<T extends OpType>(meta: Meta, opType: T): asserts meta is Meta & { op: T } {
	if (this._meta.op !== opType) {
		throw new Error('Assertion failed');
	}
}

export class MetaHelper {
	get value(): Meta {
		return this._meta;
	}

	private _meta: Meta;

	constructor(meta: Meta) {
		this._meta = meta;
	}

	get op(): OpType | undefined {
		return this._meta.op;
	}

	hasOpType<T extends OpType>(opType: T): this is MetaHelper & { op: T } {
		return this._meta.op === opType;
	}

	get isStore(): boolean {
		return this.hasOpType(OpType.Store);
	}

	get asStore(): StoreMeta | undefined {
		return this.isStore ? (this._meta as StoreMeta) : undefined;
	}

	get isFactory(): boolean {
		return this._meta.op === undefined && this._meta.type === MetaType.Factory;
	}

	get asFactory(): NoOpMeta | undefined {
		return this.isFactory ? (this._meta as NoOpMeta) : undefined;
	}

	get isEvent(): boolean {
		return this.hasOpType(OpType.Event);
	}

	get asEvent(): EventMeta | undefined {
		return this.isEvent ? (this._meta as EventMeta) : undefined;
	}

	get isDomain(): boolean {
		return this.hasOpType(OpType.Domain);
	}

	get asDomain(): DomainMeta | undefined {
		return this.isDomain ? (this._meta as DomainMeta) : undefined;
	}

	get isUnit(): boolean {
		return this.hasOpType(OpType.Store) || this.hasOpType(OpType.Event) || this.hasOpType(OpType.Effect);
	}

	get asUnit(): UnitMeta | undefined {
		return this.isUnit ? (this._meta as UnitMeta) : undefined;
	}

	get isSample(): boolean {
		return this.hasOpType(OpType.Sample);
	}

	get asSample(): SampleMeta | undefined {
		return this.isSample ? (this._meta as SampleMeta) : undefined;
	}

	get isEffect(): boolean {
		return this.hasOpType(OpType.Effect);
	}

	get asEffect(): EffectMeta | undefined {
		return this.isEffect ? (this._meta as EffectMeta) : undefined;
	}

	get isDerived(): boolean {
		if (this.isStore || this.isEvent || this.isDomain) {
			return !!(this._meta as UnitMeta).derived;
		} else {
			return false;
		}
	}

	get isCombinedStore(): boolean {
		return Boolean(this.asStore?.isCombine);
	}

	get name(): string | undefined {
		if (this.isStore) {
			const storeMeta = ensureDefined(this.asStore);
			if (storeMeta.isCombine && storeMeta.name.startsWith('combine($')) return 'combined';
			else return storeMeta.name;
		} else if (this.isEvent || this.isDomain || this.isEffect) {
			const name = (this._meta as UnitMeta).name as NonNullable<unknown>;
			if (typeof name !== 'string') {
				console.warn(`Unexpected non-string name:`, name, this);
				return String(name);
			}
			return name;
		} else if (this.isSample) {
			return this.asSample?.joint ? 'joint sample' : 'sample';
		} else {
			if (this._meta.op === undefined) {
				return `${this._meta.method}(${this._meta.name})`;
			}
			return undefined;
		}
	}

	get loc(): string | undefined {
		// loc present in unit, factory, or sample
		if (!this.isUnit && !this.isFactory && !this.isSample) return undefined;
		let loc: Location | undefined;
		if (this.isUnit) {
			loc = (this._meta as UnitMeta).config?.loc;
		} else if (this.isFactory) {
			loc = (this._meta as NoOpMeta).loc;
		} else if (this.isSample) {
			loc = (this._meta as SampleMeta).loc;
		}
		return loc ? formatLocation(loc) : undefined;
	}
}

export class EffectorDeclarationDetails {
	get declaration(): Declaration {
		return this._declaration;
	}

	private readonly _declaration: Declaration;

	constructor(declaration: Declaration) {
		this._declaration = declaration;
	}

	get type(): 'unit' | 'factory' | 'region' {
		return this._declaration.type;
	}

	get meta(): Record<string, unknown> {
		return this._declaration.meta;
	}

	get parentId(): string | undefined {
		return getRegionId(this._declaration.region);
	}
}

function getRegionId(region: Region | undefined): string | undefined {
	return region && 'id' in region && typeof region.id === 'string' ? region.id : undefined;
}

type BaseNode<T> = {
	id: string;
	nodeType: T;
	synthetic?: boolean;
	folded?: boolean;
	shadowClone?: true;
	label?: string;
	noLoc?: boolean;
};

export type RegularEffectorDetails = BaseNode<
	typeof NodeFamily.Regular | typeof NodeFamily.Crosslink | typeof NodeFamily.Domain
> & {
	effector: EffectorNodeDetails;
	declaration?: EffectorDeclarationDetails;
};

export const CombinatorType = {
	Combine: 'combine',
} as const;
export type CombinatorType = (typeof CombinatorType)[keyof typeof CombinatorType];

export type CombinedNodeDetails = BaseNode<typeof CombinatorType.Combine> & {
	effector?: undefined;
	declaration?: undefined;

	relatedNodes: EffectorNode[];
};

export const SyntheticNodeTypes = {
	Gate: 'gate',
};
export type SyntheticNodeType = (typeof SyntheticNodeTypes)[keyof typeof SyntheticNodeTypes];

export type GateNodeDetails = BaseNode<typeof SyntheticNodeTypes.Gate> & {
	effector?: undefined;
	declaration?: undefined;
	relatedNodes: EffectorNode[];
	gateName: string;
};

export type DeclarationEffectorDetails = BaseNode<typeof NodeFamily.Declaration> & {
	effector?: undefined;
	declaration: EffectorDeclarationDetails;
};

export type RegularEffectorNode = Node<RegularEffectorDetails>;
export type DeclarationEffectorNode = Node<DeclarationEffectorDetails>;
export type CombinedNode = Node<CombinedNodeDetails>;
export type GateNode = Node<GateNodeDetails>;

export type EffectorNode = RegularEffectorNode | DeclarationEffectorNode | CombinedNode | GateNode;
export type EffectorGraph = Graph<EffectorNode, MyEdge>;

export type Location = {
	file: string;
	line: number;
	column: number;
};
