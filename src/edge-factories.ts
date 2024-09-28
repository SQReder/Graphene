import { MarkerType } from '@xyflow/system';
import type { EffectorNode, MyEdge, ParentToChildEdge, ReactiveEdge, SourceEdge } from './types';
import { EdgeType } from './types';

export type EdgeFactory<T extends MyEdge> = (params: {
	id: string;
	source: EffectorNode;
	target: EffectorNode;
	extras?: (edge: T) => void;
}) => T;

export const createReactiveEdge: EdgeFactory<ReactiveEdge> = ({ id, source, target, extras = (x) => x }) => {
	const color = '#505050';
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
		markerEnd: {
			type: MarkerType.ArrowClosed,
			color: color,
		},
		style: {
			zIndex: 10,
			stroke: color,
		},
	} satisfies ReactiveEdge;

	extras(result);

	return result;
};

export const createSourceEdge: EdgeFactory<SourceEdge> = ({ id, source, target, extras = (x) => x }) => {
	const result = {
		id: id,
		source: source.id,
		target: target.id,
		data: {
			edgeType: EdgeType.Source,
			relatedNodes: {
				source: source,
				target: target,
			},
		},
		markerEnd: {
			type: MarkerType.ArrowClosed,
			color: 'rgba(132,199,253,0.86)',
		},
		style: {
			stroke: 'rgba(132,199,253,0.86)',
		},
	} satisfies SourceEdge;

	extras(result);

	return result;
};

export const createLinkEdge: EdgeFactory<ParentToChildEdge> = ({ id, source, target, extras = (x) => x }) => {
	const result = {
		id: id,
		source: source.id,
		target: target.id,
		data: {
			edgeType: EdgeType.ParentToChild,
			relatedNodes: {
				source: source,
				target: target,
			},
		},
		markerStart: {
			type: MarkerType.ArrowClosed,
			color: 'rgba(198, 177, 250, 0.86)',
		},
		style: {
			stroke: 'rgba(198, 177, 250, 0.86)',
		},
	} satisfies ParentToChildEdge;

	extras(result);

	return result;
};
