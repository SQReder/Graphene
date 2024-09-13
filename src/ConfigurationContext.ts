import { createContext, useContext } from 'react';

type ConfigurationContextType = {
	layoutDirection: 'horizontal' | 'vertical';
	showNodeIds: boolean;
};
export const ConfigurationContext = createContext<ConfigurationContextType>({
	layoutDirection: 'vertical',
	showNodeIds: true,
});

export const useLayouterContext = (): ConfigurationContextType => {
	const ctx = useContext(ConfigurationContext);
	if (!ctx) {
		throw new Error('useLayouter must be used within a LayouterProvider');
	}
	return ctx;
};
