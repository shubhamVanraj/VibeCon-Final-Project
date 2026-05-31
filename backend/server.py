from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt as pyjwt
import httpx
import math
import tempfile
from collections import defaultdict
import time
import re

# Pluggable provider adapters (credit bureau, account aggregator)
from services.credit_bureau import get_credit_provider
from services.account_aggregator import get_aa_provider, ConsentRequest as AAConsentReqModel
from services.recommendation import calculate_approval_probability

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configuration
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== SECURITY: RATE LIMITER ====================
class RateLimiter:
    """In-memory rate limiter with sliding window."""
    def __init__(self):
        self.requests = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int) -> tuple:
        now = time.time()
        self.requests[key] = [t for t in self.requests[key] if now - t < window_seconds]
        if len(self.requests[key]) >= max_requests:
            retry_after = int(window_seconds - (now - self.requests[key][0]))
            return False, max(1, retry_after)
        self.requests[key].append(now)
        return True, 0

rate_limiter = RateLimiter()

# Rate limit configs: (max_requests, window_seconds)
RATE_LIMITS = {
    "login": (5, 900),          # 5 per 15 min
    "register": (10, 3600),     # 10 per hour
    "otp": (5, 600),            # 5 per 10 min
    "api_default": (60, 60),    # 60 per min
    "export": (2, 86400),       # 2 per day
    "chat": (20, 60),           # 20 per min
}

# ==================== SECURITY: INPUT SANITIZATION ====================
DANGEROUS_PATTERNS = re.compile(
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|WHERE|SET)\b)|"
    r"(<script[\s>]|javascript:|on\w+\s*=)",
    re.IGNORECASE
)

def sanitize_input(value: str) -> str:
    if not isinstance(value, str):
        return value
    if len(value) > 10000:
        raise HTTPException(status_code=400, detail="Input too long")
    if DANGEROUS_PATTERNS.search(value):
        raise HTTPException(status_code=400, detail="Invalid input")
    return value.strip()

# ==================== SECURITY: AUDIT LOGGER ====================
async def audit_log(action: str, user_id: str = None, record_type: str = None,
                    record_id: str = None, ip: str = None, details: dict = None):
    """Append-only audit log. No update/delete operations on this collection."""
    await db.audit_logs.insert_one({
        "audit_id": f"aud_{uuid.uuid4().hex[:12]}",
        "action": action,
        "user_id": user_id,
        "record_type": record_type,
        "record_id": record_id,
        "ip": ip,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

# ==================== MIDDLEWARE ====================
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # Rate limit all API requests by IP
    if request.url.path.startswith("/api"):
        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()

        # Skip health check
        if request.url.path == "/api/health":
            return await call_next(request)

        # Apply endpoint-specific rate limits
        limit_key = "api_default"
        if "/auth/login" in request.url.path:
            limit_key = "login"
        elif "/auth/register" in request.url.path or "/bank/register" in request.url.path:
            limit_key = "register"
        elif "/auth/otp" in request.url.path or "/auth/login-otp" in request.url.path:
            limit_key = "otp"
        elif "/ai/chat" in request.url.path:
            limit_key = "chat"
        elif "/export" in request.url.path:
            limit_key = "export"

        max_req, window = RATE_LIMITS[limit_key]
        allowed, retry_after = rate_limiter.check(f"{ip}:{limit_key}", max_req, window)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
                headers={"Retry-After": str(retry_after)}
            )

    response = await call_next(request)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    return response

# Global exception handler — never expose stack traces
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    logger.error(f"Unhandled error on {request.url.path}: {type(exc).__name__}")
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred. Please try again."})



# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfileUpdate(BaseModel):
    loan_type: Optional[str] = None
    monthly_income: Optional[float] = None
    employment_type: Optional[str] = None
    employer_name: Optional[str] = None
    employer_type: Optional[str] = None  # psu, gcc, private, govt, defence
    city: Optional[str] = None
    state: Optional[str] = None
    existing_loans: Optional[bool] = None
    existing_loan_emi: Optional[float] = None
    credit_score_known: Optional[bool] = None
    credit_score: Optional[int] = None
    desired_amount: Optional[float] = None
    desired_tenure_months: Optional[int] = None

class LeadCreate(BaseModel):
    product_id: str
    bank_name: str
    product_name: str

class AiSuggestRequest(BaseModel):
    message: str
    language: Optional[str] = "en"

class TranslateRequest(BaseModel):
    text: str
    target_language: str

class PublicChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en"
    session_id: Optional[str] = None

class BankRegister(BaseModel):
    bank_name: str
    contact_person: str
    email: str
    password: str
    phone: Optional[str] = None
    loan_types_offered: List[str] = []
    branch_locations: List[str] = []
    corporate_tieups: List[str] = []
    min_rate: Optional[float] = None
    max_rate: Optional[float] = None
    commission_pct: Optional[float] = 1.0
    description: Optional[str] = None

class BankProductCreate(BaseModel):
    product_name: str
    loan_type: str
    interest_rate: float
    processing_fee_pct: float = 1.0
    max_amount: float = 5000000
    min_amount: float = 50000
    max_tenure_months: int = 60
    min_tenure_months: int = 12
    foreclosure_charge_pct: float = 0
    min_income: float = 0
    min_credit_score: int = 0
    features: List[str] = []
    available_regions: List[str] = ["pan_india"]
    corporate_tieups: List[str] = []

class LoanApplicationCreate(BaseModel):
    lead_id: str
    full_name: str
    phone: str
    pan_number: Optional[str] = None
    employment_details: Optional[str] = None
    monthly_income: Optional[float] = None
    loan_amount_requested: Optional[float] = None
    loan_purpose: Optional[str] = None
    residence_type: Optional[str] = None  # owned, rented, family
    years_at_current_job: Optional[int] = None


class CreditScoreFetchRequest(BaseModel):
    pan: Optional[str] = None
    consent: bool = True   # User must explicitly consent to credit-bureau pull


class AAConsentRequest(BaseModel):
    fi_types: List[str] = ["DEPOSIT"]
    purpose_code: str = "101"
    purpose_text: Optional[str] = "Personal loan underwriting"
    valid_for_days: int = 90
    fetch_history_months: int = 12


class AAConsentIdRequest(BaseModel):
    consent_id: str




# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "type": "access"
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="lax", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ==================== ANALYTICS HELPER ====================

async def log_event(database, event_type, data=None, user_id=None):
    """Log an analytics event to the database"""
    event = {
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "event_type": event_type,
        "data": data or {},
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await database.analytics_events.insert_one(event)


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "picture": None,
        "auth_type": "email",
        "role": "user",
        "language": "en",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    await log_event(db, "user_registered", {"email": email, "user_id": user_id, "method": "email"})

    return {
        "user_id": user_id, "email": email, "name": data.name,
        "role": "user", "auth_type": "email", "has_profile": False
    }


@api_router.post("/auth/login")
async def login(data: UserLogin, request: Request, response: Response):
    email = data.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # Brute force check - 5 attempts, 15 min lockout
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("attempts", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until:
            if isinstance(locked_until, str):
                locked_until = datetime.fromisoformat(locked_until)
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if locked_until > datetime.now(timezone.utc):
                await log_event(db, "login_blocked", {"email": email, "ip": ip, "reason": "brute_force"})
                raise HTTPException(status_code=429, detail="Too many attempts. Please wait 15 minutes.")
        # Lockout expired, clear it
        await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"attempts": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()}},
            upsert=True
        )
        await log_event(db, "login_fail", {"email": email, "ip": ip, "reason": "invalid_email"})
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(data.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"attempts": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()}},
            upsert=True
        )
        await log_event(db, "login_fail", {"email": email, "ip": ip, "reason": "wrong_password"})
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})

    profile = await db.user_profiles.find_one({"user_id": user["user_id"], "onboarding_complete": True})
    has_profile = profile is not None

    access_token = create_access_token(user["user_id"], email)
    refresh_token = create_refresh_token(user["user_id"])
    set_auth_cookies(response, access_token, refresh_token)

    await log_event(db, "login_success", {"email": email, "user_id": user["user_id"], "method": "password"})
    await audit_log("login_success", user["user_id"], "user", user["user_id"], ip)

    return {
        "user_id": user["user_id"], "email": user["email"], "name": user["name"],
        "role": user.get("role", "user"), "auth_type": user.get("auth_type", "email"),
        "has_profile": has_profile, "language": user.get("language", "en")
    }


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@api_router.delete("/auth/delete-account")
async def delete_account(request: Request, response: Response):
    user = await get_current_user(request)
    uid = user["user_id"]

    # Delete all user data (DPDP Act compliance)
    await db.users.delete_one({"user_id": uid})
    await db.user_profiles.delete_one({"user_id": uid})
    await db.leads.delete_many({"user_id": uid})
    await db.loan_applications.delete_many({"user_id": uid})
    await db.analytics_events.delete_many({"user_id": uid})
    await db.login_otps.delete_many({"email": user.get("email")})
    await db.password_reset_tokens.delete_many({"email": user.get("email")})

    await log_event(db, "account_deleted", {"user_id": uid, "email": user.get("email")})
    await audit_log("account_deleted", uid, "user", uid)

    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Account and all data deleted successfully"}



