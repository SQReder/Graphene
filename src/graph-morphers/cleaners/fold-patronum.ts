import { isRegularNode } from '../../lib';
import { foldByShape } from './foldByShape';

const nameSelector = (name: string) => (node) => {
	if (!isRegularNode(node)) return false;
	const factoryMeta = node.data.effector.meta.asFactory;
	if (!factoryMeta) return false;
	return factoryMeta.method === name;
};

export const foldReadonly = foldByShape('readonly', nameSelector('readonly'));
export const foldDebounce = foldByShape('debounce', nameSelector('debounce'));
export const foldCombineEvents = foldByShape('combineEvents', nameSelector('combineEvents'));
