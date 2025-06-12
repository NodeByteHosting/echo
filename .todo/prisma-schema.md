# Prisma Schema & Database TODO

## Schema Improvements

-   [x] Review all model relations for consistency and normalization
-   [x] Add missing indexes for performance-critical queries
-   [x] Ensure all enums are up-to-date and used where appropriate
-   [x] Add constraints for data integrity (e.g., unique, required fields)
-   [~] Review and document all model fields for clarity (Echo models done; others in progress)
-   [~] Add audit fields (createdBy, updatedBy) where needed (partially done; see KnowledgeBase, Echo)

## Migrations

-   [ ] Implement a migration workflow using Prisma Migrate (blocked: DB permissions)
-   [ ] Document the migration process for contributors
-   [ ] Test migrations on a staging/dev database before production

## Seeds

-   [ ] Create seed scripts for initial data (roles, permissions, demo users, etc.)
-   [ ] Add seed data for testing (sample tickets, knowledge entries, etc.)
-   [ ] Document how to run and reset seeds

## Echo System Model (2025-06-12)

-   [x] Consolidate Echo system config into the main `Echo` model
-   [x] Move all Echo submodels (EchoSettings, EchoBranding, EchoFeatures, EchoPrompts, EchoPerformance, EchoModels, EchoMaintenance) to be relations of `Echo`
-   [x] Remove separate EchoConfig model and update all code to use the new structure
-   [~] Update bot/system code to read/write maintenance state and config from the main `Echo` model and its relations (in progress)
-   [~] Update AI system to use model settings from `Echo` and related models (in progress)
-   [~] Add admin commands to view and update all Echo config/settings (in progress)
-   [~] Document the new Echo model structure and usage (in progress)

## Module & CRUD Coverage (2025-06-12)

-   [x] Add modules for all missing Prisma models (Echo, EchoSettings, EchoBranding, EchoFeatures, EchoPrompts, EchoPerformance, Item, Inventory, Level, Badge, Achievement, Statistics, Transaction, TicketFeedback, etc.)
-   [x] Add missing CRUD and relation methods to existing modules (users, tickets, agents, knowledge, moderation, audit, guild, conversations)
-   [x] Ensure all fields (including new/optional ones) are handled in create/update methods for all modules
-   [x] Expose advanced queries and batch operations where relevant
-   [x] Add validation for enums and relations in all modules
-   [~] Add tests for new and updated modules (pending)

## General

-   [~] Add tests for all new models and seed logic (pending)
-   [x] Review and clean up any unused models or fields
-   [x] Ensure all changes are reflected in the documentation

---

**Next Steps:**
- Continue documenting all model fields in `prisma/schema.prisma` (see below for progress)
- Add audit fields (`createdBy`, `updatedBy`) to models where needed
- Implement/document migration workflow and seed scripts
- Update bot/system/AI code to use new Echo model structure
- Add/admin commands for Echo config
- Add and document tests for modules and seeds
