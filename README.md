# 🚀 Easy Code Assistant

An **offline AI-powered coding assistant for Visual Studio Code** that integrates with **LM Studio** and local LLMs to provide intelligent code explanations, debugging, and automated patch generation.

Unlike cloud-based coding assistants, Easy Code Assistant runs **completely offline**, ensuring privacy, zero API costs, and fast local inference.

---

# ✨ Features

## 💬 AI Chat

- Ask programming questions
- Explain code
- Learn concepts
- Refactor code
- Generate code snippets

---

## 🐞 AI Debugging

- Detect errors from VS Code diagnostics
- Send relevant code context to the local LLM
- Generate structured patch JSON
- Preview changes before applying
- Apply fixes with one click

---

## 📄 Diff Preview

Before modifying your code, the extension displays a diff view so you can review the proposed changes.

---

## 🔒 Offline First

Runs entirely on your local machine using:

- LM Studio
- Local LLMs
- No cloud APIs
- No internet required

---

# 🏗 Architecture

```
VS Code Extension
        │
        ▼
extension.ts
        │
        ▼
Flask Backend
        │
        ▼
OpenAI Compatible API
(LM Studio)
        │
        ▼
Qwen2.5-Coder-3B-Instruct
        │
        ▼
Patch JSON
        │
        ▼
Apply Patch
```

---

# 🛠 Tech Stack

- TypeScript
- Visual Studio Code Extension API
- Flask
- Python
- OpenAI Python SDK
- LM Studio
- Qwen2.5-Coder
- HTML
- JavaScript

---

# 📦 Installation

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/easy-code-assistant.git
```

---

## Install Python dependencies

```bash
pip install -r requirements.txt
```

---

## Install VS Code dependencies

```bash
npm install
```

---

## Start LM Studio

Load your preferred coding model.

Example:

- Qwen2.5-Coder-3B-Instruct-MLX

Start the local server.

Default endpoint:

```
http://localhost:1234/v1
```

---

## Run Flask

```bash
python app.py
```

---

## Run Extension

Open the project in VS Code.

Press

```
F5
```

to launch the Extension Development Host.

---

# 📂 Project Structure

```
Easy-Code-Assistant/

├── app.py
├── src/
│   └── extension.ts
├── webview/
│   └── chat.html
├── package.json
├── requirements.txt
└── README.md
```

---

# 🚀 Current Features (Version 1)

- Offline AI Chat
- AI Debugging
- Patch JSON generation
- Diff Preview
- One-click Patch Apply
- Streaming Responses
- LM Studio Integration

---

# 🗺 Roadmap

## Version 2

- Multi-error fixing
- Improved patch matching
- Faster patch application

---

## Version 3

- Project indexing
- Multi-file context
- Smarter code understanding

---

## Version 4

- Automatic verification
- Retry failed patches
- Ruff integration
- Pyright integration

---

## Version 5

- AI Agent
- Repository understanding
- Multi-file editing

---

# 🤝 Contributing

Contributions are welcome!

Feel free to submit issues or pull requests.

---

# 📜 License

MIT License