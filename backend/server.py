from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt as pyjwt
import httpx
import math
import tempfile

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

    # Brute force check - 10 attempts, 5 min lockout
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("attempts", 0) >= 10:
        locked_until = attempt.get("locked_until")
        if locked_until:
            if isinstance(locked_until, str):
                locked_until = datetime.fromisoformat(locked_until)
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if locked_until > datetime.now(timezone.utc):
                await log_event(db, "login_blocked", {"email": email, "ip": ip, "reason": "brute_force"})
                raise HTTPException(status_code=429, detail="Too many attempts. Please wait 5 minutes.")
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
    logger.info(f"Login OTP for {identifier}: {otp}")
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
    logger.info(f"Password reset OTP for {email}: {otp}")
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


# ==================== CREDIT SCORE PLACEHOLDER ====================

@api_router.get("/credit-score/check")
async def check_credit_score(request: Request):
    await get_current_user(request)
    return {
        "status": "unavailable",
        "message": "Credit score check integration coming soon. Please check your score for free using the links below.",
        "providers": [
            {"name": "CIBIL", "url": "https://www.cibil.com/freecibilscore", "description": "Get your free CIBIL score"},
            {"name": "Experian", "url": "https://www.experian.in/consumer/free-credit-score", "description": "Free Experian credit report"},
            {"name": "Equifax", "url": "https://www.equifax.co.in", "description": "Check Equifax credit score"}
        ]
    }


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

def calculate_approval_probability(profile, product):
    score = 50
    reasons = []

    # Credit score factor (biggest weight)
    if profile.get("credit_score"):
        cs = profile["credit_score"]
        min_cs = product.get("min_credit_score", 0)
        if cs >= 750:
            score += 30
            reasons.append("Excellent credit score")
        elif cs >= 700:
            score += 20
            reasons.append("Good credit score")
        elif cs >= 650:
            score += 10
            reasons.append("Fair credit score")
        else:
            score -= 10
            reasons.append("Low credit score - may affect approval")
        if min_cs > 0 and cs < min_cs:
            score -= 15
            reasons.append(f"Bank requires min {min_cs} CIBIL")
    else:
        reasons.append("Credit score not provided")

    # Income vs bank minimum
    if profile.get("monthly_income") and product.get("min_income") and product["min_income"] > 0:
        ratio = profile["monthly_income"] / product["min_income"]
        if ratio >= 3:
            score += 15
            reasons.append("Income well above requirement")
        elif ratio >= 2:
            score += 12
            reasons.append("Strong income-to-requirement ratio")
        elif ratio >= 1.5:
            score += 8
            reasons.append("Income meets requirement comfortably")
        elif ratio >= 1:
            score += 3
            reasons.append("Income just meets minimum")
        else:
            score -= 20
            reasons.append(f"Income below bank's min Rs.{product['min_income']:,}")
    elif product.get("min_income", 0) == 0:
        score += 5
        reasons.append("No income requirement for this product")

    # Existing loan burden
    if profile.get("existing_loans"):
        if profile.get("existing_loan_emi") and profile.get("monthly_income") and profile["monthly_income"] > 0:
            emi_ratio = profile["existing_loan_emi"] / profile["monthly_income"]
            if emi_ratio > 0.5:
                score -= 18
                reasons.append("High existing EMI burden (>50% income)")
            elif emi_ratio > 0.3:
                score -= 8
                reasons.append("Moderate existing EMI load")
            else:
                score -= 3
                reasons.append("Low existing EMI - manageable")
        else:
            score -= 10
            reasons.append("Existing loans may reduce eligibility")
    else:
        score += 5
        reasons.append("No existing loans - clean slate")

    # Loan amount vs max
    desired = profile.get("desired_amount", 0)
    max_amt = product.get("max_amount", 0)
    if desired and max_amt:
        if desired > max_amt:
            score -= 15
            reasons.append(f"Amount exceeds bank's max Rs.{max_amt:,}")
        elif desired > max_amt * 0.8:
            score -= 5
            reasons.append("Requesting near maximum limit")

    # Product-specific boosts — creates variance between banks
    rate = product.get("interest_rate", 0)
    if rate <= 9:
        score -= 3
        reasons.append("Premium product - stricter criteria")
    elif rate >= 12:
        score += 4
        reasons.append("Easier approval - higher rate product")

    fee = product.get("processing_fee_pct", 0)
    if fee == 0:
        score += 3
        reasons.append("Zero processing fee product")
    elif fee >= 2:
        score -= 2

    # Bank trust factor (public sector banks are more lenient)
    public_banks = {"SBI", "PNB", "Bank of Baroda", "Canara Bank", "Union Bank", "LIC Housing"}
    if product.get("bank_name") in public_banks:
        score += 4
        reasons.append("Public sector bank - broader eligibility")

    # Min amount check
    min_amt = product.get("min_amount", 0)
    if desired and min_amt and desired < min_amt:
        score -= 5
        reasons.append(f"Amount below bank's minimum Rs.{min_amt:,}")

    # Corporate tie-up boost
    employer_type = profile.get("employer_type", "")
    employer_name = (profile.get("employer_name") or "").upper()
    tieups = product.get("corporate_tieups", [])
    if tieups:
        matched = False
        for t in tieups:
            t_upper = t.upper()
            if t_upper == employer_type.upper() or t_upper in employer_name or employer_name in t_upper:
                matched = True
                break
        if matched:
            score += 12
            reasons.append("Corporate tie-up - preferential rates")
        elif employer_type in ("psu", "govt", "defence"):
            # PSU/Govt employees generally get better treatment
            score += 6
            reasons.append("Govt/PSU employee - favorable terms")

    # Region availability check
    regions = product.get("available_regions", [])
    user_state = (profile.get("state") or "").lower()
    user_city = (profile.get("city") or "").lower()
    if regions and user_state:
        region_match = False
        for r in regions:
            r_lower = r.lower()
            if r_lower == "pan_india" or r_lower in user_state or r_lower in user_city or user_state in r_lower or user_city in r_lower:
                region_match = True
                break
        if not region_match:
            score -= 8
            reasons.append("Limited availability in your region")

    final_score = max(10, min(95, score))
    return {"score": final_score, "reasons": reasons[:4]}


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

