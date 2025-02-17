import type { Declaration, Region } from 'effector/inspect';

export function getRegionId(region: Region | undefined): string | undefined {
	return region && 'id' in region && typeof region.id === 'string' ? region.id : undefined;
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
