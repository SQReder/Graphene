import { ensureDefined } from './ensureDefined';
import { MetaType } from './MetaType';
import { OpType } from './OpType';
import type {
	DomainMeta,
	EffectMeta,
	EventMeta,
	Meta,
	NoOpMeta,
	SampleMeta,
	SourceLocation,
	StoreMeta,
	UnitMeta,
} from './types';

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

	get loc(): SourceLocation | undefined {
		// loc present in unit, factory, or sample
		if (!this.isUnit && !this.isFactory && !this.isSample) return undefined;
		let loc: SourceLocation | undefined;
		if (this.isUnit) {
			loc = (this._meta as UnitMeta).config?.loc;
		} else if (this.isFactory) {
			loc = (this._meta as NoOpMeta).loc;
		} else if (this.isSample) {
			loc = (this._meta as SampleMeta).loc;
		}
		return loc;
	}
}
