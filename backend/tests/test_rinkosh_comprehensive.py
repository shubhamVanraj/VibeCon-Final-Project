"""
Comprehensive Backend Tests for Rinkosh Loan Comparison Platform
Tests: Auth, Loans, Recommendations, Leads, Admin, Analytics, AI endpoints
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_USER_EMAIL = f"test_{uuid.uuid4().hex[:8]}@rinkosh.com"
TEST_USER_PASSWORD = "Test@1234"
TEST_USER_NAME = "Test User"

# Existing test user with profile
EXISTING_USER_EMAIL = "fulltest@r.com"
EXISTING_USER_PASSWORD = "Test@1234"

# Admin credentials
ADMIN_EMAIL = "admin@rinkosh.com"
ADMIN_PASSWORD = "Admin@123"


class TestHealthAndBasics:
    """Health check and basic API tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Health endpoint working")


class TestLoanProducts:
    """Loan products API tests - 56 products across 10 categories"""
    
    def test_get_all_products(self):
        """GET /api/loans/products returns 56 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 56, f"Expected 56 products, got {len(products)}"
        print(f"✓ Got {len(products)} loan products")
    
    def test_products_have_required_fields(self):
        """Each product has required fields"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        products = response.json()
        required_fields = ["product_id", "bank_name", "product_name", "loan_type", 
                          "interest_rate", "processing_fee_pct", "max_amount", "min_amount"]
        for product in products[:5]:  # Check first 5
            for field in required_fields:
                assert field in product, f"Missing field {field} in product"
        print("✓ Products have all required fields")
    
    def test_filter_by_loan_type_personal(self):
        """Filter products by loan_type=personal returns 13 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=personal")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 13, f"Expected 13 personal loans, got {len(products)}"
        for p in products:
            assert p["loan_type"] == "personal"
        print(f"✓ Personal loans filter: {len(products)} products")
    
    def test_filter_by_loan_type_home(self):
        """Filter products by loan_type=home returns 10 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=home")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 10, f"Expected 10 home loans, got {len(products)}"
        print(f"✓ Home loans filter: {len(products)} products")
    
    def test_filter_by_loan_type_car(self):
        """Filter products by loan_type=car returns 6 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=car")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 6, f"Expected 6 car loans, got {len(products)}"
        print(f"✓ Car loans filter: {len(products)} products")
    
    def test_filter_by_loan_type_bike(self):
        """Filter products by loan_type=bike returns 3 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=bike")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 3, f"Expected 3 bike loans, got {len(products)}"
        print(f"✓ Bike loans filter: {len(products)} products")
    
    def test_filter_by_loan_type_education(self):
        """Filter products by loan_type=education returns 3 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=education")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 3, f"Expected 3 education loans, got {len(products)}"
        print(f"✓ Education loans filter: {len(products)} products")
    
    def test_filter_by_loan_type_gold(self):
        """Filter products by loan_type=gold returns 5 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=gold")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 5, f"Expected 5 gold loans, got {len(products)}"
        print(f"✓ Gold loans filter: {len(products)} products")
    
    def test_filter_by_loan_type_used_vehicle(self):
        """Filter products by loan_type=used_vehicle returns 4 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=used_vehicle")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 4, f"Expected 4 used vehicle loans, got {len(products)}"
        print(f"✓ Used vehicle loans filter: {len(products)} products")
    
    def test_filter_by_loan_type_plot(self):
        """Filter products by loan_type=plot returns 4 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=plot")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 4, f"Expected 4 plot loans, got {len(products)}"
        print(f"✓ Plot loans filter: {len(products)} products")
    
    def test_filter_by_loan_type_mutual_funds(self):
        """Filter products by loan_type=mutual_funds returns 4 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=mutual_funds")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 4, f"Expected 4 MF loans, got {len(products)}"
        print(f"✓ Mutual funds loans filter: {len(products)} products")
    
    def test_filter_by_loan_type_refinance(self):
        """Filter products by loan_type=refinance returns 4 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=refinance")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 4, f"Expected 4 refinance loans, got {len(products)}"
        print(f"✓ Refinance loans filter: {len(products)} products")


