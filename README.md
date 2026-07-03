# 🎓 StudyMate AI

> Your personal AI-powered study partner — built for students, responds in Hinglish, and helps with everything from notes to career guidance!

![StudyMate Banner](https://img.shields.io/badge/StudyMate-AI%20Study%20Partner-blueviolet?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.14-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green?style=for-the-badge&logo=fastapi)
![Groq](https://img.shields.io/badge/Groq-LLM%20API-orange?style=for-the-badge)
![Kiro IDE](https://img.shields.io/badge/Kiro-AI%20IDE-ff69b4?style=for-the-badge)

---

## ✨ What is StudyMate AI?

StudyMate AI is a smart chatbot web app designed specifically for students. Unlike generic AI tools like ChatGPT or Gemini, StudyMate:

- 💬 Responds in **Hinglish** (Hindi + English mix) — the way students actually talk
- 📚 Focuses on **student needs** — notes, MCQs, career, code, resume
- 🖼️ Supports **file & image uploads** — analyze documents and photos
- 📷 Has a **live camera** option to click and analyze photos directly
- 🎓 Features an **animated anime-style character** on the login page
- 🔐 Has a beautiful **animated login/signup page**

---

## 🖥️ Screenshots

### Login Page
- Animated blue-hair anime girl character
- Floating particles & glowing orbs background
- Speech bubble expressions that change dynamically

### Chat Interface
- Dark themed chat UI
- Sidebar with quick action shortcuts
- File/image upload + camera support
- Typing indicator animation

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 💬 Hinglish Chat | AI responds in natural Hinglish |
| 📚 Topic Explainer | Any topic explained simply |
| 📝 Notes Summarizer | Paste notes → get bullet points |
| ❓ MCQ Generator | Topic → 10 practice questions |
| 🚀 Career Roadmap | Personalized learning paths |
| 📄 Resume Review | Feedback on your resume |
| 💻 Code Helper | Debug & explain code |
| 🎯 Interview Prep | Mock interview questions |
| 📎 PDF/DOCX Upload | Analyze documents with AI |
| 🖼️ Image Upload | AI analyzes uploaded images |
| 📷 Camera Capture | Take photo & analyze instantly |
| 🎓 Anime Login Page | Animated character with expressions |

---

## 🛠️ Tech Stack

| Tool | Purpose |
|------|---------|
| Python 3.14 | Backend language |
| FastAPI | REST API framework |
| Strands Agents | AI Agent framework |
| Groq API (Llama 3.3 70B) | Free LLM provider |
| LiteLLM | Model interface layer |
| PyPDF2 | PDF text extraction |
| python-docx | DOCX text extraction |
| HTML / CSS / JavaScript | Frontend |
| **Kiro IDE** | AI-powered development environment |

---

## 🖥️ IDE Used — Kiro

This entire project was built using **[Kiro](https://kiro.dev)** — an advanced AI-powered IDE.

Kiro helped with:
- 🐛 Debugging errors in natural language
- ⚙️ Setting up the environment step by step
- 📝 Writing and refactoring code with AI
- 🚀 Git commits and GitHub push automation
- 💡 Feature planning and implementation

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+
- Free Groq API key from [console.groq.com](https://console.groq.com)

### 1. Clone the Repository

```bash
git clone https://github.com/Kashish-saini415/StudyMate-AI.git
cd StudyMate-AI
```

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure API Key

Create a `.env` file inside the `backend/` folder:

```
GROQ_API_KEY=your_groq_api_key_here
```

Get your free key from 👉 [console.groq.com](https://console.groq.com)

### 4. Start the Backend

```bash
cd backend
python -m uvicorn main:app --reload
```

Backend will run at: `http://127.0.0.1:8000`

### 5. Open the Frontend

Open `frontend/login.html` in your browser — and you're good to go! 🎉

---

## 📁 Project Structure

```
StudyMate-AI/
├── backend/
│   ├── main.py              # FastAPI server + AI Agent
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # API keys (not pushed to GitHub)
├── frontend/
│   ├── login.html           # Animated login page with anime character
│   ├── index.html           # Main chat interface
│   ├── style.css            # Dark theme styling
│   └── script.js            # Chat logic + file upload + camera
└── README.md
```

---

## ⚠️ Important

Never push your `.env` file to GitHub. It contains your API key. The `.gitignore` already handles this.

---

## 👩‍💻 Author

**Kashish Saini**
GitHub: [@Kashish-saini415](https://github.com/Kashish-saini415)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