# ==================== CONSENT & DATA EXPORT (DPDP/GDPR) ====================

@api_router.post("/consent")
async def store_consent(request: Request):
    body = await request.json()
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    consent_doc = {
        "consent_id": f"con_{uuid.uuid4().hex[:12]}",
        "user_id": body.get("user_id"),
        "consent_type": body.get("type", "cookies_analytics"),
        "granted": body.get("granted", True),
        "ip": ip,
        "user_agent": request.headers.get("user-agent", "")[:200],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.consents.insert_one(consent_doc)
    return {"status": "ok"}

@api_router.get("/user/export-data")
async def export_user_data(request: Request):
    """DPDP Act: User can export all their data as JSON."""
    user = await get_current_user(request)
    uid = user["user_id"]

    # Rate limit: 2 exports per day
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    allowed, retry_after = rate_limiter.check(f"{uid}:export", 2, 86400)
    if not allowed:
        raise HTTPException(status_code=429, detail="Export limit reached. Try again tomorrow.", headers={"Retry-After": str(retry_after)})

    profile = await db.user_profiles.find_one({"user_id": uid}, {"_id": 0})
    leads = await db.leads.find({"user_id": uid}, {"_id": 0}).to_list(100)
    applications = await db.loan_applications.find({"user_id": uid}, {"_id": 0}).to_list(100)
    consents = await db.consents.find({"user_id": uid}, {"_id": 0}).to_list(100)

    await audit_log("data_export", uid, "user", uid, ip)

    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user": {k: v for k, v in user.items() if k != "password_hash"},
        "profile": profile,
        "leads": leads,
        "applications": applications,
        "consents": consents,
    }

# ==================== AUDIT LOG ADMIN ====================

@api_router.get("/admin/audit-logs")
async def get_audit_logs(request: Request, limit: int = 50, action: Optional[str] = None):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    query = {}
    if action:
        query["action"] = action
    # Cap at 100 records per request (scraping protection)
    safe_limit = min(limit, 100)
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(safe_limit)
    total = await db.audit_logs.count_documents(query)
    return {"logs": logs, "total": total, "limit": safe_limit}




