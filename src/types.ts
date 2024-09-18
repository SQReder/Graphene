import type { Edge, Node } from '@xyflow/react';
import type { Effect } from 'effector';
import type { Declaration, Region } from 'effector/inspect';

export const NodeFamily = {
	Crosslink: 'crosslink',
	Regular: 'regular',
	Declaration: 'declaration',
	Domain: 'domain',
} as const;
export type NodeFamily = (typeof NodeFamily)[keyof typeof NodeFamily];

interface Family {
	type: NodeFamily;
	links: Graphite[];
	owners: Graphite[];
}

export const OpType = {
	Watch: 'watch',
	Store: 'store',
	Event: 'event',
	Map: 'map',
	On: 'on',
	Sample: 'sample',
	FilterMap: 'filterMap',
	Effect: 'effect',
	Combine: 'combine',
	Merge: 'merge',
	Domain: 'domain',
} as const;

export type OpType = (typeof OpType)[keyof typeof OpType];

export const MetaType = {
	Factory: 'factory',
	Domain: 'domain',
} as const;

type MetaType = (typeof MetaType)[keyof typeof MetaType];

export type EmptyMeta = {
	op:
		| typeof OpType.Watch
		| typeof OpType.On
		| typeof OpType.Map
		| typeof OpType.FilterMap
		| typeof OpType.Combine
		| typeof OpType.Merge;
};

export type SampleMeta = {
	joint: number;
	op: typeof OpType.Sample;
};

export type DomainMeta = BaseUnitMeta<typeof OpType.Domain>;

export type BaseUnitMeta<T extends OpType> = {
	op: T;
	name: string;
	derived: number;
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

type FactoryMeta = {
	op: undefined;
	type: typeof MetaType.Factory | typeof MetaType.Domain;
	name: string;
	method: string;
};

export type Meta = EmptyMeta | UnitMeta | SampleMeta | FactoryMeta;

export interface Graphite {
	id: string;
	family: Family;
	meta: Meta;
	next: Graphite[];
	scope: {
		handler: (...args: unknown[]) => unknown | Effect<unknown, unknown, unknown>;
		fn: (...args: unknown[]) => unknown;
	};
}

export const EdgeType = {
	Reactive: 'reactive',
	Ownership: 'ownership',
	Link: 'link',
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
export type OwnershipEdge = BaseEdge<typeof EdgeType.Ownership>;
export type LinkEdge = BaseEdge<typeof EdgeType.Link>;
export type UnknownEdge = BaseEdge<typeof EdgeType.Unknown>;

export type MyEdge = ReactiveEdge | OwnershipEdge | LinkEdge | UnknownEdge;

export interface Graph<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
	nodes: NodeType[];
	edges: EdgeType[];
}

export class EffectorNodeDetails {
	get graphite(): Graphite {
		return this._graphite;
	}

	private readonly _graphite: Graphite;

	constructor(graphite: Graphite) {
		this._graphite = graphite;
	}

	get type(): typeof NodeFamily.Regular | typeof NodeFamily.Crosslink | typeof NodeFamily.Domain {
		const type = this._graphite.family.type;

		if (type === NodeFamily.Declaration) {
			throw new RangeError('Unexpected declaration type');
		}

		return type;
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
}

class MetaHelper {
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

	hasOpType(opType: OpType | undefined): boolean {
		return this._meta.op === opType;
	}

	get isStore(): boolean {
		return this._meta.op === OpType.Store;
	}

	get isDomain(): boolean {
		return this._meta.op === OpType.Domain;
	}

	get asStore(): StoreMeta | undefined {
		return this._meta.op === OpType.Store ? this._meta : undefined;
	}

	get asFactory(): FactoryMeta | undefined {
		return this._meta.op === undefined && this._meta.type === MetaType.Factory ? this._meta : undefined;
	}

	get asSample(): SampleMeta | undefined {
		return this._meta.op === OpType.Sample ? this._meta : undefined;
	}

	get asEvent(): EventMeta | undefined {
		return this._meta.op === OpType.Event ? this._meta : undefined;
	}

	get asDomain(): DomainMeta | undefined {
		return this._meta.op === OpType.Domain ? this._meta : undefined;
	}

	get isDerived(): boolean {
		if (this._meta.op === OpType.Store || this._meta.op === OpType.Event) {
			return !!this._meta.derived;
		} else {
			return false;
		}
	}

	get name(): string | undefined {
		if (this._meta.op === OpType.Store || this._meta.op === OpType.Event || this._meta.op === OpType.Effect) {
			return this._meta.name;
		} else if (this._meta.op === OpType.Sample) {
			console.trace();
			return this._meta.joint ? 'joint sample' : 'sample';
		} else {
			if (this._meta.op === undefined) {
				this._meta.type;
			}
			return undefined;
		}
	}

	get isFactory(): boolean {
		return this._meta.op === undefined && this._meta.type === MetaType.Factory;
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
	if (!region) return;

	if ('id' in region && typeof region.id === 'string') {
		return region.id;
	}
}

export type RegularEffectorDetails = {
	label?: string;
	nodeType: typeof NodeFamily.Regular | typeof NodeFamily.Crosslink | typeof NodeFamily.Domain;
	effector: EffectorNodeDetails;
	declaration?: EffectorDeclarationDetails;
};

export const CombinatorType = {
	Combine: 'combine',
} as const;

export type CombinatorType = (typeof CombinatorType)[keyof typeof CombinatorType];

export type CombinedNodeDetails = {
	nodeType: typeof CombinatorType.Combine;
	relatedNodes: EffectorNode[];
	label?: string;
};

export type DeclarationEffectorDetails = {
	label?: string;
	nodeType: typeof NodeFamily.Declaration;
	declaration: EffectorDeclarationDetails;
};

export type RegularEffectorNode = Node<RegularEffectorDetails>;
export type DeclarationEffectorNode = Node<DeclarationEffectorDetails>;
export type CombinedNode = Node<CombinedNodeDetails>;

export type EffectorNode = RegularEffectorNode | DeclarationEffectorNode | CombinedNode;
export type EffectorGraph = Graph<EffectorNode, MyEdge>;
