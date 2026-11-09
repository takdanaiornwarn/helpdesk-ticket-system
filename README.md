
# Helpdesk Ticket Management System

A full-stack web application for creating, tracking, assigning,
and managing IT support tickets.

Built as a portfolio project to demonstrate backend development,
RESTful API design, authentication, authorization, relational
database management, automated testing, and React integration.

## Tech Stack

### Backend
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Password Hashing with bcrypt

### Frontend
- React
- JavaScript
- Vite
- HTML5
- CSS3
- Fetch API

### Development Tools
- Visual Studio Code
- Postman
- pgAdmin
- Git and GitHub

## Features

### Authentication and Authorization
- User registration
- JWT-based login
- Protected REST APIs
- Role-based access control (USER / ADMIN)
- Session expiration handling

### Ticket Management
- Create support tickets
- View ticket lists and details
- Edit ticket information
- Delete tickets with confirmation
- Search, filter, and sort tickets
- Client-side pagination
- Export filtered tickets to CSV

### ADMIN Features
- View all support tickets
- Change ticket status
- View ticket status history
- Assign, reassign, and unassign tickets
- View tickets assigned to the current ADMIN
- Create, update, and delete categories

### Reliability
- Centralized API error handling
- Frontend form validation
- React Error Boundary
- Backend connection error handling
- Automated backend tests

## User Roles

| Feature | USER | ADMIN |
|---|---|---|
| Login | Yes | Yes |
| Create Ticket | Yes | Yes |
| View Own Tickets | Yes | Yes |
| View All Tickets | No | Yes |
| Edit Authorized Tickets | Yes | Yes |
| Delete Authorized Tickets | Yes | Yes |
| Change Ticket Status | No | Yes |
| Assign Tickets | No | Yes |
| Manage Categories | No | Yes |

## System Architecture

Frontend (React + Vite)
        |
        | HTTP Requests / REST API
        v
Backend (Node.js + Express)
        |
        | Authentication / Authorization
        v
Prisma ORM
        |
        v
PostgreSQL Database

## Database Models

- User
- Ticket
- Category
- TicketHistory

The database uses relational models to represent ticket
ownership, assignments, categories, and status changes.

## REST API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Tickets

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/tickets | List accessible tickets |
| GET | /api/tickets/:id | Get ticket details |
| POST | /api/tickets | Create ticket |
| PUT | /api/tickets/:id | Update ticket |
| DELETE | /api/tickets/:id | Delete ticket |
| PATCH | /api/tickets/:id/status | Update status |
| GET | /api/tickets/:id/history | Get status history |
| PATCH | /api/tickets/:id/assign | Assign ticket |
| GET | /api/tickets/assigned/me | Assigned tickets |

### Categories

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/categories | List categories |
| POST | /api/categories | Create category |
| PUT | /api/categories/:id | Update category |
| DELETE | /api/categories/:id | Delete category |

## Local Setup

### Prerequisites

Install:
- Node.js and npm
- PostgreSQL
- Git

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/helpdesk-ticket-system.git
cd helpdesk-ticket-system
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the project root.

Use `.env.example` as the template and update the values
to match your local PostgreSQL database and JWT configuration.

Never commit real passwords, tokens, or JWT secrets.

### 4. Set Up PostgreSQL

Create the database configured in `DATABASE_URL`.

Then run:

```bash
npx prisma generate
npx prisma migrate deploy
```

Set up the required user accounts and categories before
testing protected functionality.

### 5. Start Backend

```bash
node app.js
```

Backend URL:

http://localhost:3000

### 6. Install Frontend Dependencies

Open a second terminal:

```bash
cd frontend
npm install
```

### 7. Start Frontend

```bash
npm run dev
```

Frontend URL:

http://localhost:5173

The development proxy forwards `/api` requests to the Backend.

## Automated Tests

From the project root:

```bash
node --test
```

## Frontend Quality Checks

From the `frontend` directory:

```bash
npm run lint
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

Preview URL:

http://localhost:4173

## Deployment Notes

The frontend requires a reachable Express backend and
a configured PostgreSQL database.

A production deployment must route `/api` requests to
the backend service and configure HTTPS.

The current authentication approach uses sessionStorage
for the portfolio demonstration. A production deployment
should use an appropriately secured session strategy.

## Security

- Authentication using JWT
- Role-based authorization enforced on the server
- Password hashing
- Request validation
- Protected ADMIN endpoints
- Secrets stored outside the source code

## Project Status

Full-stack portfolio project with implemented ticket
CRUD, ADMIN workflows, React frontend, and API tests.

## Future Improvements

- Server-side pagination
- File attachments
- Email notifications
- Audit logging
- Secure cookie-based sessions
- CI/CD pipeline
- Cloud deployment
```
