# Express User Management API - Step-by-Step Tutorial

This tutorial walks you from zero setup to running and testing a complete User Management REST API using Node.js, Express, and PostgreSQL.

## Step 1: What You Are Building

You are building an API that can:

- Create a user
- Create users in bulk
- List users with filter/sort/pagination
- Get one user by ID
- Update a user
- Delete a user

Base URL after startup:

- `http://localhost:3000/api/v1/users`

## Step 2: Understand the Project Structure

- `server.js` - starts Express server and prints startup health logs
- `router/userRouter.js` - defines API routes
- `service/userService.js` - request handlers + SQL queries
- `db/pool.js` - PostgreSQL pool and DB health check
- `config.env` - environment variables
- `public/` - static files served by Express

## Step 3: Install Prerequisites

Install these first:

- Node.js 18+ (Node 20+ recommended)
- npm
- PostgreSQL database (local or cloud, e.g., Neon)

Check versions:

```bash
node -v
npm -v
```

## Step 4: Install Dependencies

From the project root, run:

```bash
npm install
```

## Step 5: Configure Environment Variables

Create or update `config.env` in the root folder:

```env
NODE_ENV=dev
PORT=3000

DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

Important:

- `DB_HOST` must be correct and reachable
- wrong host/DNS causes `ENOTFOUND`

## Step 6: Create the Database Table

Run this SQL once in your PostgreSQL database:

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  age INT NOT NULL CHECK (age > 0)
);
```

## Step 7: Start the Server

Run:

```bash
npm start
```

Expected startup logs:

- `[startup] server up on port 3000`
- `[startup] db up ...` if DB is connected

If DB fails, you will see:

- `[startup] db down: ...`
- possible DNS hint for `ENOTFOUND`

## Step 8: Learn the API Routes

### `GET /api/v1/users`

List users with optional query params:

- `page` (default `1`)
- `limit` (default `10`)
- `sortBy` (`id`, `name`, `email`, `age`)
- `order` (`asc`, `desc`)
- `name` (partial match)
- `email` (partial match)
- `age` (exact match)

### `GET /api/v1/users/:id`

Get one user by ID.

### `POST /api/v1/users`

Create one user.

### `PUT /api/v1/users/:id`

Update one user.

### `DELETE /api/v1/users/:id`

Delete one user.

### `POST /api/v1/users/bulk-users`

Create multiple users in one request.

## Step 9: Test the API Manually (Copy/Paste Commands)

### 9.1 Create one user

```bash
curl -X POST "http://localhost:3000/api/v1/users" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sharif","email":"sharif@example.com","age":26}'
```

### 9.2 List users

```bash
curl "http://localhost:3000/api/v1/users?page=1&limit=5&sortBy=age&order=desc"
```

### 9.3 Filter by name

```bash
curl "http://localhost:3000/api/v1/users?name=sha"
```

### 9.4 Get user by ID

```bash
curl "http://localhost:3000/api/v1/users/1"
```

### 9.5 Update user

```bash
curl -X PUT "http://localhost:3000/api/v1/users/1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sharif Updated","email":"sharif.updated@example.com","age":27}'
```

### 9.6 Delete user

```bash
curl -X DELETE "http://localhost:3000/api/v1/users/1"
```

### 9.7 Bulk create users

```bash
curl -X POST "http://localhost:3000/api/v1/users/bulk-users" \
  -H "Content-Type: application/json" \
  -d '[
    {"name":"Alice","email":"alice@example.com","age":24},
    {"name":"Bob","email":"bob@example.com","age":30}
  ]'
```

## Step 10: Test Error Scenarios

Try these to confirm validation and error handling:

1. Invalid ID:

```bash
curl "http://localhost:3000/api/v1/users/abc"
```

2. Duplicate email (create same email twice)
3. Missing fields (`name`, `email`, or `age`)
4. Invalid pagination (`page=0` or `limit=0`)

## Step 11: How Request Processing Works Internally

1. Request enters `server.js`
2. Express middleware parses JSON and logs request
3. Router in `router/userRouter.js` maps endpoint to handler
4. Handler in `service/userService.js` validates input
5. SQL query runs through pool from `db/pool.js`
6. JSON response is returned with success or error message

## Step 12: Troubleshooting

### Problem: `db down: getaddrinfo ENOTFOUND ...`

Fix checklist:

- Confirm `DB_HOST` is exactly correct
- Check internet/VPN/DNS access
- Verify DB host/credentials in provider dashboard

### Problem: `Email already exists`

- `email` column is unique
- use a new email for create/bulk create

### Problem: `Database connection not available`

- re-check `config.env`
- ensure DB server is running and reachable

## Step 13: Current Testing Status

- `npm test` is currently a placeholder script
- testing is manual via `curl` commands above

## Step 14: Next Upgrade Ideas

- Add automated tests with Jest + Supertest
- Add a `npm run dev` script
- Add schema validation with Joi or Zod
- Add DB migrations
- Add centralized error middleware

## License

ISC
