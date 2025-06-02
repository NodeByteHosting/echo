# Database Migrations Guide

This guide covers how to manage database migrations in Echo using Prisma.

## Managing Database Schema

### Creating New Migrations

When you make changes to the schema in `prisma/schema.prisma`, create a new migration:

```bash
bunx prisma migrate dev --name <descriptive_name>
```

Example migration names:

-   add_user_email
-   update_ticket_status_enum
-   create_achievements_table

This will:

1. Save your schema changes to a new migration file
2. Execute all pending migrations
3. Regenerate the Prisma Client

### Development vs Production

In development:

```bash
bunx prisma migrate dev
```

In production:

```bash
bunx prisma migrate deploy
```

The key difference is that `migrate dev` is for development environments where you can afford data loss, while `migrate deploy` is for production where data preservation is critical.

## Schema Changes

Major schema updates will be documented here.

### Latest Changes (v3.0)

1. **User Model**

    - Added email field (optional)
    - New roles and permissions
    - Added relationships to new models

2. **Message Model**

    - Added internal flag for staff-only messages
    - New relationship to tickets

3. **Ticket Model**
    - Added escalation support
    - Enhanced agent assignment system

## Troubleshooting

### Common Issues

1. **Migration Conflicts**
   If you get migration conflicts: ```bash
   bunx prisma migrate reset --force

    ```
    ⚠️ Warning: This will delete all data. Use only in development.

    ```

2. **Schema Drift**
   If your database is out of sync:

    ```bash
    bunx prisma migrate diff
    bunx prisma migrate reset
    ```

3. **Failed Migrations** - Always backup your database before migrations
    - Check migration status: `bunx prisma migrate status`
    - Review migration history in `prisma/migrations`

## Downgrading

To downgrade to a previous version:

1. Revert migrations
2. Install older package version
3. Restore old configuration

## Common Issues

### Database Migration Failures

If migrations fail:

1. Backup database
2. Reset migrations:
    ```bash
    bunx prisma migrate reset
    ```
3. Reapply migrations
