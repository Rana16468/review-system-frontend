# 🎓 Assignment Review System: Frontend

A modern, responsive web client for the **Assignment Review & Management System**. Mentors create and review assignments, students submit their work and track feedback, and admins manage the platform, all through a clean role-based dashboard.

Built with **Next.js**, **TypeScript**, **Redux**, **Tailwind CSS** and **shadcn/ui**, and connected to a **Node.js + Express + Prisma + PostgreSQL** REST API.

| | |
| --- | --- |
| 🌐 **Live Demo** | _add your deployed frontend URL here_ |
| ⚙️ **Backend Repository** | [Rana16468/review-backend](https://github.com/Rana16468/review-backend) |
| 🔗 **Backend API** | https://review-backend-bay.vercel.app |

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Screenshots](#-screenshots)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture & Design Decisions](#-architecture--design-decisions)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [Deployment](#-deployment)
- [What I Learned](#-what-i-learned)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)

---

## 🧭 Overview

This is the user-facing half of a full-stack assignment management platform. It gives each type of user a tailored experience:

| Role | What they can do in the UI |
| --- | --- |
| 👑 **Admin** | Manage users, block or unblock accounts, oversee the whole system |
| 🧑‍🏫 **Mentor** | Create assignments for a batch, set deadlines, review submissions, give marks and feedback |
| 🧑‍🎓 **Student** | Browse assignments, submit work before the deadline, view marks and mentor feedback |

### The workflow

```
Mentor creates assignment ─► Student submits work ─► Mentor reviews (marks + feedback) ─► Student sees result
```

---

## 📸 Screenshots

> Add screenshots or a short GIF of your app here. Recruiters love visuals.

| Login | Mentor Dashboard | Student Dashboard |
| --- | --- | --- |
| `![Login](./docs/login.png)` | `![Mentor](./docs/mentor.png)` | `![Student](./docs/student.png)` |

---

## ✨ Key Features

- 🔐 **Authentication**: secure login and registration with JWT-based sessions
- 🧭 **Role-based dashboards**: separate interfaces and protected routes for Admin, Mentor and Student
- 📝 **Assignment management**: create, edit and delete assignments with title, description, batch and deadline
- 📤 **Work submission**: students submit once per assignment, with notes and description
- ✅ **Review workflow**: mentors grade submissions, write feedback and update status (`SUBMITTED`, `REVIEWED`, `REJECTED`)
- 📊 **Status tracking**: clear visual badges for submission state and deadlines
- 🚫 **Account control**: admins can activate or block users
- 🗂 **Global state management** with Redux for auth and shared data
- 🎨 **Accessible, reusable UI components** from shadcn/ui
- 📱 **Fully responsive** layout, mobile first, built with Tailwind CSS
- ⚡ **Fast navigation and SEO-friendly rendering** thanks to Next.js

---

## 🛠 Tech Stack

| Category | Technology |
| --- | --- |
| Framework | [Next.js](https://nextjs.org/) |
| Language | TypeScript |
| UI Library | React |
| State Management | Redux |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Component Library | [shadcn/ui](https://ui.shadcn.com/) |
| API | REST API (Express + Prisma + PostgreSQL backend) |
| Deployment | Vercel |

---

## 🏗 Architecture & Design Decisions

- **Next.js** gives file-based routing, layouts and fast page loads, which suits a multi-role dashboard app well.
- **Redux** holds app-wide state such as the logged-in user, role and token, so every page can read it without prop drilling.
- **Tailwind CSS + shadcn/ui** make the UI consistent and fast to build: components live in the codebase, so they are fully customizable.
- **Role-based route protection** keeps each dashboard reachable only by the right user type.
- **Separation of concerns**: UI components, state, API calls and types are kept in separate folders.

**Data flow**

```
UI Component ─► Redux action / API call ─► Backend REST API ─► PostgreSQL
      ▲                                           │
      └────────────── Redux store ◄───────────────┘
```

---

## 📁 Project Structure

> Adjust this tree to match your actual folders.

```
review-system-frontend/
├── public/                  # Static assets
├── src/
│   ├── app/                 # Next.js routes and layouts
│   │   ├── (auth)/          # Login / register
│   │   ├── admin/           # Admin dashboard
│   │   ├── mentor/          # Mentor dashboard
│   │   └── student/         # Student dashboard
│   ├── components/          # Reusable UI components
│   │   └── ui/              # shadcn/ui components
│   ├── redux/               # Store, slices and API logic
│   ├── lib/                 # Helpers and utilities
│   ├── types/               # TypeScript types
│   └── ...
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) (or yarn / pnpm)
- [Git](https://git-scm.com/)
- The **backend running locally or deployed**. See the [backend repository](https://github.com/Rana16468/review-backend).

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/Rana16468/review-system-frontend.git
cd review-system-frontend
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Create a `.env.local` file in the project root (see [below](#-environment-variables)).

**4. Start the development server**

```bash
npm run dev
```

**5. Open the app**

Visit [http://localhost:3000](http://localhost:3000) 🎉

> 💡 Start the backend first (`npm run dev` in the backend project), otherwise API requests will fail.

---

## 🔧 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Backend API base URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

# Or use the deployed backend
# NEXT_PUBLIC_API_URL=https://review-backend-bay.vercel.app/api/v1
```

> ⚠️ Use the variable name and API path your code actually reads. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser, so never put secrets in them.

---

## 📜 Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create an optimized production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |

---

## ☁️ Deployment

The easiest way to deploy is **Vercel**:

1. Push the project to GitHub.
2. Import the repository on [Vercel](https://vercel.com/).
3. Add the environment variables (`NEXT_PUBLIC_API_URL`).
4. Click **Deploy**.

Make sure the backend allows your frontend domain in its **CORS** settings.

---

## 📚 What I Learned

- Structuring a **multi-role application** with protected routes in Next.js
- Managing global state cleanly with **Redux**
- Building a consistent, accessible UI quickly with **shadcn/ui** and **Tailwind CSS**
- Integrating a **TypeScript frontend with a modular REST backend**
- Handling authentication flows and role-based UI rendering

---

## 🗺 Roadmap

- [ ] Dark mode
- [ ] Notifications for new assignments and reviewed submissions
- [ ] File attachments for submissions
- [ ] Search, filters and pagination for assignments
- [ ] Analytics dashboard for mentors and admins

---

## 🤝 Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**.

---

## 👤 Author

**Rana** · [@Rana16468](https://github.com/Rana16468)

⭐ If you like this project, please give it a star!