LOAN_PRODUCTS = [
    # Personal Loans
    {"product_id": "sbi_personal", "bank_name": "SBI", "product_name": "SBI Personal Loan", "loan_type": "personal", "interest_rate": 11.0, "processing_fee_pct": 1.5, "max_amount": 2000000, "min_amount": 25000, "max_tenure_months": 72, "min_tenure_months": 6, "foreclosure_charge_pct": 3.0, "min_income": 15000, "min_credit_score": 650, "features": ["No collateral required", "Quick disbursement"], "is_active": True},
    {"product_id": "hdfc_personal", "bank_name": "HDFC Bank", "product_name": "HDFC Personal Loan", "loan_type": "personal", "interest_rate": 10.5, "processing_fee_pct": 2.0, "max_amount": 4000000, "min_amount": 50000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 4.0, "min_income": 25000, "min_credit_score": 700, "features": ["Instant approval", "Flexible tenure"], "is_active": True},
    {"product_id": "icici_personal", "bank_name": "ICICI Bank", "product_name": "ICICI Personal Loan", "loan_type": "personal", "interest_rate": 10.75, "processing_fee_pct": 2.5, "max_amount": 5000000, "min_amount": 50000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 5.0, "min_income": 25000, "min_credit_score": 700, "features": ["Pre-approved offers", "Doorstep service"], "is_active": True},
    {"product_id": "bajaj_personal", "bank_name": "Bajaj Finserv", "product_name": "Bajaj Personal Loan", "loan_type": "personal", "interest_rate": 12.0, "processing_fee_pct": 2.0, "max_amount": 2500000, "min_amount": 25000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 3.5, "min_income": 15000, "min_credit_score": 625, "features": ["Flexi loan option", "Part-prepayment"], "is_active": True},
    {"product_id": "kotak_personal", "bank_name": "Kotak Mahindra", "product_name": "Kotak Personal Loan", "loan_type": "personal", "interest_rate": 10.99, "processing_fee_pct": 2.5, "max_amount": 4000000, "min_amount": 50000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 4.0, "min_income": 20000, "min_credit_score": 680, "features": ["Digital process", "Balance transfer"], "is_active": True},
    # Home Loans
    {"product_id": "sbi_home", "bank_name": "SBI", "product_name": "SBI Home Loan", "loan_type": "home", "interest_rate": 8.5, "processing_fee_pct": 0.35, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 360, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 25000, "min_credit_score": 650, "features": ["No foreclosure charges", "Tax benefits up to 3.5L"], "is_active": True},
    {"product_id": "hdfc_home", "bank_name": "HDFC Bank", "product_name": "HDFC Home Loan", "loan_type": "home", "interest_rate": 8.75, "processing_fee_pct": 0.50, "max_amount": 100000000, "min_amount": 500000, "max_tenure_months": 360, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 25000, "min_credit_score": 650, "features": ["Doorstep service", "Balance transfer facility"], "is_active": True},
    {"product_id": "lic_home", "bank_name": "LIC Housing", "product_name": "LIC Home Loan", "loan_type": "home", "interest_rate": 8.35, "processing_fee_pct": 0.25, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 360, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 20000, "min_credit_score": 625, "features": ["Lowest processing fee", "Long tenure"], "is_active": True},
    {"product_id": "icici_home", "bank_name": "ICICI Bank", "product_name": "ICICI Home Loan", "loan_type": "home", "interest_rate": 8.60, "processing_fee_pct": 0.50, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 360, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 25000, "min_credit_score": 675, "features": ["Fast processing", "Online tracking"], "is_active": True},
    {"product_id": "axis_home", "bank_name": "Axis Bank", "product_name": "Axis Home Loan", "loan_type": "home", "interest_rate": 8.70, "processing_fee_pct": 1.0, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 360, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 25000, "min_credit_score": 675, "features": ["Women borrower discount", "NRI home loans"], "is_active": True},
    # Car Loans
    {"product_id": "sbi_car", "bank_name": "SBI", "product_name": "SBI Car Loan", "loan_type": "car", "interest_rate": 8.65, "processing_fee_pct": 0.5, "max_amount": 5000000, "min_amount": 100000, "max_tenure_months": 84, "min_tenure_months": 12, "foreclosure_charge_pct": 2.0, "min_income": 20000, "min_credit_score": 650, "features": ["Low interest rate", "100% on-road financing"], "is_active": True},
    {"product_id": "hdfc_car", "bank_name": "HDFC Bank", "product_name": "HDFC Car Loan", "loan_type": "car", "interest_rate": 8.80, "processing_fee_pct": 0.5, "max_amount": 5000000, "min_amount": 100000, "max_tenure_months": 84, "min_tenure_months": 12, "foreclosure_charge_pct": 3.0, "min_income": 20000, "min_credit_score": 675, "features": ["Quick disbursement", "Flexible EMI"], "is_active": True},
    {"product_id": "icici_car", "bank_name": "ICICI Bank", "product_name": "ICICI Car Loan", "loan_type": "car", "interest_rate": 8.75, "processing_fee_pct": 0.5, "max_amount": 5000000, "min_amount": 100000, "max_tenure_months": 84, "min_tenure_months": 12, "foreclosure_charge_pct": 5.0, "min_income": 20000, "min_credit_score": 650, "features": ["Used car loans", "Dealer partnerships"], "is_active": True},
    # Education Loans
    {"product_id": "sbi_edu", "bank_name": "SBI", "product_name": "SBI Education Loan", "loan_type": "education", "interest_rate": 8.15, "processing_fee_pct": 0, "max_amount": 15000000, "min_amount": 100000, "max_tenure_months": 180, "min_tenure_months": 36, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["No processing fee", "Moratorium period", "Tax benefit 80E"], "is_active": True},
    {"product_id": "hdfc_edu", "bank_name": "HDFC Credila", "product_name": "HDFC Education Loan", "loan_type": "education", "interest_rate": 9.0, "processing_fee_pct": 1.0, "max_amount": 20000000, "min_amount": 100000, "max_tenure_months": 180, "min_tenure_months": 36, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["Study abroad loans", "Co-applicant income"], "is_active": True},
    {"product_id": "axis_edu", "bank_name": "Axis Bank", "product_name": "Axis Education Loan", "loan_type": "education", "interest_rate": 9.70, "processing_fee_pct": 1.0, "max_amount": 7500000, "min_amount": 50000, "max_tenure_months": 180, "min_tenure_months": 36, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["Quick approval", "Living expenses covered"], "is_active": True},
    # Bike Loans
    {"product_id": "hdfc_bike", "bank_name": "HDFC Bank", "product_name": "HDFC Bike Loan", "loan_type": "bike", "interest_rate": 9.5, "processing_fee_pct": 1.0, "max_amount": 500000, "min_amount": 25000, "max_tenure_months": 48, "min_tenure_months": 6, "foreclosure_charge_pct": 5.0, "min_income": 12000, "min_credit_score": 600, "features": ["Minimal docs", "Instant approval"], "is_active": True},
    {"product_id": "bajaj_bike", "bank_name": "Bajaj Finserv", "product_name": "Bajaj Bike Loan", "loan_type": "bike", "interest_rate": 10.0, "processing_fee_pct": 1.5, "max_amount": 400000, "min_amount": 15000, "max_tenure_months": 48, "min_tenure_months": 6, "foreclosure_charge_pct": 4.0, "min_income": 10000, "min_credit_score": 600, "features": ["Low down payment", "Wide network"], "is_active": True},
    {"product_id": "mahindra_bike", "bank_name": "Mahindra Finance", "product_name": "Mahindra Bike Loan", "loan_type": "bike", "interest_rate": 11.0, "processing_fee_pct": 1.0, "max_amount": 300000, "min_amount": 15000, "max_tenure_months": 48, "min_tenure_months": 6, "foreclosure_charge_pct": 5.0, "min_income": 8000, "min_credit_score": 550, "features": ["Rural-friendly", "Flexible repayment"], "is_active": True},
    # Additional Personal Loans
    {"product_id": "pnb_personal", "bank_name": "PNB", "product_name": "PNB Personal Loan", "loan_type": "personal", "interest_rate": 10.85, "processing_fee_pct": 1.0, "max_amount": 1000000, "min_amount": 25000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 3.0, "min_income": 15000, "min_credit_score": 650, "features": ["Government bank trust", "Low processing fee"], "is_active": True},
    {"product_id": "bob_personal", "bank_name": "Bank of Baroda", "product_name": "Baroda Personal Loan", "loan_type": "personal", "interest_rate": 11.25, "processing_fee_pct": 1.0, "max_amount": 1500000, "min_amount": 25000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 3.0, "min_income": 15000, "min_credit_score": 650, "features": ["No hidden charges", "Online tracking"], "is_active": True},
    {"product_id": "indusind_personal", "bank_name": "IndusInd Bank", "product_name": "IndusInd Personal Loan", "loan_type": "personal", "interest_rate": 10.49, "processing_fee_pct": 2.5, "max_amount": 5000000, "min_amount": 50000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 4.0, "min_income": 25000, "min_credit_score": 700, "features": ["Attractive rates", "Minimal docs"], "is_active": True},
    {"product_id": "tata_personal", "bank_name": "Tata Capital", "product_name": "Tata Capital Personal Loan", "loan_type": "personal", "interest_rate": 10.99, "processing_fee_pct": 2.0, "max_amount": 3500000, "min_amount": 75000, "max_tenure_months": 72, "min_tenure_months": 12, "foreclosure_charge_pct": 4.0, "min_income": 20000, "min_credit_score": 675, "features": ["Tata group trust", "Quick disbursal"], "is_active": True},
    {"product_id": "idfc_personal", "bank_name": "IDFC First", "product_name": "IDFC First Personal Loan", "loan_type": "personal", "interest_rate": 10.49, "processing_fee_pct": 2.0, "max_amount": 4000000, "min_amount": 20000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 4.0, "min_income": 20000, "min_credit_score": 700, "features": ["Zero foreclosure", "Digital journey"], "is_active": True},
    {"product_id": "yes_personal", "bank_name": "Yes Bank", "product_name": "Yes Bank Personal Loan", "loan_type": "personal", "interest_rate": 11.5, "processing_fee_pct": 2.0, "max_amount": 4000000, "min_amount": 50000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 3.0, "min_income": 20000, "min_credit_score": 680, "features": ["Instant e-approval", "Salary credit not needed"], "is_active": True},
    {"product_id": "axis_personal", "bank_name": "Axis Bank", "product_name": "Axis Personal Loan", "loan_type": "personal", "interest_rate": 10.75, "processing_fee_pct": 2.0, "max_amount": 5000000, "min_amount": 50000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 4.0, "min_income": 25000, "min_credit_score": 700, "features": ["Pre-approved for salary a/c", "Step-up EMI"], "is_active": True},
    {"product_id": "canara_personal", "bank_name": "Canara Bank", "product_name": "Canara Personal Loan", "loan_type": "personal", "interest_rate": 11.15, "processing_fee_pct": 0.5, "max_amount": 1000000, "min_amount": 25000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 2.0, "min_income": 15000, "min_credit_score": 650, "features": ["Lowest processing fee", "Govt bank reliability"], "is_active": True},
    # Additional Home Loans
    {"product_id": "pnb_home", "bank_name": "PNB", "product_name": "PNB Home Loan", "loan_type": "home", "interest_rate": 8.40, "processing_fee_pct": 0.35, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 360, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 20000, "min_credit_score": 650, "features": ["Govt bank low rate", "No foreclosure charges"], "is_active": True},
    {"product_id": "bob_home", "bank_name": "Bank of Baroda", "product_name": "Baroda Home Loan", "loan_type": "home", "interest_rate": 8.45, "processing_fee_pct": 0.25, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 360, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 20000, "min_credit_score": 650, "features": ["Lowest fees", "Step-up repayment"], "is_active": True},
    {"product_id": "canara_home", "bank_name": "Canara Bank", "product_name": "Canara Home Loan", "loan_type": "home", "interest_rate": 8.40, "processing_fee_pct": 0.50, "max_amount": 30000000, "min_amount": 300000, "max_tenure_months": 360, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 18000, "min_credit_score": 625, "features": ["Low income threshold", "Rural housing available"], "is_active": True},
    {"product_id": "federal_home", "bank_name": "Federal Bank", "product_name": "Federal Home Loan", "loan_type": "home", "interest_rate": 8.65, "processing_fee_pct": 0.50, "max_amount": 30000000, "min_amount": 500000, "max_tenure_months": 360, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 20000, "min_credit_score": 650, "features": ["Kerala focus", "NRI home loans"], "is_active": True},
    {"product_id": "union_home", "bank_name": "Union Bank", "product_name": "Union Home Loan", "loan_type": "home", "interest_rate": 8.35, "processing_fee_pct": 0.25, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 360, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 18000, "min_credit_score": 625, "features": ["One of lowest rates", "Wide branch network"], "is_active": True},
    # Additional Car Loans
    {"product_id": "tata_car", "bank_name": "Tata Capital", "product_name": "Tata Capital Car Loan", "loan_type": "car", "interest_rate": 8.50, "processing_fee_pct": 0.5, "max_amount": 5000000, "min_amount": 100000, "max_tenure_months": 84, "min_tenure_months": 12, "foreclosure_charge_pct": 2.5, "min_income": 18000, "min_credit_score": 650, "features": ["Tata group assurance", "Used car finance"], "is_active": True},
    {"product_id": "axis_car", "bank_name": "Axis Bank", "product_name": "Axis Car Loan", "loan_type": "car", "interest_rate": 8.70, "processing_fee_pct": 0.5, "max_amount": 5000000, "min_amount": 100000, "max_tenure_months": 84, "min_tenure_months": 12, "foreclosure_charge_pct": 3.0, "min_income": 20000, "min_credit_score": 675, "features": ["Instant approval", "EV car loans"], "is_active": True},
    {"product_id": "pnb_car", "bank_name": "PNB", "product_name": "PNB Car Loan", "loan_type": "car", "interest_rate": 8.55, "processing_fee_pct": 0.35, "max_amount": 3000000, "min_amount": 100000, "max_tenure_months": 84, "min_tenure_months": 12, "foreclosure_charge_pct": 2.0, "min_income": 18000, "min_credit_score": 650, "features": ["Low processing fee", "Govt bank trust"], "is_active": True},
    # Gold Loans
    {"product_id": "sbi_gold", "bank_name": "SBI", "product_name": "SBI Gold Loan", "loan_type": "gold", "interest_rate": 7.5, "processing_fee_pct": 0.5, "max_amount": 5000000, "min_amount": 20000, "max_tenure_months": 36, "min_tenure_months": 3, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["No income proof needed", "Quick disbursal in 30 mins"], "is_active": True},
    {"product_id": "hdfc_gold", "bank_name": "HDFC Bank", "product_name": "HDFC Gold Loan", "loan_type": "gold", "interest_rate": 8.0, "processing_fee_pct": 1.0, "max_amount": 5000000, "min_amount": 25000, "max_tenure_months": 24, "min_tenure_months": 3, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["Instant valuation", "Doorstep service", "No foreclosure"], "is_active": True},
    {"product_id": "muthoot_gold", "bank_name": "Muthoot Finance", "product_name": "Muthoot Gold Loan", "loan_type": "gold", "interest_rate": 9.0, "processing_fee_pct": 0, "max_amount": 10000000, "min_amount": 1500, "max_tenure_months": 12, "min_tenure_months": 3, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["Zero processing fee", "Pan-India branches", "Instant cash"], "is_active": True},
    {"product_id": "manappuram_gold", "bank_name": "Manappuram Finance", "product_name": "Manappuram Gold Loan", "loan_type": "gold", "interest_rate": 9.9, "processing_fee_pct": 0, "max_amount": 5000000, "min_amount": 1500, "max_tenure_months": 12, "min_tenure_months": 1, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["Online gold loan", "Lowest min amount", "Flexible repayment"], "is_active": True},
    {"product_id": "canara_gold", "bank_name": "Canara Bank", "product_name": "Canara Gold Loan", "loan_type": "gold", "interest_rate": 7.35, "processing_fee_pct": 0.25, "max_amount": 3500000, "min_amount": 10000, "max_tenure_months": 36, "min_tenure_months": 3, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["One of lowest rates", "Govt bank safety", "No income docs"], "is_active": True},
    # Used Vehicle / 2nd Hand Purchase Loans
    {"product_id": "hdfc_used_car", "bank_name": "HDFC Bank", "product_name": "HDFC Used Car Loan", "loan_type": "used_vehicle", "interest_rate": 11.5, "processing_fee_pct": 1.5, "max_amount": 2500000, "min_amount": 100000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 5.0, "min_income": 18000, "min_credit_score": 650, "features": ["Up to 7 yr old vehicles", "Dealer tie-ups"], "is_active": True},
    {"product_id": "icici_used_car", "bank_name": "ICICI Bank", "product_name": "ICICI Used Car Loan", "loan_type": "used_vehicle", "interest_rate": 11.0, "processing_fee_pct": 1.5, "max_amount": 3000000, "min_amount": 100000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 5.0, "min_income": 18000, "min_credit_score": 650, "features": ["Cars up to 10 yrs old", "Doorstep inspection"], "is_active": True},
    {"product_id": "axis_used_car", "bank_name": "Axis Bank", "product_name": "Axis Used Car Loan", "loan_type": "used_vehicle", "interest_rate": 11.75, "processing_fee_pct": 1.0, "max_amount": 2500000, "min_amount": 100000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 4.0, "min_income": 20000, "min_credit_score": 675, "features": ["Certified pre-owned", "Quick valuation"], "is_active": True},
    {"product_id": "tata_used_car", "bank_name": "Tata Capital", "product_name": "Tata Capital Used Vehicle Loan", "loan_type": "used_vehicle", "interest_rate": 12.0, "processing_fee_pct": 1.5, "max_amount": 2000000, "min_amount": 50000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 3.0, "min_income": 15000, "min_credit_score": 625, "features": ["Used 2-wheelers too", "Pan-India service"], "is_active": True},
    # Plot / Land Purchase Loans
    {"product_id": "sbi_plot", "bank_name": "SBI", "product_name": "SBI Plot Loan", "loan_type": "plot", "interest_rate": 8.7, "processing_fee_pct": 0.35, "max_amount": 30000000, "min_amount": 500000, "max_tenure_months": 180, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 25000, "min_credit_score": 650, "features": ["No foreclosure charges", "Tax benefits", "Realty Plus scheme"], "is_active": True},
    {"product_id": "hdfc_plot", "bank_name": "HDFC Bank", "product_name": "HDFC Plot Loan", "loan_type": "plot", "interest_rate": 9.0, "processing_fee_pct": 0.50, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 180, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 30000, "min_credit_score": 700, "features": ["Construction linked plans", "Balance transfer"], "is_active": True},
    {"product_id": "pnb_plot", "bank_name": "PNB", "product_name": "PNB Plot Loan", "loan_type": "plot", "interest_rate": 8.55, "processing_fee_pct": 0.25, "max_amount": 20000000, "min_amount": 300000, "max_tenure_months": 180, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 20000, "min_credit_score": 650, "features": ["Lowest govt bank rate", "Rural plots eligible"], "is_active": True},
    {"product_id": "bob_plot", "bank_name": "Bank of Baroda", "product_name": "Baroda Plot Loan", "loan_type": "plot", "interest_rate": 8.65, "processing_fee_pct": 0.25, "max_amount": 20000000, "min_amount": 300000, "max_tenure_months": 180, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 18000, "min_credit_score": 625, "features": ["Low processing fee", "Construction top-up available"], "is_active": True},
    # Loan Against Mutual Funds
    {"product_id": "hdfc_mf_loan", "bank_name": "HDFC Bank", "product_name": "HDFC Loan Against Mutual Funds", "loan_type": "mutual_funds", "interest_rate": 9.5, "processing_fee_pct": 0.5, "max_amount": 10000000, "min_amount": 50000, "max_tenure_months": 36, "min_tenure_months": 6, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["Continue earning MF returns", "No income proof", "Overdraft facility"], "is_active": True},
    {"product_id": "icici_mf_loan", "bank_name": "ICICI Bank", "product_name": "ICICI Loan Against Mutual Funds", "loan_type": "mutual_funds", "interest_rate": 9.0, "processing_fee_pct": 0.5, "max_amount": 10000000, "min_amount": 25000, "max_tenure_months": 36, "min_tenure_months": 6, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["Digital pledge process", "Retain fund ownership", "No prepayment penalty"], "is_active": True},
    {"product_id": "kotak_mf_loan", "bank_name": "Kotak Mahindra", "product_name": "Kotak Loan Against Mutual Funds", "loan_type": "mutual_funds", "interest_rate": 9.25, "processing_fee_pct": 0, "max_amount": 5000000, "min_amount": 50000, "max_tenure_months": 36, "min_tenure_months": 6, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["Zero processing fee", "Online process", "Quick disbursement"], "is_active": True},
    {"product_id": "axis_mf_loan", "bank_name": "Axis Bank", "product_name": "Axis Loan Against Mutual Funds", "loan_type": "mutual_funds", "interest_rate": 9.75, "processing_fee_pct": 0.5, "max_amount": 5000000, "min_amount": 25000, "max_tenure_months": 36, "min_tenure_months": 6, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["Instant online pledge", "Overdraft & term loan options"], "is_active": True},
    # Refinance / Balance Transfer Loans
    {"product_id": "sbi_refinance", "bank_name": "SBI", "product_name": "SBI Balance Transfer", "loan_type": "refinance", "interest_rate": 8.5, "processing_fee_pct": 0.5, "max_amount": 50000000, "min_amount": 200000, "max_tenure_months": 360, "min_tenure_months": 12, "foreclosure_charge_pct": 0, "min_income": 20000, "min_credit_score": 650, "features": ["Lower your existing rate", "Zero foreclosure", "Top-up available"], "is_active": True},
    {"product_id": "hdfc_refinance", "bank_name": "HDFC Bank", "product_name": "HDFC Balance Transfer", "loan_type": "refinance", "interest_rate": 8.75, "processing_fee_pct": 0.5, "max_amount": 50000000, "min_amount": 200000, "max_tenure_months": 360, "min_tenure_months": 12, "foreclosure_charge_pct": 0, "min_income": 25000, "min_credit_score": 675, "features": ["Switch in 7 days", "No hidden charges", "Online tracking"], "is_active": True},
    {"product_id": "icici_refinance", "bank_name": "ICICI Bank", "product_name": "ICICI Balance Transfer", "loan_type": "refinance", "interest_rate": 8.65, "processing_fee_pct": 0.5, "max_amount": 50000000, "min_amount": 200000, "max_tenure_months": 360, "min_tenure_months": 12, "foreclosure_charge_pct": 0, "min_income": 25000, "min_credit_score": 675, "features": ["Quick processing", "Rate match guarantee", "Doorstep service"], "is_active": True},
    {"product_id": "axis_refinance", "bank_name": "Axis Bank", "product_name": "Axis Balance Transfer", "loan_type": "refinance", "interest_rate": 8.70, "processing_fee_pct": 1.0, "max_amount": 50000000, "min_amount": 200000, "max_tenure_months": 360, "min_tenure_months": 12, "foreclosure_charge_pct": 0, "min_income": 25000, "min_credit_score": 675, "features": ["Easy switch process", "Top-up option", "EMI reduction"], "is_active": True},
    # Business Term Loans
    {"product_id": "sbi_business", "bank_name": "SBI", "product_name": "SBI SME Business Loan", "loan_type": "business", "interest_rate": 10.0, "processing_fee_pct": 1.0, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 84, "min_tenure_months": 12, "foreclosure_charge_pct": 2.0, "min_income": 30000, "min_credit_score": 650, "features": ["Govt scheme benefits", "Collateral-free up to 1Cr", "Stand-Up India eligible"], "is_active": True, "corporate_tieups": ["psu", "SAIL", "govt"], "available_regions": ["pan_india"]},
    {"product_id": "hdfc_business", "bank_name": "HDFC Bank", "product_name": "HDFC Business Growth Loan", "loan_type": "business", "interest_rate": 11.5, "processing_fee_pct": 2.0, "max_amount": 75000000, "min_amount": 500000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 4.0, "min_income": 40000, "min_credit_score": 700, "features": ["Instant pre-approved", "Online application", "Flexible repayment"], "is_active": True, "corporate_tieups": ["gcc", "private"], "available_regions": ["pan_india"]},
    {"product_id": "icici_business", "bank_name": "ICICI Bank", "product_name": "ICICI InstaBIZ Business Loan", "loan_type": "business", "interest_rate": 11.0, "processing_fee_pct": 2.0, "max_amount": 50000000, "min_amount": 300000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 4.0, "min_income": 35000, "min_credit_score": 700, "features": ["Digital process", "Same-day disbursement", "No branch visit"], "is_active": True, "corporate_tieups": ["gcc", "private"], "available_regions": ["pan_india"]},
    {"product_id": "axis_business", "bank_name": "Axis Bank", "product_name": "Axis Business Term Loan", "loan_type": "business", "interest_rate": 11.25, "processing_fee_pct": 1.5, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 3.0, "min_income": 35000, "min_credit_score": 680, "features": ["End-use flexibility", "No collateral up to 75L", "Quick turnaround"], "is_active": True, "corporate_tieups": [], "available_regions": ["pan_india"]},
    {"product_id": "bob_business", "bank_name": "Bank of Baroda", "product_name": "Baroda MSME Loan", "loan_type": "business", "interest_rate": 9.75, "processing_fee_pct": 0.5, "max_amount": 25000000, "min_amount": 200000, "max_tenure_months": 84, "min_tenure_months": 12, "foreclosure_charge_pct": 0, "min_income": 20000, "min_credit_score": 625, "features": ["Mudra scheme eligible", "Low processing fee", "Govt subsidy available"], "is_active": True, "corporate_tieups": ["psu", "SAIL", "govt"], "available_regions": ["pan_india"]},
    # MSME / Mudra Loans
    {"product_id": "sbi_mudra", "bank_name": "SBI", "product_name": "SBI Mudra Loan (Shishu/Kishore/Tarun)", "loan_type": "msme", "interest_rate": 8.5, "processing_fee_pct": 0, "max_amount": 1000000, "min_amount": 10000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["Zero processing fee", "No collateral", "Shishu: up to 50K, Kishore: up to 5L, Tarun: up to 10L"], "is_active": True, "corporate_tieups": [], "available_regions": ["pan_india"]},
    {"product_id": "pnb_mudra", "bank_name": "PNB", "product_name": "PNB Mudra Loan", "loan_type": "msme", "interest_rate": 9.0, "processing_fee_pct": 0, "max_amount": 1000000, "min_amount": 10000, "max_tenure_months": 60, "min_tenure_months": 12, "foreclosure_charge_pct": 0, "min_income": 0, "min_credit_score": 0, "features": ["Zero processing fee", "Govt backed scheme", "Quick approval"], "is_active": True, "corporate_tieups": ["psu", "govt"], "available_regions": ["pan_india"]},
    {"product_id": "canara_msme", "bank_name": "Canara Bank", "product_name": "Canara MSME Loan", "loan_type": "msme", "interest_rate": 9.5, "processing_fee_pct": 0.25, "max_amount": 5000000, "min_amount": 100000, "max_tenure_months": 84, "min_tenure_months": 12, "foreclosure_charge_pct": 0, "min_income": 15000, "min_credit_score": 600, "features": ["CGTMSE coverage", "Low interest for women", "Priority sector benefits"], "is_active": True, "corporate_tieups": ["psu"], "available_regions": ["pan_india"]},
    {"product_id": "sidbi_msme", "bank_name": "SIDBI", "product_name": "SIDBI MSME Assistance", "loan_type": "msme", "interest_rate": 9.25, "processing_fee_pct": 0.5, "max_amount": 25000000, "min_amount": 500000, "max_tenure_months": 84, "min_tenure_months": 24, "foreclosure_charge_pct": 0, "min_income": 25000, "min_credit_score": 650, "features": ["Direct MSME lender", "Technology upgrade loans", "Cluster development"], "is_active": True, "corporate_tieups": ["psu", "SAIL"], "available_regions": ["pan_india"]},
    # Working Capital Loans
    {"product_id": "sbi_wc", "bank_name": "SBI", "product_name": "SBI Working Capital Loan", "loan_type": "working_capital", "interest_rate": 9.5, "processing_fee_pct": 0.5, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 12, "min_tenure_months": 3, "foreclosure_charge_pct": 0, "min_income": 30000, "min_credit_score": 650, "features": ["Cash credit facility", "Overdraft available", "Revolving credit line"], "is_active": True, "corporate_tieups": ["psu", "SAIL", "govt"], "available_regions": ["pan_india"]},
    {"product_id": "hdfc_wc", "bank_name": "HDFC Bank", "product_name": "HDFC Working Capital", "loan_type": "working_capital", "interest_rate": 10.5, "processing_fee_pct": 1.0, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 12, "min_tenure_months": 3, "foreclosure_charge_pct": 0, "min_income": 40000, "min_credit_score": 700, "features": ["Digital monitoring", "Flexible limits", "Quick renewal"], "is_active": True, "corporate_tieups": ["gcc", "private"], "available_regions": ["pan_india"]},
    {"product_id": "icici_wc", "bank_name": "ICICI Bank", "product_name": "ICICI Working Capital Finance", "loan_type": "working_capital", "interest_rate": 10.25, "processing_fee_pct": 1.0, "max_amount": 50000000, "min_amount": 300000, "max_tenure_months": 12, "min_tenure_months": 3, "foreclosure_charge_pct": 0, "min_income": 35000, "min_credit_score": 680, "features": ["Online facility management", "Trade finance combo", "Supply chain finance"], "is_active": True, "corporate_tieups": ["gcc"], "available_regions": ["pan_india"]},
    # Loan Against Property (LAP) for Business
    {"product_id": "sbi_lap", "bank_name": "SBI", "product_name": "SBI Loan Against Property", "loan_type": "lap", "interest_rate": 8.75, "processing_fee_pct": 0.5, "max_amount": 75000000, "min_amount": 500000, "max_tenure_months": 180, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 25000, "min_credit_score": 650, "features": ["Lowest LAP rates", "Long tenure", "No end-use restriction"], "is_active": True, "corporate_tieups": ["psu", "SAIL", "govt"], "available_regions": ["pan_india"]},
    {"product_id": "hdfc_lap", "bank_name": "HDFC Bank", "product_name": "HDFC Loan Against Property", "loan_type": "lap", "interest_rate": 9.5, "processing_fee_pct": 1.0, "max_amount": 100000000, "min_amount": 500000, "max_tenure_months": 180, "min_tenure_months": 60, "foreclosure_charge_pct": 2.0, "min_income": 30000, "min_credit_score": 700, "features": ["High LTV ratio", "Balance transfer option", "Doorstep service"], "is_active": True, "corporate_tieups": ["gcc", "private"], "available_regions": ["pan_india"]},
    {"product_id": "axis_lap", "bank_name": "Axis Bank", "product_name": "Axis Loan Against Property", "loan_type": "lap", "interest_rate": 9.75, "processing_fee_pct": 1.0, "max_amount": 50000000, "min_amount": 500000, "max_tenure_months": 180, "min_tenure_months": 60, "foreclosure_charge_pct": 2.0, "min_income": 30000, "min_credit_score": 680, "features": ["Commercial & residential property", "Top-up facility", "Online tracking"], "is_active": True, "corporate_tieups": [], "available_regions": ["pan_india"]},
    {"product_id": "pnb_lap", "bank_name": "PNB", "product_name": "PNB Loan Against Property", "loan_type": "lap", "interest_rate": 8.85, "processing_fee_pct": 0.5, "max_amount": 50000000, "min_amount": 300000, "max_tenure_months": 180, "min_tenure_months": 60, "foreclosure_charge_pct": 0, "min_income": 20000, "min_credit_score": 625, "features": ["No foreclosure on floating", "Govt bank trust", "Low processing fee"], "is_active": True, "corporate_tieups": ["psu", "SAIL", "govt"], "available_regions": ["pan_india"]},
]

