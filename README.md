# FG Aesthetic NFC Loyalty System

Full-stack loyalty card system with NFC integration.

## Tech Stack

**Frontend:** React 19 + Vite + Tailwind CSS  
**Backend:** Flask + Supabase (PostgreSQL)  
**Auth:** JWT with bcrypt hashing

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

2. **Create `.env` file in root:**
```bash
cp .env
```

Edit `.env` with your Supabase credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-generated-secret
```

3. **Start the application:**
```bash
docker-compose up --build
```

4. **Access the app:**
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # Flask app
│   │   ├── config.py            # Settings
│   │   ├── routes/
│   │   │   └── auth.py          # Auth endpoints
│   │   └── services/
│   │       ├── supabase_client.py
│   │       └── auth_service.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   └── services/
│   │       └── api.js           # Backend API calls
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

**Register Example:**
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepass",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAi...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

## Team Workflow

### For New Team Members

1. Install Docker Desktop
2. Clone repo
3. Get `.env` credentials from team lead
4. Run `docker-compose up --build`
5. Access app at `http://localhost:5173`

### Making Changes

**Backend changes:**
- Edit files in `backend` folder
- Flask auto-reloads (no restart needed)

**Frontend changes:**
- Edit files in `frontend/src`
- Vite hot-reloads automatically

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
