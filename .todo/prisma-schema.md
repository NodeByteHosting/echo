# Prisma Schema & Database TODO

## Schema Improvements

- [ ] Review all model relations for consistency and normalization
- [ ] Add missing indexes for performance-critical queries
- [ ] Ensure all enums are up-to-date and used where appropriate
- [ ] Add constraints for data integrity (e.g., unique, required fields)
- [ ] Review and document all model fields for clarity
- [ ] Add audit fields (createdBy, updatedBy) where needed

## Migrations

- [ ] Implement a migration workflow using Prisma Migrate
- [ ] Document the migration process for contributors
- [ ] Test migrations on a staging/dev database before production

## Seeds

- [ ] Create seed scripts for initial data (roles, permissions, demo users, etc.)
- [ ] Add seed data for testing (sample tickets, knowledge entries, etc.)
- [ ] Document how to run and reset seeds

## Echo System Config Model

- [ ] Design and implement an `EchoConfig` model for system-wide settings:
    - [ ] `id` (singleton, always 1)
    - [ ] `maintenanceMode` (Boolean, default: false)
    - [ ] `defaultAiModel` (String, e.g., "gpt-4.1-nano")
    - [ ] `allowedAiModels` (String[], e.g., ["gpt-4.1-nano", "gpt-3.5-turbo"])
    - [ ] `lastUpdated` (DateTime)
    - [ ] `updatedBy` (BigInt, User ID)
    - [ ] `customSettings` (Json)
- [ ] Add a migration for the new EchoConfig model
- [ ] Add a seed for the default EchoConfig row

## System Config Usage

- [ ] Update bot/system code to read/write maintenance state from EchoConfig
- [ ] Update AI system to use `defaultAiModel` from EchoConfig
- [ ] Add admin commands to view and update EchoConfig settings
- [ ] Document the EchoConfig model and its usage

## General

- [ ] Add tests for all new models and seed logic
- [ ] Review and clean up any unused models or fields
- [ ] Ensure all changes are reflected in the documentation
