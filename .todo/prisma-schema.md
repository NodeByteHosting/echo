# Prisma Schema & Database TODO

## Schema Improvements

-   [x] Review all model relations for consistency and normalization
-   [ ] Add missing indexes for performance-critical queries
-   [x] Ensure all enums are up-to-date and used where appropriate
-   [ ] Add constraints for data integrity (e.g., unique, required fields)
-   [ ] Review and document all model fields for clarity
-   [ ] Add audit fields (createdBy, updatedBy) where needed

## Migrations

-   [ ] Implement a migration workflow using Prisma Migrate (blocked: DB permissions)
-   [ ] Document the migration process for contributors
-   [ ] Test migrations on a staging/dev database before production

## Seeds

-   [ ] Create seed scripts for initial data (roles, permissions, demo users, etc.)
-   [ ] Add seed data for testing (sample tickets, knowledge entries, etc.)
-   [ ] Document how to run and reset seeds

## Echo System Config Model

-   [x] Design and implement an `EchoConfig` model for system-wide settings:
    -   [x] `id` (singleton, always 1)
    -   [x] `maintenanceMode` (Boolean, default: false)
    -   [x] `defaultAiModel` (String, e.g., "gpt-4.1-nano")
    -   [x] `allowedAiModels` (String[], e.g., ["gpt-4.1-nano", "gpt-3.5-turbo"])
    -   [x] `lastUpdated` (DateTime)
    -   [x] `updatedBy` (BigInt, User ID)
    -   [x] `customSettings` (Json)
-   [ ] Add a migration for the new EchoConfig model (blocked: DB permissions)
-   [ ] Add a seed for the default EchoConfig row

## System Config Usage

-   [ ] Update bot/system code to read/write maintenance state from EchoConfig
-   [ ] Update AI system to use `defaultAiModel` from EchoConfig
-   [ ] Add admin commands to view and update EchoConfig settings
-   [ ] Document the EchoConfig model and its usage

## Module & CRUD Coverage (2025-06-12)

-   [ ] Add modules for all missing Prisma models (Echo, EchoSettings, EchoBranding, EchoFeatures, EchoPrompts, EchoPerformance, Item, Inventory, Level, Badge, Achievement, Statistics, Transaction, TicketFeedback, etc.)
-   [ ] Add missing CRUD and relation methods to existing modules (users, tickets, agents, knowledge, moderation, audit, guild, conversations)
-   [ ] Ensure all fields (including new/optional ones) are handled in create/update methods for all modules
-   [ ] Expose advanced queries and batch operations where relevant
-   [ ] Add validation for enums and relations in all modules
-   [ ] Add tests for new and updated modules

## General

-   [ ] Add tests for all new models and seed logic
-   [ ] Review and clean up any unused models or fields
-   [ ] Ensure all changes are reflected in the documentation
