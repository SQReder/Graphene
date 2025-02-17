export const EdgeType = {
	Reactive: 'reactive',
	Source: 'source',
	ParentToChild: 'parent-to-child',
	FactoryOwnership: 'factory-ownership',
	Unknown: 'unknown',
} as const;

export type EdgeType = (typeof EdgeType)[keyof typeof EdgeType];