class TestLoanStats:
    """Loan stats API tests"""
    
    def test_get_loan_stats(self):
        """GET /api/loans/stats returns stats with categories and top_banks"""
        response = requests.get(f"{BASE_URL}/api/loans/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_products" in data
        assert "total_banks" in data
        assert "total_categories" in data
        assert "categories" in data
        assert "top_banks" in data
        assert data["total_products"] == 56
        assert data["total_categories"] == 10
        print(f"✓ Loan stats: {data['total_products']} products, {data['total_banks']} banks, {data['total_categories']} categories")


class TestAuthRegistration:
    """Auth registration tests"""
    
    def test_register_new_user(self):
        """POST /api/auth/register creates new user"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USER_EMAIL.lower()
        assert data["name"] == TEST_USER_NAME
        assert data["role"] == "user"
        assert "user_id" in data
        # Check cookies are set
        assert "access_token" in session.cookies or response.cookies.get("access_token")
        print(f"✓ Registered new user: {TEST_USER_EMAIL}")
    
    def test_register_duplicate_email_fails(self):
        """POST /api/auth/register with existing email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": ADMIN_EMAIL,  # Admin already exists
            "password": "Test@1234",
            "name": "Duplicate User"
        })
        assert response.status_code == 400
        print("✓ Duplicate email registration rejected")


class TestAuthLogin:
    """Auth login tests"""
    
    def test_login_with_valid_credentials(self):
        """POST /api/auth/login with valid credentials returns user data"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL.lower()
        assert data["role"] == "admin"
        assert "user_id" in data
        print(f"✓ Admin login successful: {data['email']}")
    
    def test_login_with_invalid_password(self):
        """POST /api/auth/login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123"
        })
        assert response.status_code == 401
        print("✓ Invalid password rejected")
    
    def test_login_with_nonexistent_email(self):
        """POST /api/auth/login with nonexistent email returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@rinkosh.com",
            "password": "Test@1234"
        })
        assert response.status_code == 401
        print("✓ Nonexistent email rejected")
    
    def test_brute_force_protection_relaxed(self):
        """5 failed login attempts don't trigger 429 (brute force relaxed to 10)"""
        for i in range(5):
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": f"bruteforce_{uuid.uuid4().hex[:6]}@test.com",
                "password": "wrong"
            })
            # Should be 401 (invalid), not 429 (rate limited)
            assert response.status_code == 401, f"Attempt {i+1}: Expected 401, got {response.status_code}"
        print("✓ 5 failed attempts don't trigger rate limit (threshold is 10)")


