# AI Utilities Consolidation Checklist

- [ ] Remove any duplicate CacheManager implementations (keep only one in `src/utils/cacheManager.js`)
- [ ] Remove any duplicate JSON utility functions (keep only one in `src/utils/jsonUtils.js`)
- [ ] Ensure all agents and services import cache and JSON utilities from the shared location
- [ ] Remove any old or unused cache/JSON utility files from `src/echo-ai/utils/` or elsewhere
- [ ] Update all imports in the codebase to use the shared utility exports from `src/utils/index.js`
- [ ] Remove any agent-specific or service-specific cache logic that duplicates the shared CacheManager
- [ ] Remove any agent-specific or service-specific JSON parsing logic that duplicates the shared JSON utils
- [ ] Ensure only one error handler utility exists and is used everywhere
- [ ] Remove any legacy or unused error handling code
- [ ] Add/Update documentation to reflect the new utility structure
