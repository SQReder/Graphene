import type { Edge, Node } from '@xyflow/react';
import type { Effect, Unit } from 'effector';
import type { EdgeType } from './EdgeType';
import type { EffectorDeclarationDetails } from './EffectorDeclarationDetails';
import { MetaHelper } from './MetaHelper';
import type { MetaType } from './MetaType';
import type { OpType } from './OpType';

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
	loc?: SourceLocation;
};

export type DomainMeta = BaseUnitMeta<typeof OpType.Domain>;

type MetaConfig = {
	loc?: SourceLocation;
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

export type NoOpMeta = {
	op: undefined;
	type: typeof MetaType.Factory | typeof MetaType.Domain;
	name: string;
	method: string;
	loc?: SourceLocation;
};

export type Meta = EmptyMeta | UnitMeta | SampleMeta | NoOpMeta;

export interface Graphite {
	readonly id: string;
	readonly family: Family;
	readonly meta: Meta;
	readonly next: Graphite[];
	readonly scope?: {
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

	private _syntheticLocation?: SourceLocation;

	set syntheticLocation(loc: SourceLocation) {
		this._syntheticLocation = loc;
	}

	get loc(): SourceLocation | undefined {
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
export function formatLocation(loc: undefined): undefined;
export function formatLocation(loc: SourceLocation): string;
export function formatLocation(loc: SourceLocation | undefined): string | undefined;
export function formatLocation(loc: SourceLocation | undefined): string | undefined {
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
	File: 'file',
};
export type SyntheticNodeType = (typeof SyntheticNodeTypes)[keyof typeof SyntheticNodeTypes];

export type GateNodeDetails = BaseNode<typeof SyntheticNodeTypes.Gate> & {
	effector?: undefined;
	declaration?: undefined;
	relatedNodes: EffectorNode[];
	gateName: string;
};

export type FileNodeDetails = BaseNode<typeof SyntheticNodeTypes.File> & {
	effector?: undefined;
	declaration?: undefined;
	fileName: string;
	relatedNodes: EffectorNode[];
};

export type DeclarationEffectorDetails = BaseNode<typeof NodeFamily.Declaration> & {
	effector?: undefined;
	declaration: EffectorDeclarationDetails;
};

export type RegularEffectorNode = Node<RegularEffectorDetails>;
export type DeclarationEffectorNode = Node<DeclarationEffectorDetails>;
export type CombinedNode = Node<CombinedNodeDetails>;
export type GateNode = Node<GateNodeDetails>;
export type FileNode = Node<FileNodeDetails>;

export type SyntheticNodes = GateNode | FileNode;
export type EffectorNode = RegularEffectorNode | DeclarationEffectorNode | CombinedNode | SyntheticNodes;
export type EffectorGraph = Graph<EffectorNode, MyEdge>;

export type SourceLocation = {
	file: string;
	line: number;
	column: number;
};
