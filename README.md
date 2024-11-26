## Indexie

Indexie is a rather in depth Discord Application used to help us in the management of our [forums site](https://github.com/NodeByteHosting/discord-forums).

---

### Features

-   ES6/ES Module based code structure
-   `module-alias` and `paths` for easier imports
-   PostgreSQL integration via Prisma
-   Flexible command and event handlers
-   customizable/flexible console logger
-   auto deploy application commands
-   full integration support (buttons etc)

---

### Commands

-   `[bun|yarn|npm] run dev`: run the bot/client in a development environment!
-   `[bun|yarn|npm] start`: run the bot/client in a production environment!
-   `[bun|yarn|npm] run prisma:generate`: generate Prisma client based on the schema.
-   `[bun|yarn|npm] run prisma:migrate`: run Prisma migrations in the development environment.
-   `[bun|yarn|npm] run prisma:studio`: open Prisma Studio to explore and manipulate the database.
-   `[bun|yarn|npm] run prisma:push`: push the Prisma schema state to the database (use migrate instead).

> **NOTE**: We will generate a Prisma client for you when you run `[bun|yarn|npm] install`. We also recommend using Prisma's migrate command over the push command as migrate helps to avoid data loss. Data loss in Prisma occurs when the push command is used to apply schema changes directly to the database without creating a migration history. Migrations provide a safer way to evolve your database schema by generating SQL scripts that can be reviewed and applied incrementally.

---

### Prisma Studio

Prisma Studio is a visual editor for your database. It allows you to explore and manipulate the data in your database with a user-friendly interface. With Prisma Studio, you can easily view, create, update, and delete records in your database tables.

Prisma Studio is a visual editor for your database. It allows you to explore and manipulate the data in your database with a user-friendly interface. With Prisma Studio, you can easily view, create, update, and delete records in your database tables.

#### How to Use Prisma Studio

1. **Start Prisma Studio**: Run the following command to open Prisma Studio:

    ```bash
    [bun|yarn|npm] run prisma:studio
    ```

2. **Access Prisma Studio**: Once the command is executed, Prisma Studio will start and provide a URL (usually `http://localhost:5555`). Open this URL in your web browser to access the Prisma Studio interface.

3. **Explore and Manipulate Data**: Use the Prisma Studio interface to explore your database tables. You can view the records, create new records, update existing records, and delete records as needed.

#### How Prisma Studio Works

Prisma Studio connects to your database using the connection details specified in your Prisma schema file (`schema.prisma`). It provides a visual representation of your database schema and allows you to interact with the data in a more intuitive way.

-   **View Records**: Browse through the records in your database tables.
-   **Create Records**: Add new records to your database tables.
-   **Update Records**: Modify existing records in your database tables.
-   **Delete Records**: Remove records from your database tables.

Prisma Studio is a powerful tool that simplifies database management and makes it easier to work with your data.

> **NOTE**: It is recommended to use Prisma Studio in a development or staging environment. Running Prisma Studio in a production environment can pose security risks and affect performance. Use dedicated database management tools for production environments, we highly recommend [querym](https://querym.net/)

---
