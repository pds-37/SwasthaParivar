<div align="center">

<img src="https://img.shields.io/badge/SwasthaParivar-Family%20Health%20Platform-4CAF50?style=for-the-badge&logo=heart&logoColor=white" alt="SwasthaParivar" />


**A full-stack family health management platform.**  
Organize reminders, reports, member records, health snapshots, and AI-guided care — all in one connected workspace.

<br/>

[🚀 Live App](https://swastha-parivar.vercel.app) · [🔍 Backend Health](https://swasthaparivar-v1.onrender.com/health) · [📖 Docs](#local-setup) · [🐛 Issues](https://github.com/pds-37/SwasthaParivar/issues)

</div>

---

## 📸 Screenshots

> Replace the placeholder links below with your actual screenshot URLs once uploaded to `/assets` or an image host.

### Dashboard & Family Overview
![Dashboard](https://via.placeholder.com/1200x650/1a1a2e/4CAF50?text=Dashboard+–+Family+Overview)

### Health Snapshots & Vitals
![Health Snapshots](https://via.placeholder.com/1200x650/1a1a2e/4CAF50?text=Health+Snapshots+%26+Vitals+Tracker)

### AI Health Advisor
![AI Chat](https://via.placeholder.com/1200x650/1a1a2e/4CAF50?text=AI+Health+Advisor+Chat)

### Reminders & Reports
| Reminders | Reports |
|-----------|---------|
| ![Reminders](https://via.placeholder.com/580x380/1a1a2e/4CAF50?text=Reminder+Scheduler) | ![Reports](https://via.placeholder.com/580x380/1a1a2e/4CAF50?text=Report+Upload+%26+AI+Summary) |

---

## 🩺 The Problem

Family healthcare is usually scattered across WhatsApp chats, paper reports, missed reminders, and one person's memory. Most health apps are either single-user trackers, basic reminder apps, or generic AI chatbots.

**SwasthaParivar solves this** by creating a shared family care system where reminders, reports, records, and AI guidance all work together — with member-specific context throughout.

---

## ✨ Core Features

<table>
<tr>
<td width="50%">

### 👨‍👩‍👧 Family Profiles
Each member tracks:
- Name, age, gender, relationship
- Existing conditions & allergies
- Current medications
- Child-sensitive & pregnancy flags

</td>
<td width="50%">

### 📊 Health Records
Monitor over time:
- Blood pressure & heart rate
- Blood sugar & weight
- Sleep quality & daily steps

</td>
</tr>
<tr>
<td>

### 🔔 Smart Reminders
Supports:
- Medicine, vaccination & checkup reminders
- Custom recurrence schedules
- Member-specific scheduling
- Google Calendar handoff

</td>
<td>

### 📄 Report Management
- Upload medical reports
- Link reports to family members
- AI-generated summaries
- Invalid upload rejection logic

</td>
</tr>
</table>

---

## 🤖 AI Layer

The AI assistant is **intentionally health-focused** — not a general chatbot.

Built on **Google Gemini** with structured family context injection:

| Capability | Description |
|---|---|
| 🧠 Family context injection | Personalised to each member's profile |
| 🔒 Health-only scope | Redirects unrelated queries back to health topics |
| 📋 Reminder extraction | Detects and creates reminders from conversation |
| 📑 Report review | Summarises and validates uploaded reports |
| 💬 Conversation memory | Maintains context across the session |
| 💡 AI insight storage | Persists key guidance for future reference |

---

## 🛠 Tech Stack

<table>
<tr>
<th>Frontend</th>
<th>Backend</th>
<th>AI / Platform</th>
</tr>
<tr>
<td>

![React](https://img.shields.io/badge/-React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/-Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![MUI](https://img.shields.io/badge/-MUI-007FFF?style=flat-square&logo=mui&logoColor=white)
![React Router](https://img.shields.io/badge/-React%20Router-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![Axios](https://img.shields.io/badge/-Axios-5A29E4?style=flat-square&logo=axios&logoColor=white)
![SWR](https://img.shields.io/badge/-SWR-000000?style=flat-square)

</td>
<td>

![Node.js](https://img.shields.io/badge/-Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/-Express-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/-MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Zod](https://img.shields.io/badge/-Zod-3E67B1?style=flat-square)
![Helmet](https://img.shields.io/badge/-Helmet-black?style=flat-square)

</td>
<td>

![Gemini](https://img.shields.io/badge/-Google%20Gemini-4285F4?style=flat-square&logo=google&logoColor=white)
![Google OAuth](https://img.shields.io/badge/-Google%20OAuth-EA4335?style=flat-square&logo=google&logoColor=white)
![Vercel](https://img.shields.io/badge/-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/-Render-46E3B7?style=flat-square&logo=render&logoColor=black)
![Sentry](https://img.shields.io/badge/-Sentry-362D59?style=flat-square&logo=sentry&logoColor=white)
![Redis](https://img.shields.io/badge/-Redis%20(optional)-DC382D?style=flat-square&logo=redis&logoColor=white)

</td>
</tr>
</table>

---

## 📁 Project Structure

```text
Swastha Parivar/
├── SwasthaParivar-Frontend-main/
│   └── SwasthaParivar-Frontend-main/
├── SwasthaParivar-Backend-main/
│   └── SwasthaParivar-Backend-main/
├── APP_QA_PLAYBOOK.md
├── CHANGES.md
└── DEPLOYMENT.md
```

---

## 🚀 Local Setup

### 1. Clone the repo
```bash
git clone https://github.com/pds-37/SwasthaParivar.git
cd SwasthaParivar
```

### 2. Install dependencies
```bash
# Frontend
cd SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main
npm install

# Backend
cd ../../SwasthaParivar-Backend-main/SwasthaParivar-Backend-main
npm install
```

### 3. Configure environment variables

**Backend `.env`**
```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
COOKIE_SAME_SITE=strict
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
REDIS_URL=
```

**Frontend `.env.local`**
```env
VITE_API_URL=http://localhost:5000/api
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VITE_SENTRY_DSN=
VITE_APP_VERSION=frontend-local
```

### 4. Run the app

```bash
# Start backend (http://localhost:5000)
cd SwasthaParivar-Backend-main/SwasthaParivar-Backend-main
npm run dev

# Start frontend (http://localhost:5173)
cd SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main
npm run dev
```

> Health check: `http://localhost:5000/health`

---

## ☁️ Deployment

### Frontend → Vercel
```env
VITE_API_URL=https://your-backend-domain/api
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VITE_SENTRY_DSN=your_frontend_sentry_dsn
VITE_APP_VERSION=frontend-production
```

### Backend → Render
```env
NODE_ENV=production
PORT=10000
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
COOKIE_SAME_SITE=none
CORS_ORIGINS=https://your-frontend-domain
CLIENT_URLS=https://your-frontend-domain
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-backend-domain/api/auth/google/callback
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
SENTRY_DSN=your_backend_sentry_dsn
SENTRY_ENVIRONMENT=production
REDIS_URL=your_redis_url_optional
```

---

## 🔑 Google OAuth Setup

1. Create a Google OAuth Web Client in [Google Console](https://console.cloud.google.com)
2. Add your frontend origin under **Authorized JavaScript Origins**
3. Add your backend callback under **Authorized Redirect URIs**
4. Set home, privacy, and terms URLs under Google Branding
5. Add your Gmail as a test user while the app is in testing mode

Public legal pages are available at `/privacy` and `/terms`.

---

## 🔒 Security

| Layer | Implementation |
|---|---|
| Auth | httpOnly cookies · Access + refresh token flow |
| Passwords | bcrypt hashing |
| Validation | Zod schema enforcement on all requests |
| Rate limiting | Per-route middleware + optional Redis |
| Network | CORS allowlist · Helmet security headers |
| Uploads | File type & size validation |
| AI scope | Health-only restriction enforced at prompt level |
| Monitoring | Structured Pino logging · Optional Sentry |

---

## ⚠️ Disclaimer

SwasthaParivar is a health **organisation and guidance** platform. It does not replace a licensed doctor, formal diagnosis, emergency care, or professional medical treatment.

---

## 👤 Author

Built by **[Priyanshu Tiwari](https://github.com/pds-37)**

---

## 📄 License


This project is licensed under the MIT License.

---

<div align="center">
  <sub>If you found this useful, consider giving it a ⭐</sub>
</div>
