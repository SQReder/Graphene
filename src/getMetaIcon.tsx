import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type ReactNode } from 'react';
import { absurd } from './lib';
import { MetaType, OpType } from './types';

export const getMetaIcon = (meta: { op: OpType | undefined; type?: MetaType; attached?: number }): ReactNode => {
	switch (meta.op) {
		case OpType.Watch:
			return '👓';
		case OpType.On:
			return '🔛';
		case OpType.Map:
			return '➡️';
		case OpType.FilterMap:
			return '📝';
		case OpType.Combine:
			return '⊕';
		case OpType.Store:
			return '📦';
		case OpType.Event:
			return '🔔';
		case OpType.Sample:
			return '🔁';
		case OpType.Effect:
			return meta.attached ? '⚡️~⚡️' : '⚡️';
		case OpType.Merge:
			return '🔀';
		case OpType.Domain:
			return '🌐';
		case OpType.Filter:
			return <FontAwesomeIcon icon="filter" />;
		case OpType.Prepend:
			return <FontAwesomeIcon icon="arrow-up" />;
		case OpType.Split:
			return '↕';
		default:
			if (meta.op === undefined) {
				switch (meta.type) {
					case MetaType.Factory:
						return '🏭';
					case MetaType.Domain:
						return '🌐';
					case undefined:
						return '❓';
					default:
						absurd(meta.type);
				}
			} else {
				absurd(meta.op);
			}
	}
};
