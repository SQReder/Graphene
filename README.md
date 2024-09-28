## Roadmap

- [x] Clear reverse ownership of sample nodes
- [x] Separate edge processing by type
- [x] Show/hide edge type in the same graph
- [x] Colors for effect event's edges
- [ ] Tree for files filtering
- [ ] Fold Samples
- [ ] Don't use factory ownership for layouting
  - [ ] Add related node accessor into edge
- [ ] Assign correct parent for service nodes (merge, combine, etc.)
- [x] When fold combine node - inherit title from incoming edge
- [ ] Make separate effect's output handles
- [ ] Fold entities, wrapped in withRegion (may help to hide library code)
- [ ] If node have too many links - make shadow clone for each link to ease layouting

## Edge types

- Ownership - links of ownership from domain or factory
- Reactive - reactive data flow
- Source - sourced nodes (duplicates reactive and source of sample or attached effect)

### Graph cleanup process

1) Clear reverse ownership of sample nodes
2) Clean Source links from ownership of factories and domains 
