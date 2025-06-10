# Codebase Cleanup Checklist

- [ ] Remove all unused files and legacy directories (e.g., old agent/service/utility files)
- [ ] Ensure all utility imports go through `src/utils/index.js`
- [ ] Remove any commented-out or dead code
- [ ] Standardize error handling and logging throughout the codebase
- [ ] Ensure all cache usage is via the shared CacheManager
- [ ] Ensure all JSON parsing/serialization is via shared utils
- [ ] Ensure all memoization is via the shared memoize utility
- [ ] Update all documentation to match the current architecture
- [ ] Add or update tests for all shared utilities
- [ ] Run Prettier and ESLint across the codebase for consistency
- [ ] Audit all agent/service files for legacy patterns or direct utility code
- [ ] Remove any duplicate or legacy performance optimization code
