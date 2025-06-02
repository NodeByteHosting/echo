# Database Management Guide

Echo uses PostgreSQL with Prisma ORM for database management. This guide covers setup, schema overview, and best practices.

## Quick Setup

1. Create a PostgreSQL database:

    ```bash
    createdb echo
    ```

2. Configure database connection in `.env`:

    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/echo"
    ```

3. Initialize the database:
    ```bash
    bunx prisma generate
    bunx prisma migrate dev
    ```

## Core Schema Components

### Users and Authentication

-   User profiles and roles
-   Permissions system
-   Authentication data

### Support System

-   Tickets and conversations
-   Agent assignments
-   Support queue management

### Server Configuration

-   Guild settings
-   Audit logging
-   Channel configurations

### Economy and Progress

-   Virtual currency
-   Inventory system
-   Achievements and levels

### Knowledge Base

-   AI training data
-   Community resources
-   Documentation

## Database Operations

### Common Commands

1. **Generate Client**

    ```bash
    npx prisma generate
    ```

    Updates TypeScript types after schema changes

2. **Development Updates**

    ```bash
    npx prisma migrate dev
    ```

    Creates and applies migrations in development

3. **Production Deployment**

    ```bash
    npx prisma migrate deploy
    ```

    Safely applies migrations in production

4. **View Studio**
    ```bash
    npx prisma studio
    ```
    Opens web interface to browse and edit data

### Performance Optimization

1. **Indexes**

    - Foreign keys are indexed by default
    - Custom indexes on frequently queried fields
    - Composite indexes for complex queries

2. **Relations**

    - Explicit relation naming
    - Strategic use of eager loading
    - Proper cascade settings

3. **Field Types**
    - BigInt for Discord IDs
    - Text for long content
    - JSON for flexible data

## Best Practices

1. **Schema Changes**

    - Create focused, atomic migrations
    - Test migrations thoroughly
    - Document breaking changes
    - Back up before production updates

2. **Data Operations**

    - Use transactions for related changes
    - Implement proper error handling
    - Follow rate limiting guidelines
    - Regular data cleanup

3. **Security**
    - Validate all user input
    - Use prepared statements
    - Regular security audits
    - Proper access controls
