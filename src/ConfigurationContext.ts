import { createContext, useContext } from 'react';

export type ConfigurationContextType = {
	layoutDirection: 'horizontal' | 'vertical';
	showNodeIds: boolean;
	unfoldedFactories: Set<string>;
	toggleFactoryNode: (factoryId: string) => void;
};

export const ConfigurationContext = createContext<ConfigurationContextType>({
	layoutDirection: 'vertical',
	showNodeIds: true,
	toggleFactoryNode: () => void 0,
	unfoldedFactories: new Set(),
});

export const useLayouterContext = (): ConfigurationContextType => {
	const ctx = useContext(ConfigurationContext);
	if (!ctx) {
		throw new Error('useLayouter must be used within a LayouterProvider');
	}
	return ctx;
};
