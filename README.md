# 🚀 SwasthaParivar

> A full-stack health & family management platform designed to simplify healthcare tracking, reminders, and AI-powered assistance.

---

## 📌 Overview

**SwasthaParivar** is a modern full-stack application that helps users manage:

* 👨‍👩‍👧‍👦 Family members
* 🏥 Health records
* ⏰ Medicine reminders
* 🤖 AI-based health assistance

---

## 🏗️ Project Structure

```
SwasthaParivar/
│
├── backend/     # Node.js + Express API
├── frontend/    # React (Vite) frontend
└── .gitignore
```

---

## ⚙️ Tech Stack

### 🔹 Frontend

* React (Vite)
* Tailwind CSS
* Axios

### 🔹 Backend

* Node.js
* Express.js
* MongoDB (Mongoose)

### 🔹 Other

* JWT Authentication
* Cron Jobs (Reminders)
* AI Integration (Gemini API)

---

## 🚀 Features

* ✅ User Authentication (JWT)
* ✅ Add & manage family members
* ✅ Health tracking system
* ✅ Smart reminders (cron-based)
* ✅ AI-powered health assistant
* ✅ Notifications support

---

## 🛠️ Setup Instructions

### 1️⃣ Clone the repository

```bash
git clone https://github.com/pds-37/SwasthaParivar.git
cd SwasthaParivar
```

---

### 2️⃣ Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret
GEMINI_API_KEY=your_key
```

Run backend:

```bash
npm start
```

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Environment Variables

### Backend (.env)

* `MONGO_URI` → MongoDB connection string
* `JWT_SECRET` → Authentication secret
* `GEMINI_API_KEY` → AI integration key

---

## 📦 Deployment

* Frontend → Vercel
* Backend → Render / Node server
* Database → MongoDB Atlas

---

## 📈 Future Improvements

* 🔔 Push notifications
* 📊 Health analytics dashboard
* 🧠 Advanced AI insights
* 📱 Mobile app version

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repo and submit a PR.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Priyanshu (pds-37)**
GitHub: https://github.com/pds-37

---
