from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import config
from app.services.supabase_client import get_supabase

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt (truncates to 72 bytes)"""
    return pwd_context.hash(password[:72])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password[:72], hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=config.JWT_EXPIRATION_HOURS)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def register_user(email: str, password: str, name: str) -> Optional[dict]:
    """Register a new user"""
    supabase = get_supabase()
    hashed_password = hash_password(password)

    try:
        response = supabase.table("users").insert({
            "email": email,
            "password_hash": hashed_password,
            "name": name
        }).execute()

        if response.data:
            user = response.data[0]
            user.pop("password_hash", None)  # Don't return password hash
            return user
        return None
    except Exception as e:
        print(f"Registration error: {e}")
        return None


def authenticate_user(email: str, password: str) -> Optional[dict]:
    """Authenticate a user with email and password"""
    supabase = get_supabase()

    try:
        response = supabase.table("users").select("*").eq("email", email).execute()

        if not response.data:
            return None

        user = response.data[0]

        if not verify_password(password, user["password_hash"]):
            return None

        # Don't return password hash
        user.pop("password_hash", None)
        return user

    except Exception as e:
        print(f"Authentication error: {e}")
        return None
