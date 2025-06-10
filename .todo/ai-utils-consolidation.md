# AI Utilities Consolidation Checklist

- [ ] Remove any duplicate CacheManager implementations (keep only one in `src/utils/cacheManager.js`)
- [ ] Remove any duplicate JSON utility functions (keep only one in `src/utils/jsonUtils.js`)
- [ ] Remove any duplicate memoize or performance utilities (keep only one in `src/utils/performanceOptimizer.js`)
- [ ] Ensure all agents and services import cache, JSON, and memoize utilities from the shared location
- [ ] Remove any old or unused cache/JSON/memoize utility files from `src/echo-ai/utils/` or elsewhere
- [ ] Update all imports in the codebase to use the shared utility exports from `src/utils/index.js`
- [ ] Remove any agent-specific or service-specific cache logic that duplicates the shared CacheManager
- [ ] Remove any agent-specific or service-specific JSON parsing logic that duplicates the shared JSON utils
- [ ] Remove any agent-specific or service-specific memoization logic that duplicates the shared memoize
- [ ] Ensure only one error handler utility exists and is used everywhere
- [ ] Remove any legacy or unused error handling code
- [ ] Add/Update documentation to reflect the new utility structure
- [ ] Audit all utility exports in `src/utils/index.js` for completeness and redundancy
