# FG Aesthetic NFC Loyalty System

Full-stack loyalty card system with NFC integration for beauty clinics. Features customer management, points tracking, and seamless NFC card scanning for quick check-ins.

## Features

- 🎫 **NFC Card Scanning** - Tap-to-identify using USB NFC readers (keyboard HID)
- 👥 **Customer Management** - Full customer database with search, filters, and pagination
- ⭐ **Points & Rewards** - Track loyalty points and visit history
- 📋 **Beauty Clinic Fields** - Skin type, allergies, emergency contacts
- 🔐 **Secure Auth** - Supabase authentication with email/password
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

**Frontend:** React 19 + Vite 7 + Tailwind CSS 4 + shadcn/ui  
**Backend:** Flask + Supabase (PostgreSQL)  
**Auth:** Supabase Auth (Email/Password + Google OAuth)  
**NFC:** USB HID readers (keyboard emulation - no special drivers needed)

---

## Quick Start with Docker

### Prerequisites
- Docker Desktop installed ([download](https://www.docker.com/products/docker-desktop))
- Supabase account ([signup](https://supabase.com))

### Setup

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd FGAesthetic-NFC-Loyalty-System
```

2. **Create `.env` file in project root:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

3. **Create `.env` file in frontend folder:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. **Start the application:**
```bash
docker-compose up --build
```

5. **Access the app:**
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

6. **Default Routes:**
- `/login` - Login page
- `/signup` - Registration page
- `/dashboard` - Main NFC scanner dashboard
- `/dashboard/customers` - Customer management

---

## Local Development (without Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m app.main
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Package init
│   │   ├── main.py              # Flask app factory
│   │   ├── config.py            # Environment config
│   │   ├── routes/              # API route blueprints
│   │   └── services/
│   │       └── supabase_client.py  # Supabase client
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx             # App entry point & routes
│   │   ├── login.jsx            # Login page
│   │   ├── signup.jsx           # Signup page
│   │   ├── dashboard.tsx        # Main dashboard with NFC scanner
│   │   ├── customers.tsx        # Customers list page
│   │   ├── components/
│   │   │   ├── app-sidebar.tsx  # Navigation sidebar
│   │   │   ├── nfc-scanner.tsx  # NFC card scanning component
│   │   │   ├── customer-info.tsx # Customer details & points
│   │   │   ├── register-card.tsx # New card registration form
│   │   │   ├── login-form.tsx   # Login form with Supabase auth
│   │   │   ├── signup-form.tsx  # Signup form with Supabase auth
│   │   │   └── ui/              # shadcn/ui components
│   │   ├── hooks/
│   │   │   └── use-mobile.ts    # Mobile detection hook
│   │   └── lib/
│   │       ├── supabase.ts      # Supabase client
│   │       └── utils.ts         # Utility functions
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## NFC Reader Setup

This system works with any USB NFC reader that operates in **keyboard HID mode** (most common type). When a card is tapped, the reader types the card's UID directly into the focused input field.

**Supported readers:** ACR122U, ACR1252U, or any HID keyboard-emulating NFC reader.

**How it works:**
1. User navigates to the NFC Scanner page
2. The input field automatically stays focused
3. User taps their NFC card on the reader
4. Reader types the 10-digit UID + Enter
5. System looks up the card in the database
6. If found → Shows customer info with points management
7. If not found → Opens registration form for new customer

---

---


**Status flags**

A few concepts are used in the UI for filtering clients:

* **Active** – not archived and not flagged as inactive (see below).
* **Inactive** – last visit is more than ~60 days old (or never visited) and not archived.
* **Archived** – `archived_at` is non‑null (soft deleted). Archived clients are hidden unless the
 filter is explicitly set.

## API Endpoints

### Health Check
- `GET /health` - Returns `{"status": "healthy"}`
- `GET /` - API information

### Authentication
Authentication is handled directly by Supabase Auth on the frontend.
The backend validates Supabase JWT tokens for protected routes.

---

## Team Workflow

### For New Team Members

1. Install Docker Desktop
2. Clone repo
3. Get `.env` credentials from team lead
4. Run `docker-compose up --build`
5. Access app at `http://localhost`

### Making Changes

**Backend changes:**
- Edit files in `backend` folder
- Restart container: `docker-compose restart backend`

**Frontend changes:**
- Edit files in `frontend/src`
- Rebuild: `docker-compose up --build frontend`

**Restart containers:**
```bash
docker-compose restart
```

**Rebuild after dependency changes:**
```bash
docker-compose up --build
```

**Stop containers:**
```bash
docker-compose down
```

---

## Docker Commands

```bash
# Start everything
docker-compose up

# Start in background (detached)
docker-compose up -d

# Rebuild after code changes
docker-compose up --build

# Stop everything
docker-compose down

# View logs
docker-compose logs -f

# Restart a single service
docker-compose restart backend
docker-compose restart frontend
```

---

## Environment Variables

### Root `.env` (for Docker)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### Frontend `.env`
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Troubleshooting

**Port conflicts:**
```bash
docker-compose down
docker-compose up
```

**Database connection issues:**
- Verify Supabase credentials in `.env`
- Check Supabase project status

**CORS errors:**
- Ensure backend `FRONTEND_URL` matches frontend URL
- Check Flask-CORS configuration in `backend/app/main.py`

---

## License

MIT
