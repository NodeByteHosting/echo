# Codebase Cleanup & Modernization Checklist

## General Cleanup

-   [x] Remove all unused files, legacy directories, and dead code across the project
-   [x] Audit all `src/` subdirectories for duplicate or obsolete modules
-   [x] Remove commented-out code and TODO comments that are no longer relevant
-   [x] Ensure all utility imports go through `src/utils/index.js`
-   [ ] Standardize and document all environment variables in `.env.example`
-   [ ] Remove or merge duplicate configuration files (e.g., multiple config or env files)
-   [ ] Ensure all scripts in `package.json`/`bunfig.toml` are up-to-date and used

## Documentation

-   [ ] Update the main `README.md` to reflect the latest architecture and features
-   [ ] Ensure all documentation files in `/docs` are current and reference only the new systems
-   [ ] Add or update documentation for new features, utilities, and workflows
-   [ ] Remove or archive outdated documentation

## Testing & Quality

-   [ ] Add or update unit tests for all core modules and utilities
-   [ ] Ensure all test scripts run successfully (CI/CD, local)
-   [ ] Add integration tests for critical workflows (ticketing, knowledge, moderation)
-   [ ] Add or update linting and formatting configs (ESLint, Prettier)
-   [ ] Run Prettier and ESLint across the codebase for consistency

## Security & Permissions

-   [ ] Audit all permission checks in commands and services
-   [ ] Ensure sensitive actions are properly restricted (e.g., admin, moderator)
-   [ ] Review and update the Prisma schema for permission/role consistency

## Database & ORM

-   [ ] Review all Prisma models for normalization, indexes, and constraints
-   [ ] Remove unused or legacy models/fields from the schema
-   [ ] Ensure all migrations are up-to-date and tested
-   [ ] Add or update seed scripts for initial data

## Discord Integration

-   [ ] Audit all Discord command handlers for consistency and error handling
-   [ ] Remove or refactor legacy command files
-   [ ] Ensure all slash commands are registered and documented
-   [ ] Update Discord event handlers for best practices

## Monitoring & Logging

-   [ ] Standardize logging across all modules (use a shared logger)
-   [ ] Ensure all critical errors are logged and reported
-   [ ] Add or update performance monitoring and metrics collection

## CI/CD & Deployment

-   [ ] Review and update all CI/CD workflows (GitHub Actions, etc.)
-   [ ] Ensure deployment scripts are current and documented
-   [ ] Add health checks and status endpoints if missing

## Miscellaneous

-   [ ] Audit and update all third-party dependencies
-   [ ] Remove unused dependencies from `bun.lockb`/`package.json`
-   [ ] Add or update `.gitattributes`, `.gitignore`, and other project meta files