# Corporate tie-up and region metadata to patch onto existing products
PRODUCT_METADATA = {
    "sbi_personal": {"corporate_tieups": ["psu", "SAIL", "govt", "defence"], "available_regions": ["pan_india"]},
    "hdfc_personal": {"corporate_tieups": ["gcc", "private", "TCS", "Infosys", "Wipro"], "available_regions": ["pan_india"]},
    "icici_personal": {"corporate_tieups": ["gcc", "private", "Cognizant", "HCL"], "available_regions": ["pan_india"]},
    "bajaj_personal": {"corporate_tieups": ["private"], "available_regions": ["pan_india"]},
    "kotak_personal": {"corporate_tieups": ["gcc", "private"], "available_regions": ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Telangana", "Gujarat"]},
    "axis_personal": {"corporate_tieups": ["gcc", "private"], "available_regions": ["pan_india"]},
    "indusind_personal": {"corporate_tieups": ["private"], "available_regions": ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Telangana", "Gujarat", "West Bengal"]},
    "idfc_personal": {"corporate_tieups": [], "available_regions": ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Telangana", "Gujarat", "Rajasthan"]},
    "yes_personal": {"corporate_tieups": ["private"], "available_regions": ["pan_india"]},
    "pnb_personal": {"corporate_tieups": ["psu", "SAIL", "govt", "defence"], "available_regions": ["pan_india"]},
    "bob_personal": {"corporate_tieups": ["psu", "SAIL", "govt"], "available_regions": ["pan_india"]},
    "tata_personal": {"corporate_tieups": ["private", "Tata Group"], "available_regions": ["pan_india"]},
    "canara_personal": {"corporate_tieups": ["psu", "govt"], "available_regions": ["pan_india"]},
    "sbi_home": {"corporate_tieups": ["psu", "SAIL", "govt", "defence"], "available_regions": ["pan_india"]},
    "hdfc_home": {"corporate_tieups": ["gcc", "private", "TCS", "Infosys"], "available_regions": ["pan_india"]},
    "icici_home": {"corporate_tieups": ["gcc", "private"], "available_regions": ["pan_india"]},
    "axis_home": {"corporate_tieups": ["gcc", "private"], "available_regions": ["pan_india"]},
    "lic_home": {"corporate_tieups": ["psu", "govt", "LIC agents"], "available_regions": ["pan_india"]},
    "pnb_home": {"corporate_tieups": ["psu", "SAIL", "govt", "defence"], "available_regions": ["pan_india"]},
    "bob_home": {"corporate_tieups": ["psu", "govt"], "available_regions": ["pan_india"]},
    "canara_home": {"corporate_tieups": ["psu", "govt"], "available_regions": ["pan_india"]},
    "federal_home": {"corporate_tieups": [], "available_regions": ["Kerala", "Karnataka", "Tamil Nadu", "Maharashtra", "Delhi", "Gujarat"]},
    "union_home": {"corporate_tieups": ["psu", "govt"], "available_regions": ["pan_india"]},
    "sbi_car": {"corporate_tieups": ["psu", "SAIL", "govt", "defence"], "available_regions": ["pan_india"]},
    "hdfc_car": {"corporate_tieups": ["gcc", "private", "TCS"], "available_regions": ["pan_india"]},
    "icici_car": {"corporate_tieups": ["gcc", "private"], "available_regions": ["pan_india"]},
    "axis_car": {"corporate_tieups": ["private"], "available_regions": ["pan_india"]},
    "tata_car": {"corporate_tieups": ["Tata Group", "private"], "available_regions": ["pan_india"]},
    "pnb_car": {"corporate_tieups": ["psu", "SAIL", "govt"], "available_regions": ["pan_india"]},
    "sbi_gold": {"corporate_tieups": [], "available_regions": ["pan_india"]},
    "hdfc_gold": {"corporate_tieups": [], "available_regions": ["pan_india"]},
    "muthoot_gold": {"corporate_tieups": [], "available_regions": ["Kerala", "Tamil Nadu", "Karnataka", "Andhra Pradesh", "Telangana", "Maharashtra", "Delhi", "Gujarat"]},
    "manappuram_gold": {"corporate_tieups": [], "available_regions": ["Kerala", "Tamil Nadu", "Karnataka", "Andhra Pradesh", "Telangana", "Maharashtra"]},
    "canara_gold": {"corporate_tieups": [], "available_regions": ["pan_india"]},
    "sbi_refinance": {"corporate_tieups": ["psu", "govt"], "available_regions": ["pan_india"]},
    "hdfc_refinance": {"corporate_tieups": ["gcc", "private"], "available_regions": ["pan_india"]},
    "icici_refinance": {"corporate_tieups": ["gcc", "private"], "available_regions": ["pan_india"]},
    "axis_refinance": {"corporate_tieups": ["private"], "available_regions": ["pan_india"]},
}


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
        logger.info(f"Admin seeded: {admin_email}")
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
