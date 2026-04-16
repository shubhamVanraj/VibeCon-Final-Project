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

    return {
        "user_id": user_id, "email": email, "name": data.name,
        "role": "user", "auth_type": "email", "has_profile": False
    }


@api_router.post("/auth/login")
async def login(data: UserLogin, request: Request, response: Response):
    email = data.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # Brute force check
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("attempts", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until:
            if isinstance(locked_until, str):
                locked_until = datetime.fromisoformat(locked_until)
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if locked_until > datetime.now(timezone.utc):
                raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
            else:
                await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"attempts": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(data.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"attempts": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})

    profile = await db.user_profiles.find_one({"user_id": user["user_id"], "onboarding_complete": True})
    has_profile = profile is not None

    access_token = create_access_token(user["user_id"], email)
    refresh_token = create_refresh_token(user["user_id"])
    set_auth_cookies(response, access_token, refresh_token)

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
    if profile.get("credit_score"):
        cs = profile["credit_score"]
        if cs >= 750:
            score += 30
        elif cs >= 700:
            score += 20
        elif cs >= 650:
            score += 10
        else:
            score -= 10
    if profile.get("monthly_income") and product.get("min_income") and product["min_income"] > 0:
        ratio = profile["monthly_income"] / product["min_income"]
        if ratio >= 2:
            score += 15
        elif ratio >= 1.5:
            score += 10
        elif ratio >= 1:
            score += 5
        else:
            score -= 20
    if profile.get("existing_loans"):
        score -= 10
        if profile.get("existing_loan_emi") and profile.get("monthly_income") and profile["monthly_income"] > 0:
            emi_ratio = profile["existing_loan_emi"] / profile["monthly_income"]
            if emi_ratio > 0.5:
                score -= 15
            elif emi_ratio > 0.3:
                score -= 5
    else:
        score += 5
    return max(5, min(95, score))


@api_router.get("/loans/products")
async def get_loan_products(loan_type: Optional[str] = None):
    query = {"is_active": True}
    if loan_type:
        query["loan_type"] = loan_type
    products = await db.loan_products.find(query, {"_id": 0}).to_list(100)
    return products


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

    recommendations = []
    for product in products:
        cost = calculate_total_cost(desired_amount, product["interest_rate"], desired_tenure, product["processing_fee_pct"], product.get("foreclosure_charge_pct", 0))
        approval_prob = calculate_approval_probability(profile, product)
        recommendations.append({
            **product, **cost,
            "approval_probability": approval_prob,
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

    response_text = await chat.send_message(UserMessage(text=data.message))
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

    response_text = await chat.send_message(UserMessage(text=data.text))
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
]


async def seed_loan_products():
    count = await db.loan_products.count_documents({})
    if count == 0:
        await db.loan_products.insert_many(LOAN_PRODUCTS)
        logger.info(f"Seeded {len(LOAN_PRODUCTS)} loan products")


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
