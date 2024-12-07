import { ensureDefined, isRegularNode } from '../../lib';
import {
	type EffectorNode,
	type FileNode,
	type FileNodeDetails,
	type RegularEffectorNode,
	type SourceLocation,
	SyntheticNodeTypes,
} from '../../types';
import type { NamedGraphVisitor } from '../types';

function tryFindLoc(node: RegularEffectorNode): SourceLocation | undefined {
	const metaLoc = node.data.effector.meta.loc;

	if (metaLoc) return metaLoc;

	const region = node.data.declaration?.declaration?.region;
	const declarationRegionLoc = region && 'loc' in region && region.loc;

	if (declarationRegionLoc) return declarationRegionLoc;

	const factoryLoc = node.data.effector.graphite.family.owners
		.map((owner) => owner.meta)
		.filter((meta) => meta.op === undefined)
		.find((meta) => meta.loc != null)?.loc;

	return factoryLoc;
}

type FileInfo = {
	partition: number;
	loc: SourceLocation;
	relatedNodes: Set<EffectorNode>;
};

export const locEnricher: NamedGraphVisitor = {
	name: 'Loc Enricher',
	visit: async (graph) => {
		const knownFiles = new Map<string, FileInfo>();

		for (const node of graph.nodes) {
			if (!isRegularNode(node)) continue;

			const loc = tryFindLoc(node);

			let fileInfo: FileInfo | undefined = undefined;

			console.log('Node:', node);
			console.log('Loc:', loc);

			if (loc) {
				if (knownFiles.has(loc.file)) {
					fileInfo = ensureDefined(knownFiles.get(loc.file));
					fileInfo.relatedNodes.add(node);
					console.log('File already exists:', fileInfo);
				} else {
					fileInfo = { partition: knownFiles.size + 1, relatedNodes: new Set([node]), loc };
					knownFiles.set(loc.file, fileInfo);
					console.log('New file created:', fileInfo);
				}
			}

			if (!node.data.effector.loc && loc) {
				node.data.effector.syntheticLocation = loc;
			}

			if (fileInfo && loc) {
				node['layoutOptions'] = {
					...(node['layoutOptions'] ?? {}),
					'org.eclipse.elk.partitioning.partition': fileInfo.partition,
				};
				// const id = `file_${fileInfo.partition}`;
				// node.parentId = id;
				console.log('Set partition', fileInfo.partition, 'to node', node);
			}

			node.data.noLoc = !loc;
			console.log('Node data:', node.data);
		}

		console.log('Known files:', knownFiles);

		for (const { partition, loc } of knownFiles.values()) {
			const id = `file_${partition}`;

			graph.addNode({
				id: id,
				type: SyntheticNodeTypes.File,
				data: {
					id: id,
					nodeType: SyntheticNodeTypes.File,
					label: loc.file,
					effector: undefined,
					declaration: undefined,
					fileName: loc.file,
					relatedNodes: [],
				} satisfies FileNodeDetails,
				position: { x: 0, y: 0 },
				style: {
					background: 'rgba(255,255,255,.75)',
				},
			} satisfies FileNode);
		}
	},
};