class TestAuthOTP:
    """OTP login tests"""
    
    def test_otp_request_returns_debug_otp(self):
        """POST /api/auth/login-otp-request returns debug_otp in dev mode"""
        response = requests.post(f"{BASE_URL}/api/auth/login-otp-request", json={
            "identifier": EXISTING_USER_EMAIL
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "debug_otp" in data  # Dev mode returns OTP
        assert len(data["debug_otp"]) == 6
        print(f"✓ OTP request successful, debug_otp: {data['debug_otp']}")
    
    def test_otp_request_nonexistent_user(self):
        """POST /api/auth/login-otp-request for nonexistent user returns 200 (security)"""
        response = requests.post(f"{BASE_URL}/api/auth/login-otp-request", json={
            "identifier": "nonexistent@test.com"
        })
        # Returns 200 for security (doesn't reveal if email exists)
        assert response.status_code == 200
        print("✓ OTP request for nonexistent user returns 200 (security)")


class TestForgotPassword:
    """Forgot password flow tests"""
    
    def test_forgot_password_returns_debug_otp(self):
        """POST /api/auth/forgot-password returns debug_otp in dev mode"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": EXISTING_USER_EMAIL
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "debug_otp" in data
        print(f"✓ Forgot password OTP: {data['debug_otp']}")


class TestAuthLogout:
    """Auth logout tests"""
    
    def test_logout_clears_cookies(self):
        """POST /api/auth/logout clears auth cookies"""
        session = requests.Session()
        # Login first
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        # Logout
        response = session.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Logged out"
        print("✓ Logout successful")


class TestAuthMe:
    """Auth /me endpoint tests"""
    
    def test_me_without_auth_returns_401(self):
        """GET /api/auth/me without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /me without auth returns 401")
    
    def test_me_with_auth_returns_user(self):
        """GET /api/auth/me with auth returns user data"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL.lower()
        assert data["role"] == "admin"
        print(f"✓ /me returns user: {data['email']}")


class TestUserProfile:
    """User profile tests"""
    
    def test_update_profile_creates_onboarding(self):
        """PUT /api/user/profile creates/updates user profile"""
        session = requests.Session()
        # Register new user
        email = f"profile_{uuid.uuid4().hex[:8]}@test.com"
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "Test@1234",
            "name": "Profile Test"
        })
        # Update profile
        response = session.put(f"{BASE_URL}/api/user/profile", json={
            "loan_type": "car",
            "monthly_income": 75000,
            "employment_type": "salaried",
            "existing_loans": False,
            "credit_score_known": True,
            "credit_score": 720,
            "desired_amount": 500000,
            "desired_tenure_months": 60
        })
        assert response.status_code == 200
        data = response.json()
        assert data["loan_type"] == "car"
        assert data["monthly_income"] == 75000
        assert data["onboarding_complete"] == True
        print(f"✓ Profile updated for {email}")


class TestRecommendations:
    """Loan recommendations tests"""
    
    def test_recommendations_without_profile_returns_400(self):
        """GET /api/loans/recommendations without profile returns 400"""
        session = requests.Session()
        # Register new user without profile
        email = f"norec_{uuid.uuid4().hex[:8]}@test.com"
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "Test@1234",
            "name": "No Rec Test"
        })
        response = session.get(f"{BASE_URL}/api/loans/recommendations")
        assert response.status_code == 400
        print("✓ Recommendations without profile returns 400")
    
    def test_recommendations_with_profile(self):
        """GET /api/loans/recommendations with profile returns recommendations"""
        session = requests.Session()
        # Login as existing user with profile
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EXISTING_USER_EMAIL,
            "password": EXISTING_USER_PASSWORD
        })
        response = session.get(f"{BASE_URL}/api/loans/recommendations")
        assert response.status_code == 200
        recs = response.json()
        assert len(recs) > 0
        # Check recommendation structure
        rec = recs[0]
        assert "product_id" in rec
        assert "bank_name" in rec
        assert "interest_rate" in rec
        assert "emi" in rec
        assert "total_cost" in rec
        assert "approval_probability" in rec
        assert "approval_reasons" in rec
        print(f"✓ Got {len(recs)} recommendations with approval reasons")
    
    def test_approval_probability_varies_between_banks(self):
        """Approval probability varies between banks"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EXISTING_USER_EMAIL,
            "password": EXISTING_USER_PASSWORD
        })
        response = session.get(f"{BASE_URL}/api/loans/recommendations")
        recs = response.json()
        probabilities = [r["approval_probability"] for r in recs]
        # Check that probabilities vary (not all same)
        unique_probs = set(probabilities)
        assert len(unique_probs) > 1, "Approval probabilities should vary between banks"
        print(f"✓ Approval probabilities vary: {len(unique_probs)} unique values")


class TestLeads:
    """Lead management tests"""
    
    def test_create_lead_express_interest(self):
        """POST /api/leads creates a lead"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EXISTING_USER_EMAIL,
            "password": EXISTING_USER_PASSWORD
        })
        # Get a product to express interest in
        products = requests.get(f"{BASE_URL}/api/loans/products?loan_type=car").json()
        product = products[0]
        
        response = session.post(f"{BASE_URL}/api/leads", json={
            "product_id": product["product_id"],
            "bank_name": product["bank_name"],
            "product_name": product["product_name"]
        })
        # May return 200 (created) or 400 (already interested)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert "lead_id" in data
            assert data["status"] == "interested"
            print(f"✓ Lead created: {data['lead_id']}")
        else:
            print("✓ Lead already exists (expected)")
    
    def test_get_user_leads(self):
        """GET /api/leads returns user's leads"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EXISTING_USER_EMAIL,
            "password": EXISTING_USER_PASSWORD
        })
        response = session.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200
        leads = response.json()
        assert isinstance(leads, list)
        print(f"✓ Got {len(leads)} leads")


