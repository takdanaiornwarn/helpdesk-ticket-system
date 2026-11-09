
# Helpdesk Ticket Management System

A full-stack web application for managing IT support tickets,
built with Node.js, Express, React, Prisma ORM, and PostgreSQL.

This portfolio project demonstrates RESTful API development,
JWT authentication, role-based authorization, relational
database design, automated testing, and frontend integration.

## Project Highlights

- Full-stack application with a React frontend and Express backend
- JWT authentication and role-based access control (RBAC)
- Complete ticket CRUD operations
- Ticket status tracking and change history
- ADMIN ticket assignment and category management
- Search, filtering, sorting, pagination, and CSV export
- Automated API testing using Node.js Test Runner
- Centralized error handling and React Error Boundary

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, JavaScript, Vite, CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT, bcryptjs |
| Testing | Node.js Test Runner, Postman |
| Tools | VS Code, Git, GitHub, pgAdmin |

## System Architecture

```mermaid
flowchart TD
    A["User / Admin"] --> B["React Frontend"]
    B -->|"REST API / JSON"| C["Express Backend"]
    C --> D["JWT Authentication"]
    D --> E["Role-Based Authorization"]
    E --> F["Business Logic"]
    F --> G["Prisma ORM"]
    G --> H[("PostgreSQL")]

    F --> I["Ticket CRUD"]
    F --> J["Status & History"]
    F --> K["Assignment"]
    F --> L["Category Management"]
```

The backend is responsible for authentication, authorization,
request validation, and database operations.

The frontend displays information according to the user's role.
Backend authorization remains the source of truth.

## Database Design

The application uses four main Prisma models:

- **User**: Account information and roles
- **Ticket**: Support requests, ownership, assignment, and status
- **Category**: Classification of support tickets
- **TicketHistory**: Status changes, actors, and notes

```mermaid
erDiagram
    User ||--o{ Ticket : creates
    User o|--o{ Ticket : assigned_to
    Category ||--o{ Ticket : categorizes
    Ticket ||--o{ TicketHistory : records
    User ||--o{ TicketHistory : performs
```

## Features

### Authentication & Authorization

- User registration and login
- JWT authentication
- Protected API endpoints
- USER and ADMIN roles
- Authorization checks on the backend
- Session expiration handling

### Ticket Management

- Create tickets
- View accessible tickets
- View ticket details
- Update tickets
- Delete tickets with confirmation
- Filter by status and priority
- Search by ticket ID and title
- Sort and paginate tickets
- Export filtered tickets to CSV

### ADMIN Management

- View tickets across the system
- Change ticket status
- View status history
- Record status-change notes
- Assign, reassign, and unassign tickets
- View tickets assigned to the current ADMIN
- Create, edit, and delete categories

### Reliability

- Centralized API error handling
- Form validation
- Network error messages
- Authentication error handling
- React Error Boundary
- Automated backend tests

## Roles and Permissions

| Function | USER | ADMIN |
|---|---|---|
| Login | Yes | Yes |
| Create Ticket | Yes | Yes |
| View Own Tickets | Yes | Yes |
| View All Tickets | No | Yes |
| Edit Authorized Tickets | Yes | Yes |
| Delete Authorized Tickets | Yes | Yes |
| Change Ticket Status | No | Yes |
| Assign Ticket | No | Yes |
| Manage Categories | No | Yes |

## REST API

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |

### Tickets

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tickets` | Get accessible tickets |
| GET | `/api/tickets/:id` | Get ticket details |
| POST | `/api/tickets` | Create ticket |
| PUT | `/api/tickets/:id` | Update ticket |
| DELETE | `/api/tickets/:id` | Delete ticket |
| PATCH | `/api/tickets/:id/status` | Update status |
| GET | `/api/tickets/:id/history` | Status history |
| PATCH | `/api/tickets/:id/assign` | Assign ticket |
| GET | `/api/tickets/assigned/me` | My assigned tickets |

### Categories

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/categories` | Get categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

## Getting Started

### Prerequisites

- Node.js
- npm
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/takdanaiornwarn/helpdesk-ticket-system.git
cd helpdesk-ticket-system
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env` in the project root based on `.env.example`.

Required variables include:

```dotenv
DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@localhost:5432/helpdesk_db?schema=public"
JWT_SECRET="REPLACE_WITH_A_SECURE_RANDOM_SECRET"
JWT_EXPIRES_IN="1h"
```

Use your own database credentials and JWT secret.

Never commit real credentials to GitHub.

### 4. Configure the Database

Create the PostgreSQL database defined in `DATABASE_URL`.

Run:

```bash
npx prisma generate
npx prisma migrate deploy
```

Create the necessary accounts and categories before
testing authenticated functionality.

### 5. Start the Backend

```bash
npm start
```

Backend:

http://localhost:3000

### 6. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

http://localhost:5173

The Vite development proxy forwards `/api` requests to
the local Express backend.

## Testing

Backend API tests use Node.js Test Runner.

With PostgreSQL and the backend running, execute from
the project root:

```bash
npm test
```

Some tests require the configured test USER and ADMIN accounts
in the backend `.env` file.

Frontend validation:

```bash
cd frontend
npm run lint
npm run build
```

## Screenshots

Application screenshots will be added to this section.

Recommended views:


## Screenshots

### Dashboard
![Dashboard](docs/screenshots/Helpdesk-Dashboard.png)

### All Tickets
![All Tickets](docs/screenshots/Helpdesk-All-Tickets.png)

### Ticket Details
![Ticket Details](docs/screenshots/Helpdesk-Ticket-Details.png)

### Ticket Assignment
![Ticket Assignment](docs/screenshots/Helpdesk-Ticket-Assignment.png)

### Categories Management
![Categories Management](docs/screenshots/Helpdesk-Categories-Management.png)


## Security Notes

- Passwords are hashed using bcryptjs
- API authentication uses JWT
- Role-based authorization is enforced by the backend
- ADMIN operations require authorization
- Secrets are stored outside source control

The current frontend uses sessionStorage for JWT storage
in this portfolio demonstration.

For production use, consider secure HttpOnly cookies,
HTTPS, CSRF protections where applicable, rate limiting,
and an appropriate deployment security review.

## Future Improvements

- Server-side pagination
- Ticket attachments
- Email notifications
- Audit logging
- CI/CD
- Cloud deployment
- Production-ready session management

## Repository

https://github.com/takdanaiornwarn/helpdesk-ticket-system
```
