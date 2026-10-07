# ResQLInk

ResQLInk is an emergency resource coordination platform for communities, volunteers, and organizations. It brings emergency requests, available resources, and volunteer capacity into one API-backed workspace.

## Features

- JWT sign-up and sign-in with bcrypt password hashing and role-based API access.
- User dashboards, private request tracking, request status, and request detail views.
- Shared resource inventory with create, update, availability, and delete operations.
- Volunteer profiles with skills, location, availability, and status.
- Administrator metrics, request triage, resource and volunteer assignment, and account/resource management.
- Responsive React/Vite interface with validation, loading, empty, success, and error states.

## Technologies

- Frontend: React, JavaScript, Vite, CSS.
- Backend: Node.js, Express, Mongoose, MongoDB, JWT, bcryptjs, CORS, dotenv, Helmet.

## Folder structure

```text
resqlink-fullstack/
├── frontend/
│   ├── src/
│   │   ├── pages/        # Login and registration forms
│   │   ├── api.js         # Shared authenticated fetch client
│   │   ├── App.jsx        # Navigation and application views
│   │   └── App.css
│   └── .env.example
├── backend/
│   ├── src/
│   │   ├── app.js        # Express app and CORS configuration
│   │   ├── config/       # MongoDB connection
│   │   ├── middleware/   # Authentication and error handling
│   │   ├── models/       # User, request, resource, volunteer
│   │   ├── routes/       # REST API endpoints
│   │   ├── scripts/      # Administrator setup
│   │   ├── services/     # Volunteer assignment status
│   │   └── server.js     # API startup
│   ├── test/             # HTTP smoke tests
│   └── .env.example
└── README.md
```

## Requirements

- Node.js 20 or newer and npm.
- MongoDB Community Server running locally, or a MongoDB Atlas database.

## Configuration

Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` and a private, random `JWT_SECRET` (at least 32 random characters recommended). For MongoDB Atlas, get the current hostname from **Connect > Drivers** and set the URI in this form:

```text
mongodb+srv://karthika:<URL_ENCODED_PASSWORD>@<YOUR_ATLAS_CLUSTER_HOST>/<DATABASE>?retryWrites=true&w=majority&appName=Cluster0
```

Replace the complete `<URL_ENCODED_PASSWORD>` placeholder with the Atlas database user's password (URL-encode reserved characters such as `@`, `:`, `/`, and `#`), replace the host and database placeholders, and remove all angle brackets. The username goes immediately after `://` and before the colon. Configure the Atlas user's network access/IP allowlist as well. Never commit `backend/.env`.

The frontend API base is configured in `frontend/.env` as `http://localhost:5000/api`. Vite values are public and must not contain secrets. `CLIENT_ORIGIN` accepts a comma-separated allowlist for other origins; local development permits `http://localhost:5173` and `http://localhost:5174` (also `127.0.0.1` on those ports).

To create the first administrator, set `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PHONE`, and a unique `ADMIN_PASSWORD` (at least 12 characters) in `backend/.env`, then run `npm run admin:create` from `backend/`. Remove the admin password from the environment file after setup if desired. Public registration cannot create administrator accounts.

## Install and start the project

Install the dependencies once:
```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
```

Stop any separately running backend or Vite processes with `Ctrl+C`, then start both services together from the project root:
```powershell
npm run dev
```

The API listens on `http://localhost:5000`; open the Vite URL, normally `http://localhost:5173`. Vite is configured to fail on a busy port instead of silently advancing to 5174/5175. The root script stops the other service if either service exits. `GET /api/health` reports database readiness; if MongoDB is unavailable, the API remains reachable and returns HTTP 503.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/password`
- `GET /api/public/overview`
- `/api/users` and `/api/users/:id` (administrator list/delete; self profile read/update)
- `/api/requests` and `/api/requests/:id`; `GET /api/requests/user/:userId`
- `/api/resources` and `/api/resources/:id`
- `/api/volunteers` and `/api/volunteers/:id`
- `GET /api/admin/dashboard`, `/api/admin/users`, `/api/admin/requests`, `/api/admin/resources`, `/api/admin/volunteers`
- `GET /api/health`

Private endpoints accept `Authorization: Bearer <token>`. Admin endpoints require an administrator token. Resource and volunteer directory reads are public; request details are limited to the requester, assigned volunteer, and administrators. Request statuses are `pending`, `accepted`, `in_progress`, `completed`, and `rejected`.

Run `npm test` from `backend/` for HTTP smoke tests covering database errors, local CORS origins, registration validation, and protected routes. Full CRUD/authentication tests need a reachable MongoDB instance.

## Notes

- The frontend stores the login token in `sessionStorage`, so closing the tab ends the browser session.
- MongoDB must be running before data operations can succeed. There are no fake records or bundled demo accounts; create accounts and add requests/resources through the application. Use the `admin:create` script to bootstrap an administrator.
- For production, serve both applications over HTTPS, use a strong secret manager, restrict CORS to the deployed frontend origin, and configure database backups and monitoring.