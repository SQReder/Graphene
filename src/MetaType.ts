export const MetaType = {
	Factory: 'factory',
	Domain: 'domain',
} as const;

export type MetaType = (typeof MetaType)[keyof typeof MetaType];
