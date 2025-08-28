# KAI‑Fusion

**Build AI Agents & Workflows, Visually — Python backend • React frontend • PostgreSQL**

[![License](https://img.shields.io/github/license/kafein-product-space/KAI-Fusion)](./LICENSE)
![GitHub Repo stars](https://img.shields.io/github/stars/kafein-product-space/KAI-Fusion?style=social)
![GitHub forks](https://img.shields.io/github/forks/kafein-product-space/KAI-Fusion?style=social)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

KAI‑Fusion is an open‑source, Flowise‑like visual workflow builder. It ships with a **Python FastAPI** backend, a **React (Vite)** frontend, and a **PostgreSQL** database. You can self‑host locally with Docker or run a classic dev stack (Python venv + Node + Postgres).

---

## 🎬 Showcase

<!-- Inline demo video (GitHub renders HTML) -->

<video src="https://github.com/kafein-product-space/KAI-Fusion/blob/readme/gif.mov?raw=1" width="100%" autoplay loop muted playsinline controls></video>

<!-- Screenshot -->

<p>
  <img src="https://github.com/kafein-product-space/KAI-Fusion/blob/readme/demo.png?raw=1" alt="KAI‑Fusion Demo" width="100%" />
</p>

---

### 🔗 Quick Links

* **Website (Preview)**: [https://kai-fusion-blond.vercel.app](https://kai-fusion-blond.vercel.app)
* **API Docs (local)**: [http://localhost:8000/docs](http://localhost:8000/docs) (FastAPI Swagger UI)
* **Star / Fork**: [https://github.com/kafein-product-space/KAI-Fusion](https://github.com/kafein-product-space/KAI-Fusion)

---

## 📚 Table of Contents

* ⚡ Quick Start (TL;DR)
* 🐘 PostgreSQL (Docker)
* 🔐 Environment Variables

  * Backend **migrations** `.env`
  * Backend runtime `.env`
  * Frontend `.env`
* 🧪 Local Development (Python venv / Conda)
* 🧭 VS Code Debugging (`.vscode/launch.json`)
* 🐳 Docker (Compose & Images)
* 🧱 Project Structure
* ✨ App Overview (What you can build)
* 📊 Repository Stats (⭐ Stars & ⬇️ Downloads)
* 🙌 Contributing (with user icons)
* 🆘 Troubleshooting
* 🤝 Code of Conduct
* 📝 License

---

## ⚡ Quick Start (TL;DR)

**Prerequisites**

* **Python** ≥ 3.10
* **Node.js** ≥ 18.15 (Vite)
* **Docker** & **Docker Compose**

```bash
# 1) Start Postgres 15 in Docker (change values if you like)
docker run --name kai \
  -e POSTGRES_DB=kai \
  -e POSTGRES_USER=kai \
  -e POSTGRES_PASSWORD=kai \
  -p 5432:5432 -d postgres:15

# 2) Create env files (see sections below for full content)
#    - backend/migrations/.env
#    - backend/.env

# 3) Create virtual environment & install backend deps
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r backend/requirements.txt

# 4) Initialize DB schema (runs inside your local machine)
python backend/migrations/database_setup.py

# 5) Run backend (choose one)
# a) VS Code debug (recommended) — see launch.json section below
# b) Or direct
python backend/app.py

# 6) Frontend
# create client/.env as shown below
cd client && npm install && npm run dev
# Open the printed Vite URL (e.g. http://localhost:5173)
```

> **Tip:** Replace all `kai` defaults (DB name/user/password) for your own environment in production.

---

## 🐘 PostgreSQL (Docker)

Run a local Postgres 15 instance. Feel free to change container name/ports.

```bash
docker run --name kai \
  -e POSTGRES_DB=kai \
  -e POSTGRES_USER=kai \
  -e POSTGRES_PASSWORD=kai \
  -p 5432:5432 -d postgres:15
```

* Container: `kai`
* Host port: `5432` → Container port: `5432`
* Default DB: `kai` (change if you want)

---

## 🔐 Environment Variables

KAI‑Fusion uses **two backend `.env` files** and **one frontend `.env`**.

> **Path note:** In your editor, `${workspaceFolder}` refers to the repository root.

### 1) Backend **migrations** `.env`

Create: `backend/migrations/.env`

```dotenv
ASYNC_DATABASE_URL=postgresql+asyncpg://kai:kai@localhost:5432/kai
DATABASE_URL=postgresql://kai:kai@localhost:5432/kai
CREATE_DATABASE=true
```

### 2) Backend runtime `.env`

Create: `backend/.env`

```dotenv
ASYNC_DATABASE_URL=postgresql+asyncpg://kai:kai@localhost:5432/kai
DATABASE_URL=postgresql://kai:kai@localhost:5432/kai
CREATE_DATABASE=false
POSTGRES_DB=kai
POSTGRES_PASSWORD=kai

# LangSmith / LangChain tracing (optional but recommended for debugging)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key
LANGCHAIN_PROJECT=kai-fusion-workflows
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
ENABLE_WORKFLOW_TRACING=true
TRACE_MEMORY_OPERATIONS=true
TRACE_AGENT_REASONING=true
```

### 3) Frontend `.env`

Create: `client/.env`

```dotenv
# Frontend env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_VERSION=/api/v1
VITE_NODE_ENV=development
VITE_ENABLE_LOGGING=true
```

---

## 🧪 Local Development (Python venv / Conda)

You can use **venv** or **conda**. Below are both options.

### Option A — venv (recommended for simplicity)

```bash
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows (PowerShell)
.venv\\Scripts\\Activate.ps1

pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Option B — Conda

```bash
conda create -n kai-fusion python=3.10 -y
conda activate kai-fusion
pip install -r backend/requirements.txt
```

### Initialize the Database Schema

Ensure your Postgres container is running, then:

```bash
python backend/migrations/database_setup.py
```

### Run the Backend

* **Via VS Code Debugger** (see next section), or
* **Directly**: `python backend/app.py`

### Run the Frontend

```bash
cd client
npm install
npm run dev
# Open the printed Vite URL (e.g. http://localhost:5173)
```

---

## 🧭 VS Code Debugging (`.vscode/launch.json`)

Create the folder: `.vscode/` at the repository root and add `launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Backend Main",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/backend/app.py",
      "console": "integratedTerminal",
      "env": { "DOTENV_PATH": "${workspaceFolder}/backend/.env" }
    }
  ]
}
```

> If you use the VS Code Python extension’s `envFile` feature instead, you can set `"envFile": "${workspaceFolder}/backend/.env"`.

---

## 🐳 Docker

### Docker Compose (recommended)

If your repo includes a `docker-compose.yml` at the root, simply run:

```bash
docker compose up -d
```

Then open the printed URLs:

* Frontend: e.g. [http://localhost:5173](http://localhost:5173) or [http://localhost:3000](http://localhost:3000)
* Backend: [http://localhost:8000](http://localhost:8000) (Swagger: `/docs`)

Stop containers:

```bash
docker compose stop
```

### Build & Run Images Manually

```bash
# Build the app image from the project root
docker build --no-cache -t kai-fusion:latest .

# Run (example for backend image; adjust ports/envs to your Dockerfile)
docker run -d --name kai-fusion \
  -p 8000:8000 \
  --env-file backend/.env \
  kai-fusion:latest
```

---

## 🧱 Project Structure

```
KAI-Fusion/
├─ backend/
│  ├─ app.py                # FastAPI entrypoint
│  ├─ requirements.txt
│  ├─ .env                  # Backend runtime env
│  └─ migrations/
│     ├─ database_setup.py  # Initializes DB schema
│     └─ .env               # Migrations env
├─ client/
│  ├─ src/
│  ├─ index.html
│  └─ .env                  # Frontend env
├─ docker/                  # (Optional) Docker files
├─ .vscode/
│  └─ launch.json
└─ docs/
   └─ media/                # GIFs/screenshots (optional)
```

---

## ✨ App Overview (What you can build)

* **Visual AI Workflows**: Drag‑and‑drop nodes (LLM, tools, retrievers, memory, agents). Wire inputs/outputs, set parameters, and persist runs.
* **Observability**: Toggle **LangChain/LangSmith** tracing using the env flags provided (great for debugging prompts and tool calls).
* **PostgreSQL Persistence**: Store workflows, runs, artifacts, and user data in Postgres.
* **REST API**: The backend exposes API routes under `/api/v1` (see Swagger UI at `/docs`).

**Sample Flow (like Flowise):**

1. Drop an **LLM** node.
2. Add a **Retriever** node (vector store) and connect to the LLM.
3. Add a **Tool** node (e.g., Web Search or Custom Python tool).
4. Wire outputs → inputs, set prompts, and click **Run**.
5. Watch logs & traces; iterate quickly.

---

## 📊 Repository Stats (⭐ Stars & ⬇️ Downloads)

### ⭐ Star History (auto‑updated)

[![Star History Chart](https://api.star-history.com/svg?repos=kafein-product-space/KAI-Fusion\&type=Date)](https://star-history.com/#kafein-product-space/KAI-Fusion)

### ⬇️ Downloads — Badges & Table

| Metric                     | Badge                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **All releases (total)**   | ![All Downloads](https://img.shields.io/github/downloads/kafein-product-space/KAI-Fusion/total?label=All%20downloads)                      |
| **Latest release (total)** | ![Latest Release Downloads](https://img.shields.io/github/downloads/kafein-product-space/KAI-Fusion/latest/total?label=Latest%20downloads) |
| **Stars (live)**           | ![GitHub Repo stars](https://img.shields.io/github/stars/kafein-product-space/KAI-Fusion?style=social)                                     |
| **Forks (live)**           | ![GitHub forks](https://img.shields.io/github/forks/kafein-product-space/KAI-Fusion?style=social)                                          |

> If you don’t publish releases yet, the download badges will show `0` — that’s expected.

#### 📈 Optional: Downloads Trend Chart (GitHub Action)

Once you add the workflow below, embed:

```md
![Downloads Trend](./docs/media/downloads-trend.svg)
```

**.github/workflows/downloads-chart.yml**

```yaml
name: Generate Downloads Chart
on:
  schedule: [{ cron: "0 3 * * 1" }]  # every Monday 03:00 UTC
  workflow_dispatch:
permissions:
  contents: write
jobs:
  build-chart:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install deps
        run: pip install requests matplotlib
      - name: Build chart
        env:
          GH_OWNER: kafein-product-space
          GH_REPO: KAI-Fusion
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          python .github/scripts/build_downloads_chart.py
      - name: Commit chart
        uses: EndBug/add-and-commit@v9
        with:
          add: docs/media/downloads-trend.svg
          message: "chore(stats): update downloads trend chart"
```

**.github/scripts/build\_downloads\_chart.py**

```python
import os, requests, datetime
import matplotlib.pyplot as plt

OWNER = os.environ["GH_OWNER"]
REPO = os.environ["GH_REPO"]
TOKEN = os.environ.get("GH_TOKEN")
HEAD = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}

releases = requests.get(
    f"https://api.github.com/repos/{OWNER}/{REPO}/releases",
    headers=HEAD
).json()

points = []
for r in releases:
    t = sum(a.get("download_count", 0) for a in r.get("assets", []))
    created = r.get("created_at")
    if created:
        dt = datetime.datetime.fromisoformat(created.replace("Z", "+00:00")).date()
        points.append((dt, t))

points.sort()
if not points:
    points = [(datetime.date.today(), 0)]

dates = [p[0] for p in points]
vals = [p[1] for p in points]

plt.figure(figsize=(7,3))
plt.plot(dates, vals, marker='o')
plt.title('Release Downloads per Release')
plt.xlabel('Release date')
plt.ylabel('Downloads')
plt.tight_layout()
os.makedirs('docs/media', exist_ok=True)
plt.savefig('docs/media/downloads-trend.svg')
```

#### 📊 Extra: Repo Activity (Repobeats)

```md
![Repobeats analytics](https://repobeats.axiom.co/api/embed/kafein-product-space/KAI-Fusion.svg)
```

---

## 🙌 Contributing (with user icons)

We welcome PRs! Please:

1. Open an issue describing the change/bug.
2. Fork → create a feature branch.
3. Add/adjust tests where applicable.
4. Open a PR with a clear description and screenshots/GIFs.

### 👥 Contributors (facepile)

<a href="https://github.com/kafein-product-space/KAI-Fusion/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=kafein-product-space/KAI-Fusion" alt="Contributors" />
</a>

### ⭐ Stargazers & 🍴 Forkers (user icons)

[![Stargazers repo roster for @kafein-product-space/KAI-Fusion](https://reporoster.com/stars/kafein-product-space/KAI-Fusion)](https://github.com/kafein-product-space/KAI-Fusion/stargazers)
[![Forkers repo roster for @kafein-product-space/KAI-Fusion](https://reporoster.com/forks/kafein-product-space/KAI-Fusion)](https://github.com/kafein-product-space/KAI-Fusion/network/members)

> The images above update automatically as your community grows.

---

## 🆘 Troubleshooting

**Port 5432 already in use**

* Stop any existing Postgres: `docker ps`, then `docker stop <container>`
* Or change the host port mapping: `-p 5433:5432`

**Cannot connect to Postgres**

* Verify envs in both `backend/.env` and `backend/migrations/.env`
* Ensure container is healthy: `docker logs kai`

**Migrations didn’t run / tables missing**

* Re-run: `python backend/migrations/database_setup.py`
* Ensure `CREATE_DATABASE=true` in **migrations** `.env` (and `false` in runtime `.env`)

**Frontend cannot reach backend**

* Check `client/.env` → `VITE_API_BASE_URL=http://localhost:8000`
* CORS: ensure backend CORS is configured for your dev origin

**VS Code doesn’t load env**

* Using our snippet? Make sure your app reads `DOTENV_PATH`
* Alternative: VS Code `"envFile": "${workspaceFolder}/backend/.env"`

---

## 🤝 Code of Conduct

Please follow our [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md) to keep the community welcoming.

---

## 📝 License

Source code is available under the **Apache License 2.0** (see [`LICENSE`](./LICENSE)).

---

### ℹ️ Repo Meta (auto‑generated by GitHub)

> The GitHub UI shows live stars, forks, contributors, deployments, and language breakdown.

* Stars, watchers, forks: via badges above
* Contributors facepile: auto‑updated via contrib.rocks
* Star history: auto‑updated via star‑history.com
