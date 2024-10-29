import type { BufferedGraph } from '../graph-manager';

export type NamedGraphVisitor = {
	name: string;
	visit: (graph: BufferedGraph) => Promise<void>;
	order?: number;
};