@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    profile = await db.user_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    user["has_profile"] = profile is not None and profile.get("onboarding_complete", False)
    return user


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        new_access = create_access_token(user["user_id"], user["email"])
        response.set_cookie(key="access_token", value=new_access, httponly=True, secure=True, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api_router.post("/auth/google-callback")
async def google_callback(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        session_data = resp.json()

    email = session_data["email"].lower()
    name = session_data.get("name", "")
    picture = session_data.get("picture", "")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "password_hash": None,
            "name": name, "picture": picture, "auth_type": "google",
            "role": "user", "language": "en",
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    profile = await db.user_profiles.find_one({"user_id": user_id, "onboarding_complete": True})
    has_profile = profile is not None

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return {
        "user_id": user_id, "email": email, "name": name,
        "role": "user", "auth_type": "google", "has_profile": has_profile
    }


# ==================== FORGOT / RESET PASSWORD ====================

@api_router.post("/auth/login-otp-request")
async def login_otp_request(request: Request):
    body = await request.json()
    identifier = body.get("identifier", "").lower().strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Email or mobile number required")
    user = await db.users.find_one({"email": identifier}, {"_id": 0})
    if not user:
        return {"message": "If the account exists, an OTP has been sent."}
    import secrets as sec
    otp = ''.join([str(sec.randbelow(10)) for _ in range(6)])
    await db.login_otps.delete_many({"identifier": identifier, "used": False})
    await db.login_otps.insert_one({
        "otp": otp, "user_id": user["user_id"], "identifier": identifier,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "used": False, "created_at": datetime.now(timezone.utc).isoformat()
    })
    logger.info(f"Login OTP generated for user_hash:{hash(identifier) % 10000}")
    return {"message": "If the account exists, an OTP has been sent.", "debug_otp": otp}


@api_router.post("/auth/login-otp-verify")
async def login_otp_verify(request: Request, response: Response):
    body = await request.json()
    identifier = body.get("identifier", "").lower().strip()
    otp = body.get("otp", "").strip()
    if not identifier or not otp:
        raise HTTPException(status_code=400, detail="Identifier and OTP required")
    token_doc = await db.login_otps.find_one(
        {"identifier": identifier, "otp": otp, "used": False}, {"_id": 0}
    )
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    expires_at = token_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired")
    user = await db.users.find_one({"user_id": token_doc["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    await db.login_otps.update_one(
        {"identifier": identifier, "otp": otp}, {"$set": {"used": True}}
    )
    profile = await db.user_profiles.find_one({"user_id": user["user_id"], "onboarding_complete": True})
    has_profile = profile is not None
    access_token = create_access_token(user["user_id"], user["email"])
    refresh_token = create_refresh_token(user["user_id"])
    set_auth_cookies(response, access_token, refresh_token)
    return {
        "user_id": user["user_id"], "email": user["email"], "name": user["name"],
        "role": user.get("role", "user"), "auth_type": user.get("auth_type", "email"),
        "has_profile": has_profile, "language": user.get("language", "en")
    }


# ==================== FORGOT / RESET PASSWORD (continued) ====================

@api_router.post("/auth/forgot-password")
async def forgot_password(request: Request):
    body = await request.json()
    email = body.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        return {"message": "If the email exists, a reset code has been sent."}

    import secrets as sec
    otp = ''.join([str(sec.randbelow(10)) for _ in range(6)])
    await db.password_reset_tokens.delete_many({"email": email, "used": False})
    await db.password_reset_tokens.insert_one({
        "token": otp,
        "user_id": user["user_id"],
        "email": email,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    logger.info(f"Password reset OTP generated for user_hash:{hash(email) % 10000}")
    return {"message": "If the email exists, a reset code has been sent.", "debug_otp": otp}


@api_router.post("/auth/reset-password")
async def reset_password(request: Request):
    body = await request.json()
    email = body.get("email", "").lower().strip()
    otp = body.get("otp", "").strip()
    new_password = body.get("new_password", "")

    if not email or not otp or not new_password:
        raise HTTPException(status_code=400, detail="Email, OTP, and new password are required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    token_doc = await db.password_reset_tokens.find_one(
        {"email": email, "token": otp, "used": False}, {"_id": 0}
    )
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    expires_at = token_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset code has expired")

    await db.users.update_one(
        {"user_id": token_doc["user_id"]},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    await db.password_reset_tokens.update_one(
        {"email": email, "token": otp},
        {"$set": {"used": True}}
    )
    return {"message": "Password reset successfully"}


# ==================== CREDIT SCORE — Pluggable Bureau Adapter ====================

@api_router.get("/credit-score/check")
async def check_credit_score(request: Request):
    """
    Fetch the latest credit-score report for the logged-in user using the
    configured CreditBureauProvider (mock by default; set CREDIT_BUREAU_PROVIDER
    env var to swap to live CIBIL/Experian/Decentro once creds are provisioned).
    """
    user = await get_current_user(request)

    # Get user PAN from profile (if available) to pass to bureau
    profile = await db.user_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}

    provider = get_credit_provider()
    try:
        report = await provider.fetch_score(
            user_id=user["user_id"],
            pan=profile.get("pan_number"),
            phone=user.get("phone"),
            full_name=user.get("name"),
            dob=profile.get("dob"),
        )
    except NotImplementedError as e:
        # Live provider configured but adapter not wired yet
        return {
            "status": "unavailable",
            "message": str(e),
            "providers": [
                {"name": "CIBIL", "url": "https://www.cibil.com/freecibilscore"},
                {"name": "Experian", "url": "https://www.experian.in/consumer/free-credit-score"},
                {"name": "Equifax", "url": "https://www.equifax.co.in"},
            ],
        }

    # Persist latest report for the user (overwrites previous)
    await db.credit_reports.update_one(
        {"user_id": user["user_id"]},
        {"$set": report.to_dict()},
        upsert=True,
    )
    await audit_log(
        action="credit_score_fetched",
        user_id=user["user_id"],
        record_type="credit_report",
        ip=request.client.host if request.client else None,
        details={"provider": report.provider, "is_mock": report.is_mock, "score": report.score},
    )
    return report.to_dict()


@api_router.get("/credit-score/report")
async def get_credit_report(request: Request):
    """Return the last cached credit report for the logged-in user (no live pull)."""
    user = await get_current_user(request)
    report = await db.credit_reports.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="No credit report yet. Run /credit-score/check first.")
    return report


# ==================== ACCOUNT AGGREGATOR (Sahamati AA Framework) ====================

@api_router.post("/aa/consent/request")
async def aa_request_consent(data: AAConsentRequest, request: Request):
    """
    Step 1 — Initiate consent with the configured AA (mock/Finvu/OneMoney).
    Returns a `consent_handle` and `redirect_url` the user must visit to approve.
    """
    user = await get_current_user(request)
    provider = get_aa_provider()
    handle = await provider.request_consent(AAConsentReqModel(
        user_id=user["user_id"],
        fi_types=data.fi_types,
        purpose_code=data.purpose_code,
        purpose_text=data.purpose_text or "Personal loan underwriting",
        valid_for_days=data.valid_for_days,
        fetch_history_months=data.fetch_history_months,
    ))
    await db.aa_consents.insert_one(handle.to_dict())
    await audit_log(
        action="aa_consent_requested",
        user_id=user["user_id"],
        record_type="aa_consent",
        record_id=handle.consent_handle,
        ip=request.client.host if request.client else None,
        details={"provider": handle.provider, "fi_types": handle.fi_types},
    )
    return handle.to_dict()


@api_router.get("/aa/consent/status/{consent_handle}")
async def aa_consent_status(consent_handle: str, request: Request):
    """Step 2 — Poll consent status. Returns APPROVED + consent_id once user has authenticated."""
    user = await get_current_user(request)
    provider = get_aa_provider()
    try:
        handle = await provider.get_consent_status(consent_handle)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    if handle.user_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="Consent belongs to a different user")
    await db.aa_consents.update_one(
        {"consent_handle": consent_handle},
        {"$set": handle.to_dict()},
    )
    return handle.to_dict()


@api_router.post("/aa/fi-data/fetch")
async def aa_fetch_fi_data(data: AAConsentIdRequest, request: Request):
    """Step 3 — Pull FI Data once consent is APPROVED."""
    user = await get_current_user(request)
    consent_id = data.consent_id

    # Validate consent belongs to this user and is APPROVED
    consent = await db.aa_consents.find_one(
        {"consent_id": consent_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    if consent.get("status") not in ("APPROVED",):
        raise HTTPException(status_code=400, detail=f"Consent not approved (status={consent.get('status')})")

    provider = get_aa_provider()
    packet = await provider.fetch_financial_data(consent_id=consent_id, user_id=user["user_id"])
    await db.aa_fi_data.update_one(
        {"user_id": user["user_id"], "consent_id": consent_id},
        {"$set": packet.to_dict()},
        upsert=True,
    )
    await audit_log(
        action="aa_fi_data_fetched",
        user_id=user["user_id"],
        record_type="aa_fi_data",
        record_id=packet.session_id,
        ip=request.client.host if request.client else None,
        details={"provider": packet.provider, "is_mock": packet.is_mock},
    )
    return packet.to_dict()


@api_router.post("/aa/consent/revoke")
async def aa_revoke_consent(data: AAConsentIdRequest, request: Request):
    """User exercises right to revoke AA consent (DPDP / AA spec)."""
    user = await get_current_user(request)
    consent_id = data.consent_id

    consent = await db.aa_consents.find_one(
        {"consent_id": consent_id, "user_id": user["user_id"]}
    )
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")

    provider = get_aa_provider()
    result = await provider.revoke_consent(consent_id)
    await db.aa_consents.update_many(
        {"consent_id": consent_id},
        {"$set": {"status": "REVOKED",
                  "revoked_at": datetime.now(timezone.utc).isoformat()}},
    )
    await audit_log(
        action="aa_consent_revoked",
        user_id=user["user_id"],
        record_type="aa_consent",
        record_id=consent_id,
        ip=request.client.host if request.client else None,
    )
    return result


# ==================== USER PROFILE ====================

@api_router.get("/user/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    profile = await db.user_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        return {"user_id": user["user_id"], "onboarding_complete": False}
    return profile


@api_router.put("/user/profile")
async def update_profile(data: UserProfileUpdate, request: Request):
    user = await get_current_user(request)
    profile_data = data.model_dump(exclude_none=True)
    profile_data["user_id"] = user["user_id"]
    profile_data["onboarding_complete"] = True
    profile_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.user_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": profile_data, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    profile = await db.user_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    await log_event(db, "profile_updated", {"loan_type": profile_data.get("loan_type")}, user["user_id"])
    return profile
@api_router.put("/user/language")
async def update_language(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    language = body.get("language", "en")
    if language not in ["en", "hi"]:
        raise HTTPException(status_code=400, detail="Unsupported language")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"language": language}})
    return {"language": language}


# ==================== LOAN RECOMMENDATION ====================

def calculate_emi(principal, annual_rate, tenure_months):
    if annual_rate == 0:
        return principal / tenure_months
    monthly_rate = annual_rate / (12 * 100)
    emi = principal * monthly_rate * math.pow(1 + monthly_rate, tenure_months) / (math.pow(1 + monthly_rate, tenure_months) - 1)
    return emi

def calculate_total_cost(principal, annual_rate, tenure_months, processing_fee_pct, foreclosure_pct=0):
    emi = calculate_emi(principal, annual_rate, tenure_months)
    total_interest = (emi * tenure_months) - principal
    processing_fee = principal * processing_fee_pct / 100
    return {
        "emi": round(emi, 2),
        "total_interest": round(total_interest, 2),
        "processing_fee": round(processing_fee, 2),
        "total_cost": round(principal + total_interest + processing_fee, 2),
        "foreclosure_charge_pct": foreclosure_pct
    }

# Approval probability scoring lives in services/recommendation.py
# (extracted Feb 2026 for testability + readability).


@api_router.get("/loans/products")
async def get_loan_products(loan_type: Optional[str] = None, region: Optional[str] = None):
    query = {"is_active": True}
    if loan_type:
        query["loan_type"] = loan_type
    products = await db.loan_products.find(query, {"_id": 0}).to_list(200)
    if region:
        r_lower = region.lower()
        products = [p for p in products if not p.get("available_regions") or any(
            r.lower() == "pan_india" or r_lower in r.lower() or r.lower() in r_lower
            for r in p.get("available_regions", [])
        )]
    return products


@api_router.get("/loans/stats")
async def get_loan_stats():
    products = await db.loan_products.find({"is_active": True}, {"_id": 0}).to_list(200)
    categories = {}
    bank_rates = {}
    for p in products:
        lt = p["loan_type"]
        if lt not in categories:
            categories[lt] = {"count": 0, "min_rate": 100, "max_rate": 0, "avg_rate": 0, "rates_sum": 0}
        categories[lt]["count"] += 1
        categories[lt]["min_rate"] = min(categories[lt]["min_rate"], p["interest_rate"])
        categories[lt]["max_rate"] = max(categories[lt]["max_rate"], p["interest_rate"])
        categories[lt]["rates_sum"] += p["interest_rate"]

        bn = p["bank_name"]
        if bn not in bank_rates:
            bank_rates[bn] = []
        bank_rates[bn].append({"loan_type": lt, "rate": p["interest_rate"], "product": p["product_name"]})

    for lt in categories:
        categories[lt]["avg_rate"] = round(categories[lt]["rates_sum"] / categories[lt]["count"], 2)
        del categories[lt]["rates_sum"]

    top_banks = sorted(bank_rates.items(), key=lambda x: len(x[1]), reverse=True)[:10]
    bank_summary = [{"bank": b, "products": len(r), "avg_rate": round(sum(x["rate"] for x in r) / len(r), 2)} for b, r in top_banks]

    return {
        "total_products": len(products),
        "total_banks": len(bank_rates),
        "total_categories": len(categories),
        "categories": categories,
        "top_banks": bank_summary,
    }



@api_router.get("/loans/recommendations")
async def get_recommendations(request: Request):
    user = await get_current_user(request)
    profile = await db.user_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})

    if not profile or not profile.get("onboarding_complete"):
        raise HTTPException(status_code=400, detail="Complete onboarding first")

    loan_type = profile.get("loan_type", "personal")
    desired_amount = profile.get("desired_amount", 500000)
    desired_tenure = profile.get("desired_tenure_months", 60)

    products = await db.loan_products.find({"loan_type": loan_type, "is_active": True}, {"_id": 0}).to_list(100)

    # Filter by region if user has location
    user_state = (profile.get("state") or "").lower()
    user_city = (profile.get("city") or "").lower()
    if user_state or user_city:
        region_filtered = []
        for p in products:
            regions = p.get("available_regions", [])
            if not regions:  # No region restriction = available everywhere
                region_filtered.append(p)
            else:
                for r in regions:
                    r_lower = r.lower()
                    if r_lower == "pan_india" or r_lower in user_state or r_lower in user_city or user_state in r_lower or user_city in r_lower:
                        region_filtered.append(p)
                        break
        products = region_filtered if region_filtered else products  # Fallback to all if no matches

    recommendations = []
    for product in products:
        cost = calculate_total_cost(desired_amount, product["interest_rate"], desired_tenure, product["processing_fee_pct"], product.get("foreclosure_charge_pct", 0))
        approval_data = calculate_approval_probability(profile, product)
        recommendations.append({
            **product, **cost,
            "approval_probability": approval_data["score"],
            "approval_reasons": approval_data["reasons"],
            "desired_amount": desired_amount,
            "desired_tenure_months": desired_tenure
        })

    recommendations.sort(key=lambda x: x["total_cost"])

    if recommendations:
        worst_cost = recommendations[-1]["total_cost"]
        for rec in recommendations:
            rec["savings"] = round(worst_cost - rec["total_cost"], 2)

    return recommendations


# ==================== LEAD MANAGEMENT ====================

@api_router.post("/leads")
async def create_lead(data: LeadCreate, request: Request):
    user = await get_current_user(request)

    existing = await db.leads.find_one({
        "user_id": user["user_id"], "product_id": data.product_id
    }, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="You have already expressed interest in this product")

    lead_id = f"lead_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    lead_doc = {
        "lead_id": lead_id, "user_id": user["user_id"],
        "product_id": data.product_id, "bank_name": data.bank_name,
        "product_name": data.product_name, "status": "interested",
        "consent_given": True, "consent_timestamp": now,
        "created_at": now, "updated_at": now
    }
    await db.leads.insert_one(lead_doc)
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    await log_event(db, "lead_created", {"lead_id": lead_id, "bank": data.bank_name, "product": data.product_name}, user["user_id"])
    return lead


@api_router.get("/leads")
async def get_leads(request: Request):
    user = await get_current_user(request)
    leads = await db.leads.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return leads


@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    lead = await db.leads.find_one({"lead_id": lead_id, "user_id": user["user_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    status = body.get("status")
    if status and status in ["interested", "applied", "approved", "disbursed", "revoked"]:
        await db.leads.update_one(
            {"lead_id": lead_id},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    updated = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    return updated



# ==================== BANK ONBOARDING & PORTAL ====================

@api_router.post("/bank/register")
async def register_bank(data: BankRegister, response: Response):
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = f"bank_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    # Create bank user account
    await db.users.insert_one({
        "user_id": user_id, "email": email,
        "password_hash": hash_password(data.password),
        "name": data.contact_person, "picture": None,
        "auth_type": "email", "role": "bank",
        "bank_name": data.bank_name, "language": "en",
        "created_at": now
    })

    # Create bank registration details
    bank_doc = {
        "bank_id": user_id, "bank_name": data.bank_name,
        "contact_person": data.contact_person, "email": email,
        "phone": data.phone, "loan_types_offered": data.loan_types_offered,
        "branch_locations": data.branch_locations,
        "corporate_tieups": data.corporate_tieups,
        "min_rate": data.min_rate, "max_rate": data.max_rate,
        "commission_pct": data.commission_pct,
        "description": data.description,
        "status": "active", "created_at": now,
        "products_count": 0
    }
    await db.bank_registrations.insert_one(bank_doc)

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    await log_event(db, "bank_registered", {"bank_name": data.bank_name, "bank_id": user_id})

    return {"bank_id": user_id, "bank_name": data.bank_name, "email": email, "role": "bank"}


@api_router.post("/bank/products")
async def bank_add_product(data: BankProductCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") not in ("bank", "admin"):
        raise HTTPException(status_code=403, detail="Bank access required")

    bank_name = user.get("bank_name", "Unknown Bank")
    bank_reg = await db.bank_registrations.find_one({"bank_id": user["user_id"]}, {"_id": 0})
    if bank_reg:
        bank_name = bank_reg.get("bank_name", bank_name)

    product_id = f"{bank_name.lower().replace(' ', '_')}_{data.loan_type}_{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()

    product_doc = {
        "product_id": product_id, "bank_name": bank_name, "bank_id": user["user_id"],
        "product_name": data.product_name, "loan_type": data.loan_type,
        "interest_rate": data.interest_rate, "processing_fee_pct": data.processing_fee_pct,
        "max_amount": data.max_amount, "min_amount": data.min_amount,
        "max_tenure_months": data.max_tenure_months, "min_tenure_months": data.min_tenure_months,
        "foreclosure_charge_pct": data.foreclosure_charge_pct,
        "min_income": data.min_income, "min_credit_score": data.min_credit_score,
        "features": data.features, "available_regions": data.available_regions,
        "corporate_tieups": data.corporate_tieups,
        "is_active": True, "created_at": now, "source": "bank_portal"
    }
    await db.loan_products.insert_one(product_doc)

    # Update products count
    count = await db.loan_products.count_documents({"bank_id": user["user_id"], "is_active": True})
    await db.bank_registrations.update_one({"bank_id": user["user_id"]}, {"$set": {"products_count": count}})

    return {"product_id": product_id, "message": "Product added successfully"}


@api_router.get("/bank/products")
async def bank_get_products(request: Request):
    user = await get_current_user(request)
    if user.get("role") not in ("bank", "admin"):
        raise HTTPException(status_code=403, detail="Bank access required")

    if user.get("role") == "admin":
        products = await db.loan_products.find({"source": "bank_portal"}, {"_id": 0}).to_list(200)
    else:
        products = await db.loan_products.find({"bank_id": user["user_id"]}, {"_id": 0}).to_list(200)
    return products


@api_router.put("/bank/products/{product_id}")
async def bank_update_product(product_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") not in ("bank", "admin"):
        raise HTTPException(status_code=403, detail="Bank access required")

    body = await request.json()
    query = {"product_id": product_id}
    if user.get("role") == "bank":
        query["bank_id"] = user["user_id"]

    product = await db.loan_products.find_one(query, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    allowed = {"interest_rate", "processing_fee_pct", "max_amount", "min_amount", "max_tenure_months",
               "min_tenure_months", "foreclosure_charge_pct", "min_income", "min_credit_score",
               "features", "available_regions", "corporate_tieups", "is_active", "product_name"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.loan_products.update_one({"product_id": product_id}, {"$set": updates})

    updated = await db.loan_products.find_one({"product_id": product_id}, {"_id": 0})
    return updated


@api_router.get("/bank/dashboard")
async def bank_dashboard(request: Request):
    user = await get_current_user(request)
    if user.get("role") not in ("bank", "admin"):
        raise HTTPException(status_code=403, detail="Bank access required")

    bank_name = user.get("bank_name", "")
    if user.get("role") == "bank":
        bank_reg = await db.bank_registrations.find_one({"bank_id": user["user_id"]}, {"_id": 0})
        if bank_reg:
            bank_name = bank_reg.get("bank_name", bank_name)

    # Bank's leads
    lead_query = {"bank_name": bank_name} if user.get("role") == "bank" else {}
    leads = await db.leads.find(lead_query, {"_id": 0}).to_list(500)

    # Funnel counts
    funnel = {"interested": 0, "applied": 0, "approved": 0, "disbursed": 0, "revoked": 0}
    total_amount = 0
    regions = {}
    for lead in leads:
        s = lead.get("status", "interested")
        funnel[s] = funnel.get(s, 0) + 1
        # Get user profile for region/amount data
        profile = await db.user_profiles.find_one({"user_id": lead.get("user_id")}, {"_id": 0})
        if profile:
            total_amount += profile.get("desired_amount", 0)
            state = profile.get("state", "Unknown")
            if state:
                regions[state] = regions.get(state, 0) + 1

    total_leads = len(leads)
    conversion = {
        "interested_to_applied": round((funnel["applied"] / funnel["interested"] * 100) if funnel["interested"] > 0 else 0, 1),
        "applied_to_approved": round((funnel["approved"] / funnel["applied"] * 100) if funnel["applied"] > 0 else 0, 1),
        "approved_to_disbursed": round((funnel["disbursed"] / funnel["approved"] * 100) if funnel["approved"] > 0 else 0, 1),
        "overall": round((funnel["disbursed"] / total_leads * 100) if total_leads > 0 else 0, 1),
    }

    # Platform averages (anonymized)
    all_leads = await db.leads.count_documents({})
    all_disbursed = await db.leads.count_documents({"status": "disbursed"})
    platform_avg = {
        "total_leads": all_leads,
        "conversion_rate": round((all_disbursed / all_leads * 100) if all_leads > 0 else 0, 1),
        "total_banks": await db.bank_registrations.count_documents({"status": "active"}),
    }

    # Applications for this bank
    app_query = {"bank_name": bank_name} if user.get("role") == "bank" else {}
    applications = await db.loan_applications.find(app_query, {"_id": 0}).sort("created_at", -1).to_list(50)

    return {
        "bank_name": bank_name,
        "total_leads": total_leads,
        "funnel": funnel,
        "conversion": conversion,
        "avg_loan_amount": round(total_amount / total_leads) if total_leads > 0 else 0,
        "region_breakdown": regions,
        "recent_leads": leads[:20],
        "platform_comparison": platform_avg,
        "applications": applications,
        "products_count": await db.loan_products.count_documents(
            {"bank_id": user["user_id"], "is_active": True} if user.get("role") == "bank" else {"source": "bank_portal"}
        ),
    }


# ==================== DIGITAL LOAN APPLICATION ====================

@api_router.post("/applications")
async def create_application(data: LoanApplicationCreate, request: Request):
    user = await get_current_user(request)

    lead = await db.leads.find_one({"lead_id": data.lead_id, "user_id": user["user_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    existing = await db.loan_applications.find_one({"lead_id": data.lead_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Application already submitted for this lead")

    app_id = f"app_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    app_doc = {
        "application_id": app_id, "lead_id": data.lead_id,
        "user_id": user["user_id"], "bank_name": lead.get("bank_name"),
        "product_name": lead.get("product_name"), "product_id": lead.get("product_id"),
        "full_name": data.full_name, "phone": data.phone,
        "pan_number": data.pan_number,
        "employment_details": data.employment_details,
        "monthly_income": data.monthly_income,
        "loan_amount_requested": data.loan_amount_requested,
        "loan_purpose": data.loan_purpose,
        "residence_type": data.residence_type,
        "years_at_current_job": data.years_at_current_job,
        "status": "submitted", "created_at": now
    }
    await db.loan_applications.insert_one(app_doc)

    # Update lead status to applied
    await db.leads.update_one({"lead_id": data.lead_id}, {"$set": {"status": "applied", "updated_at": now}})

    await log_event(db, "application_submitted", {"app_id": app_id, "bank": lead.get("bank_name")}, user["user_id"])
    return {"application_id": app_id, "status": "submitted", "message": "Application submitted successfully"}


@api_router.get("/applications")
async def get_applications(request: Request):
    user = await get_current_user(request)
    apps = await db.loan_applications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return apps



# ==================== AI ROUTES ====================

@api_router.post("/ai/suggest")
async def ai_suggest(data: AiSuggestRequest, request: Request):
    user = await get_current_user(request)
    profile = await db.user_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})

    from emergentintegrations.llm.chat import LlmChat, UserMessage

    profile_context = ""
    if profile and profile.get("onboarding_complete"):
        profile_context = f"""
User Profile:
- Loan Type: {profile.get('loan_type', 'N/A')}
- Monthly Income: Rs.{profile.get('monthly_income', 'N/A')}
- Employment: {profile.get('employment_type', 'N/A')}
- Existing Loans: {'Yes' if profile.get('existing_loans') else 'No'}
- Credit Score: {profile.get('credit_score', 'Unknown')}
- Desired Amount: Rs.{profile.get('desired_amount', 'N/A')}
- Desired Tenure: {profile.get('desired_tenure_months', 'N/A')} months"""

    lang_instruction = "Respond in Hindi." if data.language == "hi" else "Respond in English."
    system_msg = f"""You are Rinkosh AI, a trusted financial advisor for Indian borrowers.
Help users understand loan options, credit scores, and financial decisions.
Be concise, helpful, and use simple language. Use Rs. for currency.
{lang_instruction}
{profile_context}
Give specific, actionable advice with numbers when possible."""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"suggest_{user['user_id']}_{uuid.uuid4().hex[:8]}",
        system_message=system_msg
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        response_text = await chat.send_message(UserMessage(text=data.message))
    except Exception as e:
        logger.error(f"AI suggest error: {e}")
        error_msg = str(e)
        if "Budget" in error_msg or "budget" in error_msg:
            response_text = "I'm currently experiencing high demand. Please try again in a few minutes, or ask your question in the meantime - I'll try to help with what I know!"
        else:
            response_text = "I'm having trouble connecting right now. Please try again shortly."
    return {"response": response_text, "language": data.language}


@api_router.post("/ai/translate")
async def ai_translate(data: TranslateRequest, request: Request):
    await get_current_user(request)
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    target = "Hindi" if data.target_language == "hi" else "English"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"translate_{uuid.uuid4().hex[:8]}",
        system_message=f"Translate the given text to {target}. Only return the translated text."
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        response_text = await chat.send_message(UserMessage(text=data.text))
    except Exception as e:
        logger.error(f"Translation error: {e}")
        response_text = data.text
    return {"translated_text": response_text, "target_language": data.target_language}


@api_router.post("/ai/voice")
async def ai_voice(request: Request, file: UploadFile = File(...)):
    await get_current_user(request)
    from emergentintegrations.llm.openai import OpenAISpeechToText

    stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
    contents = await file.read()

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(file=audio_file, model="whisper-1", response_format="json")
        return {"text": response.text}
    finally:
        os.unlink(tmp_path)



@api_router.post("/ai/chat-public")
async def public_chat(data: PublicChatRequest, request: Request):
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    lang_instruction = "Respond in Hindi." if data.language == "hi" else "Respond in English."

    # Fetch loan stats for context
    product_count = await db.loan_products.count_documents({"is_active": True})
    categories = await db.loan_products.distinct("loan_type", {"is_active": True})
    banks = await db.loan_products.distinct("bank_name", {"is_active": True})

    system_msg = f"""You are Rinkosh AI, a friendly and knowledgeable loan advisor for Indian borrowers.
You help users understand loan options, interest rates, EMI calculations, credit scores, and financial planning.
{lang_instruction}

Context: Rinkosh has {product_count} loan products across {len(categories)} categories ({', '.join(categories)}) from {len(banks)} banks.
Rules:
- Be concise (2-4 sentences max unless they ask for detail)
- Use Rs. for currency, Indian financial context
- If they ask about specific rates, mention that rates vary and suggest they browse loans on Rinkosh
- Never give legal or tax advice, suggest consulting a CA/advisor
- Be warm and helpful, like talking to a smart friend"""

    session = data.session_id or f"public_{uuid.uuid4().hex[:8]}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session,
        system_message=system_msg
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        response_text = await chat.send_message(UserMessage(text=data.message))
    except Exception as e:
        logger.error(f"Public chat error: {e}")
        error_msg = str(e)
        if "Budget" in error_msg or "budget" in error_msg:
            response_text = "I'm currently experiencing high demand. Please try again shortly!" if data.language != "hi" else "अभी ज़्यादा अनुरोध हैं। कृपया कुछ देर बाद फिर कोशिश करें!"
        else:
            response_text = "I'm having trouble connecting right now. Please try again." if data.language != "hi" else "कनेक्शन में समस्या है। कृपया फिर से प्रयास करें।"

    await log_event(db, "chatbot_message", {"message": data.message[:100], "session": session})
    return {"response": response_text, "session_id": session}


# ==================== CREDIT BUILDER ====================

@api_router.get("/credit-builder/suggestions")
async def get_credit_builder_suggestions(request: Request):
    user = await get_current_user(request)
    profile = await db.user_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    credit_score = profile.get("credit_score", 0) if profile else 0
    suggestions = []

    if credit_score < 650 or not profile or not profile.get("credit_score_known"):
        suggestions.extend([
            {"id": "cc_secured", "title": "Get a Secured Credit Card", "description": "Deposit Rs.10,000-25,000 as collateral and get a credit card. Use it for small purchases and pay on time to build credit.", "category": "credit_card", "impact": "high", "difficulty": "easy"},
            {"id": "starter_loan", "title": "Take a Small Starter Loan", "description": "Apply for a gold loan or small personal loan of Rs.25,000-50,000. Pay EMIs on time for 6-12 months to establish credit history.", "category": "loan", "impact": "high", "difficulty": "medium"}
        ])

    suggestions.extend([
        {"id": "cc_lifetime", "title": "Lifetime Free Credit Card", "description": "Apply for SBI SimplyCLICK, HDFC Millennia, or RBL ShopRite. No annual fee. Use for 30-40% of limit.", "category": "credit_card", "impact": "medium", "difficulty": "easy"},
        {"id": "pay_ontime", "title": "Pay All Bills On Time", "description": "Set up auto-pay for credit card bills, EMIs, and utility bills. Payment history is 35% of your credit score.", "category": "habit", "impact": "high", "difficulty": "easy"},
        {"id": "utilization", "title": "Keep Credit Utilization Below 30%", "description": "If your credit card limit is Rs.1,00,000, never use more than Rs.30,000. Request a limit increase if needed.", "category": "habit", "impact": "high", "difficulty": "easy"},
        {"id": "check_report", "title": "Check Your Credit Report", "description": "Get free credit report from CIBIL, Experian, or Equifax once a year. Dispute any errors immediately.", "category": "check", "impact": "medium", "difficulty": "easy"}
    ])
    return suggestions


# ==================== ADMIN ENDPOINTS ====================

@api_router.get("/admin/analytics")
async def admin_analytics(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    total_users = await db.users.count_documents({})
    total_leads = await db.leads.count_documents({})

    leads_by_status = {}
    async for doc in db.leads.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        leads_by_status[doc["_id"]] = doc["count"]

    leads_by_bank = []
    async for doc in db.leads.aggregate([{"$group": {"_id": "$bank_name", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]):
        leads_by_bank.append({"bank_name": doc["_id"], "count": doc["count"]})

    recent_leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)

    disbursed = leads_by_status.get("disbursed", 0)
    estimated_commission = disbursed * 500000 * 0.01
    conversion_rate = (disbursed / total_leads * 100) if total_leads > 0 else 0

    return {
        "total_users": total_users,
        "total_leads": total_leads,
        "leads_by_status": leads_by_status,
        "leads_by_bank": leads_by_bank,
        "recent_leads": recent_leads,
        "commission_summary": {
            "total_disbursed": disbursed,
            "estimated_commission": round(estimated_commission, 2),
            "conversion_rate": round(conversion_rate, 2)
        }
    }


@api_router.put("/admin/leads/{lead_id}")
async def admin_update_lead(lead_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    body = await request.json()
    status = body.get("status")
    if status not in ["interested", "applied", "approved", "disbursed", "revoked"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    return updated


# ==================== ANALYTICS EVENTS ====================

@api_router.post("/analytics/event")
async def track_event(request: Request):
    """Track a user journey event. Works with or without auth."""
    body = await request.json()
    event_type = body.get("event_type", "")
    data = body.get("data", {})
    if not event_type:
        raise HTTPException(status_code=400, detail="event_type required")
    user_id = None
    try:
        user = await get_current_user(request)
        user_id = user.get("user_id")
    except Exception:
        pass
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    data["ip"] = ip
    data["user_agent"] = ua[:200]
    await log_event(db, event_type, data, user_id)
    return {"status": "ok"}


@api_router.get("/admin/events")
async def get_admin_events(request: Request, event_type: Optional[str] = None, limit: int = 100):
    """Get analytics events (admin only)"""
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    query = {}
    if event_type:
        query["event_type"] = event_type
    events = await db.analytics_events.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)

    # Summary stats
    total = await db.analytics_events.count_documents({})
    type_counts = {}
    async for doc in db.analytics_events.aggregate([{"$group": {"_id": "$event_type", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]):
        type_counts[doc["_id"]] = doc["count"]

    return {
        "events": events,
        "total_events": total,
        "event_type_counts": type_counts
    }


# ==================== HEALTH ====================

@api_router.get("/health")
async def health():
    return {"status": "ok"}


# ==================== SEED DATA ====================

from seed_data import LOAN_PRODUCTS, PRODUCT_METADATA  # noqa: E402  (data block extracted Feb 2026)



async def seed_loan_products():
    for product in LOAN_PRODUCTS:
        await db.loan_products.update_one(
            {"product_id": product["product_id"]},
            {"$set": product},
            upsert=True
        )
    count = await db.loan_products.count_documents({"is_active": True})
    logger.info(f"Seeded/updated {len(LOAN_PRODUCTS)} loan products (total active: {count})")

    # Apply corporate tie-up and region metadata to all products
    for pid, meta in PRODUCT_METADATA.items():
        await db.loan_products.update_one(
            {"product_id": pid},
            {"$set": meta}
        )
    logger.info(f"Applied metadata (tieups/regions) to {len(PRODUCT_METADATA)} products")


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@rinkosh.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin", "picture": None, "auth_type": "email",
            "role": "admin", "language": "en",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Admin account seeded")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")


@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.loan_products.create_index("loan_type")
    await db.leads.create_index("user_id")
    await db.user_profiles.create_index("user_id", unique=True)
    await db.password_reset_tokens.create_index("email")
    await db.login_otps.create_index("identifier")
    await db.analytics_events.create_index("event_type")
    await db.analytics_events.create_index("timestamp")
    await db.analytics_events.create_index("user_id")
    await seed_admin()
    await seed_loan_products()

    creds_dir = Path("/app/memory")
    creds_dir.mkdir(exist_ok=True)
    with open(creds_dir / "test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write(f"## Admin\n- Email: {os.environ.get('ADMIN_EMAIL', 'admin@rinkosh.com')}\n")
        f.write(f"- Password: {os.environ.get('ADMIN_PASSWORD', 'Admin@123')}\n- Role: admin\n\n")
        f.write("## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n")
        f.write("- POST /api/auth/google-callback\n")
    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
