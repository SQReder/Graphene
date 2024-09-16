import type { ReactiveEdge } from '../../../types';
import type { EdgeCleaner } from '../types';
import { type NamedEdgeCleaner } from '../types';

export type NamedReactiveEdgeCleaner = NamedEdgeCleaner<ReactiveEdge>;
export type ReactiveEdgeCleaner = EdgeCleaner<ReactiveEdge>;
