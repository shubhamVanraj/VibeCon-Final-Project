"""
Iteration 16 — Backend integration tests for Phase 2 refactor + new endpoints.

Covers:
- REGRESSION: /api/loans/products (72 products expected)
- REGRESSION: profile create + /api/loans/recommendations (uses services/recommendation.py)
- REGRESSION: auth flow (login/me/logout) with admin creds
- NEW: GET /api/credit-score/check (mock, score in 300-900, recommendations[], is_mock=True)
- NEW: GET /api/credit-score/report (returns cached after check)
- NEW: POST /api/aa/consent/request → handle + redirect_url + status:PENDING
- NEW: GET /api/aa/consent/status/{handle} → APPROVED + consent_id
- NEW: POST /api/aa/fi-data/fetch → summary.avg_monthly_balance etc.
- NEW: POST /api/aa/consent/revoke → marks REVOKED in DB
- NEW: 401 when unauthenticated
- NEW: Audit log entries created for the 4 new actions
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://loan-compare-9.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@rinkosh.com"
ADMIN_PASSWORD = "Admin@123"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed [{r.status_code}]: {r.text[:200]}")
    return s


@pytest.fixture(scope="module")
def fresh_user_session():
    """Create a brand-new user (so no prior credit-score / consent rows)."""
    s = requests.Session()
    email = f"test_iter16_{uuid.uuid4().hex[:8]}@rinkosh.test"
    pwd = "TestPass@123"
    reg = s.post(f"{BASE_URL}/api/auth/register",
                 json={"email": email, "password": pwd, "name": "Iter16 Tester"},
                 timeout=15)
    if reg.status_code not in (200, 201):
        # fallback to login if maybe already created
        log = s.post(f"{BASE_URL}/api/auth/login",
                     json={"email": email, "password": pwd}, timeout=15)
        if log.status_code != 200:
            pytest.skip(f"User register failed [{reg.status_code}]: {reg.text[:200]}")
    return s, email


# ---------- REGRESSION: Loan products ----------
def test_loan_products_returns_72():
    r = requests.get(f"{BASE_URL}/api/loans/products", timeout=15)
    assert r.status_code == 200
    data = r.json()
    products = data if isinstance(data, list) else data.get("products", data)
    assert isinstance(products, list)
    assert len(products) == 72, f"Expected 72 products, got {len(products)}"
    # Spot-check shape
    p0 = products[0]
    for f in ("product_id", "bank_name", "product_name", "loan_type", "interest_rate"):
        assert f in p0, f"missing field {f} in product"


# ---------- REGRESSION: Auth flow ----------
def test_auth_login_me_logout(admin_session):
    me = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert me.status_code == 200
    me_data = me.json()
    assert me_data.get("email") == ADMIN_EMAIL
    # logout endpoint
    lo = admin_session.post(f"{BASE_URL}/api/auth/logout", timeout=15)
    assert lo.status_code in (200, 204)


# ---------- REGRESSION: Profile + Recommendations ----------
def test_recommendations_after_profile(fresh_user_session):
    s, _ = fresh_user_session
    profile = {
        "loan_type": "personal", "desired_amount": 500000, "tenure_months": 36,
        "monthly_income": 80000, "credit_score": 750, "employment_type": "salaried",
        "employer_type": "gcc", "employer_name": "TCS",
        "existing_loans": False, "state": "Karnataka", "city": "Bangalore",
        "age": 30, "name": "Iter16 Tester",
    }
    pr = s.put(f"{BASE_URL}/api/user/profile", json=profile, timeout=15)
    assert pr.status_code in (200, 201), pr.text[:300]
    rec = s.get(f"{BASE_URL}/api/loans/recommendations", timeout=20)
    assert rec.status_code == 200, rec.text[:300]
    data = rec.json()
    items = data if isinstance(data, list) else data.get("recommendations", data.get("items", []))
    assert isinstance(items, list) and len(items) > 0, "No recommendations returned"
    first = items[0]
    # Approval probability surface from extracted services/recommendation.py
    assert "approval_probability" in first or "score" in first, \
        f"Missing approval_probability/score in: {list(first.keys())}"


# ---------- NEW: Credit Score ----------
def test_credit_score_check_returns_mock_report(fresh_user_session):
    s, _ = fresh_user_session
    r = s.get(f"{BASE_URL}/api/credit-score/check", timeout=20)
    assert r.status_code == 200, r.text[:300]
    rep = r.json()
    assert 300 <= rep["score"] <= 900
    assert rep["band"] in ("Poor", "Fair", "Good", "Very Good", "Excellent")
    assert isinstance(rep["recommendations"], list) and len(rep["recommendations"]) >= 1
    assert rep["is_mock"] is True
    assert rep["provider"] == "mock"
    assert rep["bureau"] == "CIBIL"


def test_credit_score_report_returns_cached(fresh_user_session):
    s, _ = fresh_user_session
    # ensure a check happened first
    s.get(f"{BASE_URL}/api/credit-score/check", timeout=20)
    r = s.get(f"{BASE_URL}/api/credit-score/report", timeout=15)
    assert r.status_code == 200
    rep = r.json()
    assert 300 <= rep["score"] <= 900
    assert rep["is_mock"] is True


def test_credit_score_unauth_401():
    r = requests.get(f"{BASE_URL}/api/credit-score/check", timeout=15)
    assert r.status_code == 401, f"Expected 401 unauth, got {r.status_code}"


# ---------- NEW: Account Aggregator flow ----------
@pytest.fixture(scope="module")
def aa_consent_handle(fresh_user_session):
    s, _ = fresh_user_session
    r = s.post(f"{BASE_URL}/api/aa/consent/request",
               json={"fi_types": ["DEPOSIT", "EPF"]}, timeout=15)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert data["consent_handle"].startswith("chdl_")
    assert data["status"] == "PENDING"
    assert "redirect_url" in data and data["redirect_url"]
    return s, data["consent_handle"]


def test_aa_consent_request(aa_consent_handle):
    s, handle = aa_consent_handle
    assert handle.startswith("chdl_")


def test_aa_consent_status_approves(aa_consent_handle):
    s, handle = aa_consent_handle
    # mock auto-approves on first poll
    r = s.get(f"{BASE_URL}/api/aa/consent/status/{handle}", timeout=15)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert data["status"] == "APPROVED"
    assert data.get("consent_id", "").startswith("cnst_")


def test_aa_fi_data_fetch_then_revoke(aa_consent_handle):
    s, handle = aa_consent_handle
    # Ensure approved + get consent_id
    status = s.get(f"{BASE_URL}/api/aa/consent/status/{handle}", timeout=15).json()
    consent_id = status["consent_id"]

    # Fetch FI data
    r = s.post(f"{BASE_URL}/api/aa/fi-data/fetch",
               json={"consent_id": consent_id}, timeout=20)
    assert r.status_code == 200, r.text[:300]
    packet = r.json()
    summary = packet["fi_data"]["summary"]
    assert summary["avg_monthly_balance"] > 0
    assert summary["salary_credits_last_3mo"] >= 0
    assert packet["is_mock"] is True

    # Revoke
    rv = s.post(f"{BASE_URL}/api/aa/consent/revoke",
                json={"consent_id": consent_id}, timeout=15)
    assert rv.status_code == 200, rv.text[:300]

    # Verify it's now REVOKED in DB via status endpoint
    after = s.get(f"{BASE_URL}/api/aa/consent/status/{handle}", timeout=15).json()
    assert after["status"] == "REVOKED", f"Expected REVOKED, got {after.get('status')}"


def test_aa_endpoints_require_auth():
    for method, path, payload in [
        ("post", "/api/aa/consent/request", {"fi_types": ["DEPOSIT"]}),
        ("get",  "/api/aa/consent/status/chdl_xxx", None),
        ("post", "/api/aa/fi-data/fetch", {"consent_id": "cnst_x"}),
        ("post", "/api/aa/consent/revoke", {"consent_id": "cnst_x"}),
    ]:
        if method == "get":
            r = requests.get(f"{BASE_URL}{path}", timeout=15)
        else:
            r = requests.post(f"{BASE_URL}{path}", json=payload, timeout=15)
        assert r.status_code == 401, f"{method.upper()} {path} expected 401, got {r.status_code}"


# ---------- NEW: Audit log entries ----------
def test_audit_log_entries_created(admin_session, fresh_user_session):
    """Admin can view audit log; verify expected actions were recorded."""
    # Re-login admin since fixtures earlier logged out
    s_admin = requests.Session()
    lg = s_admin.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert lg.status_code == 200

    # Trigger one of each action via fresh user (already done above, but be safe)
    su, _ = fresh_user_session
    # re-login user since admin login above doesn't affect them
    time.sleep(0.5)

    r = s_admin.get(f"{BASE_URL}/api/admin/audit-logs?limit=200", timeout=20)
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    logs = body if isinstance(body, list) else body.get("logs", body.get("items", []))
    actions = {l.get("action") for l in logs}
    expected = {"credit_score_fetched", "aa_consent_requested",
                "aa_fi_data_fetched", "aa_consent_revoked"}
    missing = expected - actions
    assert not missing, f"Missing audit actions: {missing}. Got: {sorted(actions)[:30]}"
