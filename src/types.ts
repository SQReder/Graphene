import { Edge, Node } from '@xyflow/react';
import { Effect } from 'effector';
import { Declaration } from 'effector/inspect';

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

export type UnitMeta = {
	op: typeof OpType.Store | typeof OpType.Event | typeof OpType.Domain;
	name: string;
	derived: boolean;
};

export type EffectMeta = {
	op: typeof OpType.Effect;
	name: string;
	attached: number;
};

type FactoryMeta = {
	op: undefined;
	type: typeof MetaType.Factory | typeof MetaType.Domain;
	name: string;
	method: string;
};

export type Meta = EmptyMeta | UnitMeta | EffectMeta | SampleMeta | FactoryMeta;

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

	get meta(): Meta {
		return this._graphite.meta;
	}

	get isFactory(): boolean {
		return this.meta.op === undefined && this.meta.type === MetaType.Factory;
	}

	public hasOpType(opType: OpType): this is this & { meta: { op: OpType } } {
		return this.meta.op === opType;
	}

	get name(): string | undefined {
		if (this.meta.op === OpType.Store || this.meta.op === OpType.Event || this.meta.op === OpType.Effect) {
			return this.meta.name;
		} else if (this.meta.op === OpType.Sample) {
			console.trace();
			return this.meta.joint ? 'joint sample' : 'sample';
		} else {
			if (this.meta.op === undefined) {
				this.meta.type;
			}
			return undefined;
		}
	}

	get isDerived(): boolean {
		if (this.meta.op === OpType.Store || this.meta.op === OpType.Event) {
			return this.meta.derived;
		} else {
			return false;
		}
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
}

export type RegularEffectorDetails = {
	label?: string;
	nodeType: typeof NodeFamily.Regular | typeof NodeFamily.Crosslink | typeof NodeFamily.Domain;
	effector: EffectorNodeDetails;
};

export type DeclarationEffectorDetails = {
	label?: string;
	nodeType: typeof NodeFamily.Declaration;
	declaration: EffectorDeclarationDetails;
};

export type RegularEffectorNode = Node<RegularEffectorDetails>;
export type DeclarationEffectorNode = Node<DeclarationEffectorDetails>;

export type EffectorNode = RegularEffectorNode | DeclarationEffectorNode;
export type EffectorGraph = Graph<EffectorNode, MyEdge>;
