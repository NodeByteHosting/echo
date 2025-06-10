# Prompt System Migration Checklist

- [x] Ensure all prompt templates are in `src/echo-ai/prompts/` with `.echo` extension
- [x] Remove any hardcoded prompt strings from config files (e.g., `ai.config.js`)
- [x] Update all agents/services to use `promptService` for prompt selection and rendering
- [x] Remove any legacy prompt loading logic from agents/services
- [x] Update documentation to describe the new prompt system and template format
- [ ] Add tests for prompt rendering with various context objects
- [x] Remove any unused or legacy prompt files from old locations
- [x] Ensure promptService is the single source of truth for all prompt selection