class TestCreditBuilder:
    """Credit builder suggestions tests"""
    
    def test_get_credit_suggestions(self):
        """GET /api/credit-builder/suggestions returns suggestions"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EXISTING_USER_EMAIL,
            "password": EXISTING_USER_PASSWORD
        })
        response = session.get(f"{BASE_URL}/api/credit-builder/suggestions")
        assert response.status_code == 200
        suggestions = response.json()
        assert len(suggestions) > 0
        # Check structure
        s = suggestions[0]
        assert "id" in s
        assert "title" in s
        assert "description" in s
        assert "category" in s
        assert "impact" in s
        print(f"✓ Got {len(suggestions)} credit builder suggestions")


class TestAnalyticsEvents:
    """Analytics event tracking tests"""
    
    def test_track_event_without_auth(self):
        """POST /api/analytics/event works without auth"""
        response = requests.post(f"{BASE_URL}/api/analytics/event", json={
            "event_type": "page_view",
            "data": {"page": "landing", "test": True}
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Analytics event tracked without auth")
    
    def test_track_event_with_auth(self):
        """POST /api/analytics/event works with auth"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EXISTING_USER_EMAIL,
            "password": EXISTING_USER_PASSWORD
        })
        response = session.post(f"{BASE_URL}/api/analytics/event", json={
            "event_type": "button_click",
            "data": {"button": "apply_now", "test": True}
        })
        assert response.status_code == 200
        print("✓ Analytics event tracked with auth")


class TestAdminEndpoints:
    """Admin-only endpoint tests"""
    
    def test_admin_analytics_without_auth_returns_401(self):
        """GET /api/admin/analytics without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 401
        print("✓ Admin analytics without auth returns 401")
    
    def test_admin_analytics_with_user_returns_403(self):
        """GET /api/admin/analytics with regular user returns 403"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EXISTING_USER_EMAIL,
            "password": EXISTING_USER_PASSWORD
        })
        response = session.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 403
        print("✓ Admin analytics with regular user returns 403")
    
    def test_admin_analytics_with_admin(self):
        """GET /api/admin/analytics with admin returns data"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        response = session.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_leads" in data
        assert "leads_by_status" in data
        assert "leads_by_bank" in data
        assert "commission_summary" in data
        print(f"✓ Admin analytics: {data['total_users']} users, {data['total_leads']} leads")
    
    def test_admin_events_with_admin(self):
        """GET /api/admin/events with admin returns events"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        response = session.get(f"{BASE_URL}/api/admin/events?limit=3")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert "total_events" in data
        assert "event_type_counts" in data
        print(f"✓ Admin events: {data['total_events']} total events")


class TestPublicChatbot:
    """Public chatbot tests (MOCKED - LLM budget exceeded)"""
    
    def test_public_chat_returns_response(self):
        """POST /api/ai/chat-public returns response (may be fallback)"""
        response = requests.post(f"{BASE_URL}/api/ai/chat-public", json={
            "message": "What is a personal loan?",
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        # Response may be fallback due to budget exceeded
        print(f"✓ Public chat response received (may be fallback)")


class TestCreditScoreCheck:
    """Credit score check placeholder tests"""
    
    def test_credit_score_check_returns_unavailable(self):
        """GET /api/credit-score/check returns unavailable status (MOCKED)"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EXISTING_USER_EMAIL,
            "password": EXISTING_USER_PASSWORD
        })
        response = session.get(f"{BASE_URL}/api/credit-score/check")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unavailable"
        assert "providers" in data
        assert len(data["providers"]) >= 3  # CIBIL, Experian, Equifax
        print("✓ Credit score check returns unavailable with provider links (MOCKED)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
