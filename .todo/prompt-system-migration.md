# Prompt System Migration Checklist

- [ ] Ensure all prompt templates are in `src/echo-ai/prompts/` with `.echo` extension
- [ ] Remove any hardcoded prompt strings from config files (e.g., `ai.config.js`)
- [ ] Update all agents/services to use `promptService` for prompt selection and rendering
- [ ] Remove any legacy prompt loading logic from agents/services
- [ ] Update documentation to describe the new prompt system and template format
- [ ] Add tests for prompt rendering with various context objects
- [ ] Remove any unused or legacy prompt files from old locations
- [ ] Ensure promptService is the single source of truth for all prompt selection
