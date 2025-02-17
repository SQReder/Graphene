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
