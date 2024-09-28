import type { MyEdge } from '../../types';

export function getKey(edge: MyEdge): string {
	return `${edge.source},${edge.target}`;
}
