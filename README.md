# TeamFlow Sync

TeamFlow — Lovable Build Prompt

Build a team task and notes management SaaS app called "TeamFlow".

Core structure

Users belong to an "organization" (workspace). Each organization has its own tasks, notes, and files.

A user can belong to multiple organizations.

Two roles: "admin" and "member". Admins can manage organization settings and invite/remove members; members can only create and edit tasks/notes.

Authentication

Email/password signup and login.

Password reset flow (email with reset link).

Organization invites: an admin can send an invite link to an email address; whoever signs up via that link is automatically added to that organization.

Task management

Within an organization, users can create task lists and tasks.

Each task has a detail page reachable at a URL like /task/:id.

Tasks support comments, an assignee, and a status (todo / in progress / done).

Notes and file sharing

Users can create notes and share a note via a "public share link" (viewable without logging in).

File upload: users can attach files to a task or note; files are stored within the organization.

Notifications

When a task is assigned to a user, send them an email notification (use an email-sending service/API integration for this).

Admin panel

Admin users get a separate "/admin" page: they can see all members of the organization, all tasks, and usage stats.

Design

Clean, modern SaaS interface (left sidebar for workspace/organization switching, top tabs for Tasks / Notes / Admin).

Use Supabase as the backend and database, and Supabase Auth for authentication.

Build order

Build this step by step: first auth and organization structure, then task management, then note sharing, and finally the admin panel.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6b5f7d22-e430-4425-9529-71c928ca0237).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
