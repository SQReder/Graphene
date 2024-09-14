import { EdgeType, EffectorNode, MyEdge, OwnershipEdge, ReactiveEdge } from './types';

type EdgeFactory<T extends MyEdge> = (params: {
	id: string;
	source: EffectorNode;
	target: EffectorNode;
	extras?: (edge: T) => T;
}) => T;

export const createReactiveEdge: EdgeFactory<ReactiveEdge> = ({ id, source, target, extras = (x) => x }) =>
	extras({
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
		},
	} satisfies ReactiveEdge);

export const createOwnershipEdge: EdgeFactory<OwnershipEdge> = ({ id, source, target, extras = (x) => x }) =>
	extras({
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
			stroke: 'rgba(132,215,253,0.7)',
		},
	} satisfies OwnershipEdge);
