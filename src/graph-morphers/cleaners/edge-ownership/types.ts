import type { OwnershipEdge } from '../../../types';
import type { EdgeCleaner, NamedCleaner } from '../types';

export type NamedOwnershipEdgeCleaner = NamedCleaner<OwnershipEdgeCleaner>;
export type OwnershipEdgeCleaner = EdgeCleaner<OwnershipEdge>;
