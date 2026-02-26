# College Grievance Reporting System (MERN)

A minimal MERN starter for a college grievance workflow with three roles:

- `student`: submits grievances (image + description + department)
- `staff`: department-level handling and live progress updates
- `admin`: committee approval/rejection at college level

## Workflow

1. Student creates grievance in a department.
2. System assigns the grievance to that department's staff.
3. Staff notifies admin committee for review.
4. Admin approves or rejects.
5. Staff updates live status and posts progress messages.
6. Student sees real-time updates.

## Tech Stack

- Frontend: React + Vite + Axios + Socket.IO client
- Backend: Node.js + Express + MongoDB (Mongoose) + JWT + Multer + Socket.IO

## Project Structure

- `server/` Express API + MongoDB models
- `client/` React UI

## Setup

### Backend

```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```

### Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

## Seeded Demo Accounts

After `npm run seed`:

- Admin: `admin@college.edu` / `Admin@123`
- Staff (CS): `staff.cs@college.edu` / `Staff@123`
- Staff (EC): `staff.ec@college.edu` / `Staff@123`
- Student: `student@college.edu` / `Student@123`

## College ID Security

Account creation now validates against authorized college IDs by role:

- Student register: `STU-YYYY-NNNN`
- Staff create (admin only): `STF-DEPT-NNN`
- Admin create (admin only): `ADM-NNNN`

IDs must exist in the `collegeidentities` collection and be unclaimed.
`npm run seed` preloads a pool of IDs, including available examples:

- Students: `STU-2026-0002`, `STU-2026-0003`
- Staff: `STF-CS-002`, `STF-EC-002`, `STF-COMMERCE-002` (and others)
- Admins: `ADM-1002`, `ADM-1003`

## Core API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/admin/create-user` (admin only; create staff/admin)
- `GET /api/departments`
- `POST /api/grievances` (student, image upload)
- `GET /api/grievances` (role-filtered)
- `PATCH /api/grievances/:id/notify-admin` (staff)
- `PATCH /api/grievances/:id/admin-approval` (admin)
- `POST /api/grievances/:id/updates` (staff)

## Database Collections (Tables)

- `users`
- `departments`
- `grievances`
- `statusupdates`
