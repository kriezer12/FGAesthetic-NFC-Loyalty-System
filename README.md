# GLAM-ID Team Onboarding Guide

## 🚀 Getting Started for New Team Members

This guide will help you set up the project on your local machine and start working on tasks.

---

## Prerequisites

Install these first:

- **Git** - https://git-scm.com/downloads
- **Docker Desktop** - https://www.docker.com/products/docker-desktop/
- **Node.js** (v18+) - https://nodejs.org/
- **Python** (3.10+) - https://www.python.org/downloads/
- **VS Code** (recommended) - https://code.visualstudio.com/

Verify installations:
```bash
git --version
docker --version
node --version
python --version
```

---

## Step 1: Clone the Repository

```bash
# Navigate to your workspace
cd C:\Users\YourName\Desktop\Workspace

# Clone the repository
git clone https://github.com/YourOrg/FGAesthetic-NFC-Loyalty-System.git

# Enter the project
cd FGAesthetic-NFC-Loyalty-System

# Switch to dev branch
git checkout dev

# Pull latest changes
git pull origin dev
```

---

## Step 2: Set Up Environment Variables

### Backend (.env)

Create `backend/.env` file:

```env
# Supabase Configuration (Ask team lead for actual values)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# App Configuration
JWT_SECRET=your_secret_key_here
```

**⚠️ IMPORTANT:** 
- **DO NOT commit** the `.env` file to Git
- Ask your team lead for the actual values
- Each team member should create their own `.env` file


## Step 3: Start the Project with Docker

### Option A: Using Docker (Recommended - Easiest)

```bash
# Make sure Docker Desktop is running

ON YOUR VSCODE TERMINAL
# Start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

**What this does:**
- Builds backend container
- Builds frontend container
- Starts both services
- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:5173`

**To stop:**
```bash
docker-compose down
```

---

## Step 4: Alternative - Run Without Docker

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

ON TERMINAL
python -m app.main
```

Backend will be available at `http://localhost:5000`

### Frontend Setup (New Terminal)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install -D tailwindcss@3 postcss autoprefixer react-router-dom
npx tailwindcss init

# Run development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## Step 5: Verify Everything Works

### Check Backend
Open browser to: `http://localhost:5000/`

### Check Frontend
Open browser to: `http://localhost:5173`

You should see the GLAM-ID login page.

---

## Step 6: Create Your Feature Branch

**NEVER work directly on `dev` or `main` branch!**

```bash
# Make sure you're on dev
git checkout dev

# Pull latest changes
git pull origin dev

# Create your feature branch
git checkout -b feature/your-task-name

# Examples:
# git checkout -b feature/client-registration
# git checkout -b feature/nfc-scanner
# git checkout -b feature/loyalty-points
```

---

## Step 7: Working on Your Task

### Daily Workflow

```bash
# 1. Start your day - pull latest changes
git checkout dev
git pull origin dev

# 2. Switch to your feature branch
git checkout feature/your-task-name

# 3. Merge latest dev changes into your branch
git merge dev

# 4. Start Docker or local servers
docker-compose up

# 5. Code your feature
# ... do your work ...

# 6. Test your changes
# Make sure everything works!

# 7. Commit your changes
git add {file to push}
git commit -m "feat(scope): description of what you did"

# 8. Push to your feature branch
git push origin feature/your-task-name
```

### When You're Ready to Merge

```bash
# 1. Make sure your code is committed
git status

# 2. Pull latest dev changes
git checkout dev
git pull origin dev

# 3. Go back to your branch
git checkout feature/your-task-name

# 4. Merge dev into your branch (resolve conflicts if any)
git merge dev

# 5. Push your branch
git push origin feature/your-task-name

# 6. Create Pull Request on GitHub
# Go to GitHub → Your branch → "Create Pull Request"
# Request review from team lead
---

## Git Commit Message Convention

Use this format:

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `chore` - Maintenance
- `docs` - Documentation
- `style` - Code formatting
- `refactor` - Code restructuring
- `test` - Adding tests

---

## Branch Naming Convention

```
feature/task-name       # New features
fix/bug-description     # Bug fixes
chore/maintenance-task  # Maintenance
docs/documentation      # Documentation

Examples:
osorio-feature/client-registration
molina-feature/loyalty-dashboard
delavega-fix/nfc-timeout-error
devera-chore/update-react-version
caling-docs/api-endpoints
```

---

## Need Help?

1. **Check GitHub Issues** - Someone might have had the same problem
2. **Ask in Team Chat** - Don't hesitate to ask questions
3. **Check Documentation** - `docs/` folder has detailed guides
4. **Ask Team Lead** - For environment variables and access

---

## Quick Commands Reference

```bash
# Start project
docker-compose up

# Stop project
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up --build

# Check git status
git status

# Pull latest changes
git pull origin dev

# Create new branch
git checkout -b feature/task-name

# Commit changes
git add .
git commit -m "feat: description"

# Push changes
git push origin feature/task-name
```

---

## Checklist Before Starting

- [ ] Git installed
- [ ] Docker Desktop installed and running
- [ ] Node.js installed
- [ ] Python installed
- [ ] Repository cloned
- [ ] On `dev` branch
- [ ] `.env` files created (ask team lead for values)
- [ ] Docker containers running successfully
- [ ] Can access backend (`http://localhost:5000`)
- [ ] Can access frontend (`http://localhost:5173`)
- [ ] Created your feature branch
- [ ] Ready to code! 🚀

---

## Important Rules

❌ **NEVER commit:**
- `.env` files
- `node_modules/`
- `__pycache__/`
- Personal API keys

❌ **NEVER push directly to:**
- `main` branch
- `dev` branch

✅ **ALWAYS:**
- Work on feature branches
- Pull latest changes before starting
- Test your code before committing
- Write clear commit messages
- Create Pull Requests for review

---

Good luck and happy coding! 🎉

