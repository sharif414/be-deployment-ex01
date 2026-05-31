# Express User Management API

A simple Node.js + Express REST API for user management backed by PostgreSQL.

## What This Project Does

This API provides CRUD operations for users:

- Create one user
- Create users in bulk
- Get all users (with filtering, sorting, pagination)
- Get one user by ID
- Update user by ID
- Delete user by ID

The service is built with:

- `express` for HTTP API
- `pg` for PostgreSQL access
- `dotenv` for environment variables
- `morgan` for request logging
- `nodemon` for local development startup

## Project Structure

- `server.js` - app bootstrap, middleware, route mounting, startup health logs
- `router/userRouter.js` - user routes
- `service/userService.js` - route handlers and SQL queries
- `db/pool.js` - PostgreSQL pool + DB connection health check
- `config.env` - local environment variables (not for production)
- `public/` - static files served by Express

## How It Works

1. `server.js` loads environment variables from `config.env`.
2. Express middleware is registered:
   - JSON body parsing
   - request logging (`morgan`)
   - static file serving from `public/`
3. User routes are mounted at `/api/v1/users`.
4. On startup, the app prints:
   - `server up` status
   - database health status (`db up` or `db down` with reason)
5. Route handlers in `service/userService.js` validate input, build SQL, and return JSON responses.

## Prerequisites

- Node.js 18+ (Node 20+ recommended)
- npm
- PostgreSQL database (local or cloud, e.g., Neon)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create/update `config.env`:

```env
NODE_ENV=dev
PORT=3000

DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

3. Create database table (run once):

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  age INT NOT NULL CHECK (age > 0)
);
```

## Run the App

```bash
npm start
```

Default URL:

- `http://localhost:3000`

Main API base path:

- `http://localhost:3000/api/v1/users`

## API Endpoints

### 1) Get all users

`GET /api/v1/users`

Query params:

- `page` (default: `1`)
- `limit` (default: `10`)
- `sortBy` (`id | name | email | age`, default: `id`)
- `order` (`asc | desc`, default: `asc`)
- `name` (partial match)
- `email` (partial match)
- `age` (exact match)

Example:

```bash
curl "http://localhost:3000/api/v1/users?page=1&limit=5&sortBy=age&order=desc&name=sh"
```

### 2) Get user by ID

`GET /api/v1/users/:id`

```bash
curl "http://localhost:3000/api/v1/users/1"
```

### 3) Create one user

`POST /api/v1/users`

```bash
curl -X POST "http://localhost:3000/api/v1/users" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sharif","email":"sharif@example.com","age":26}'
```

### 4) Update user

`PUT /api/v1/users/:id`

```bash
curl -X PUT "http://localhost:3000/api/v1/users/1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sharif Updated","email":"sharif.updated@example.com","age":27}'
```

### 5) Delete user

`DELETE /api/v1/users/:id`

```bash
curl -X DELETE "http://localhost:3000/api/v1/users/1"
```

### 6) Create users in bulk

`POST /api/v1/users/bulk-users`

```bash
curl -X POST "http://localhost:3000/api/v1/users/bulk-users" \
  -H "Content-Type: application/json" \
  -d '[
    {"name":"Alice","email":"alice@example.com","age":24},
    {"name":"Bob","email":"bob@example.com","age":30}
  ]'
```

## How To Test

This project currently has **manual API testing** only. The `npm test` script is a placeholder and does not run automated tests yet.

Use this quick manual test flow:

1. Start server:

```bash
npm start
```

2. Check startup logs:

- You should see `[startup] server up on port 3000`
- If DB is reachable, you should see `[startup] db up ...`
- If DB is not reachable, you will see `[startup] db down ...` with reason

3. Run endpoint tests using `curl`:

- Create user
- Get all users
- Get by ID
- Update
- Delete
- Bulk create

4. Validate error cases:

- Invalid `id` (e.g., `/users/abc`)
- Duplicate email
- Missing fields in request body
- Invalid pagination (`page<=0` or `limit<=0`)

## Common Issues

### 1) `db down: getaddrinfo ENOTFOUND ...`

Cause: DNS/host resolution problem for `DB_HOST`.

Checks:

- Confirm `DB_HOST` value is correct
- Confirm internet/VPN/DNS access
- Verify host and credentials from your DB provider dashboard

### 2) `Email already exists`

Cause: `email` column is unique.

Fix: Use a different email address.

### 3) `Database connection not available`

Cause: DB pool not ready or DB env/config issue.

Fix: Verify `config.env` and DB reachability.

## Suggested Next Improvements

- Add automated tests (Jest + Supertest)
- Add `npm run dev` script for non-blocking local workflows
- Add input schema validation (e.g., Zod/Joi)
- Add migration tool (e.g., Knex/Prisma/Drizzle)
- Add centralized error-handling middleware

## License

ISC
