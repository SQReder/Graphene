import type { EffectorNode, MyEdge, OwnershipEdge, ReactiveEdge } from './types';
import { EdgeType } from './types';

type EdgeFactory<T extends MyEdge> = (params: {
	id: string;
	source: EffectorNode;
	target: EffectorNode;
	extras?: (edge: T) => void;
}) => T;

export const createReactiveEdge: EdgeFactory<ReactiveEdge> = ({ id, source, target, extras = (x) => x }) => {
	const result = {
		id: id,
		source: source.id,
		target: target.id,
		data: {
			edgeType: EdgeType.Reactive,
			relatedNodes: {
				source: source,
				target: target,
			},
		},
		animated: true,
		style: {
			zIndex: 10,
			stroke: '#303030',
		},
	} satisfies ReactiveEdge;

	extras(result);

	return result;
};

export const createOwnershipEdge: EdgeFactory<OwnershipEdge> = ({ id, source, target, extras = (x) => x }) => {
	const result = {
		id: id,
		source: source.id,
		target: target.id,
		data: {
			edgeType: EdgeType.Ownership,
			relatedNodes: {
				source: source,
				target: target,
			},
		},
		style: {
			stroke: 'rgba(132,199,253,0.86)',
		},
	} satisfies OwnershipEdge;

	extras(result);

	return result;
};
