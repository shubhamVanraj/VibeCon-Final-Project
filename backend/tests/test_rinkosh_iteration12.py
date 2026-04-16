"""
Iteration 12 Tests - Bug Fix Verification
Tests for:
1. Refinance loan type now has 4 products (was 0)
2. Dashboard shows correct empty state message based on has_profile
3. Login/auth/me returns has_profile: true for users who completed onboarding
4. All 10 loan types return recommendations
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRefinanceProducts:
    """Test that refinance loan type now has products"""
    
    def test_refinance_products_exist(self):
        """GET /api/loans/products?loan_type=refinance should return 4 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=refinance")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 4, f"Expected 4 refinance products, got {len(products)}"
        
        # Verify product details
        product_ids = [p['product_id'] for p in products]
        expected_ids = ['sbi_refinance', 'hdfc_refinance', 'icici_refinance', 'axis_refinance']
        for expected_id in expected_ids:
            assert expected_id in product_ids, f"Missing refinance product: {expected_id}"
        
        # Verify all products have required fields
        for p in products:
            assert p['loan_type'] == 'refinance'
            assert p['is_active'] == True
            assert 'interest_rate' in p
            assert 'bank_name' in p
            print(f"  ✓ {p['bank_name']} - {p['product_name']} @ {p['interest_rate']}%")
    
    def test_total_products_count(self):
        """Total loan products should be 56"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 56, f"Expected 56 total products, got {len(products)}"
        print(f"  ✓ Total products: {len(products)}")


class TestAllLoanTypesHaveProducts:
    """Test that all 10 loan types have products"""
    
    @pytest.mark.parametrize("loan_type,expected_min", [
        ("personal", 10),
        ("home", 5),
        ("car", 3),
        ("bike", 3),
        ("education", 3),
        ("refinance", 4),
        ("gold", 5),
        ("used_vehicle", 4),
        ("plot", 4),
        ("mutual_funds", 4),
    ])
    def test_loan_type_has_products(self, loan_type, expected_min):
        """Each loan type should have at least expected_min products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type={loan_type}")
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= expected_min, f"{loan_type}: Expected >= {expected_min} products, got {len(products)}"
        print(f"  ✓ {loan_type}: {len(products)} products")


class TestUserOnboardingFlow:
    """Test the full user registration -> onboarding -> dashboard flow"""
    
    @pytest.fixture
    def session(self):
        """Create a requests session for cookie handling"""
        return requests.Session()
    
    def test_register_new_user(self, session):
        """Register a new user and verify has_profile is False"""
        unique_email = f"test_iter12_{uuid.uuid4().hex[:8]}@test.com"
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@123",
            "name": "Test User 12"
        })
        assert response.status_code == 200
        data = response.json()
        assert data['has_profile'] == False, "New user should have has_profile=False"
        print(f"  ✓ Registered user {unique_email} with has_profile=False")
        return unique_email
    
    def test_new_user_recommendations_require_onboarding(self, session):
        """New user without profile should get 400 on recommendations"""
        # Register new user
        unique_email = f"test_iter12_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@123",
            "name": "Test User"
        })
        assert reg_response.status_code == 200
        
        # Try to get recommendations without completing onboarding
        rec_response = session.get(f"{BASE_URL}/api/loans/recommendations")
        assert rec_response.status_code == 400
        assert "Complete onboarding first" in rec_response.json().get('detail', '')
        print(f"  ✓ New user correctly gets 400 on recommendations")
    
    def test_complete_onboarding_personal_loan(self, session):
        """Complete onboarding with personal loan type and verify recommendations"""
        # Register new user
        unique_email = f"test_iter12_personal_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@123",
            "name": "Test Personal"
        })
        assert reg_response.status_code == 200
        
        # Complete onboarding with personal loan type
        profile_response = session.put(f"{BASE_URL}/api/user/profile", json={
            "loan_type": "personal",
            "monthly_income": 50000,
            "employment_type": "salaried",
            "existing_loans": False,
            "credit_score_known": True,
            "credit_score": 750,
            "desired_amount": 500000,
            "desired_tenure_months": 60
        })
        assert profile_response.status_code == 200
        profile = profile_response.json()
        assert profile['onboarding_complete'] == True
        print(f"  ✓ Completed onboarding for personal loan")
        
        # Get recommendations - should return personal loan products
        rec_response = session.get(f"{BASE_URL}/api/loans/recommendations")
        assert rec_response.status_code == 200
        recommendations = rec_response.json()
        assert len(recommendations) > 0, "Should have personal loan recommendations"
        assert all(r['loan_type'] == 'personal' for r in recommendations)
        print(f"  ✓ Got {len(recommendations)} personal loan recommendations")
        
        # Verify /auth/me returns has_profile: true
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data['has_profile'] == True, "/auth/me should return has_profile=True after onboarding"
        print(f"  ✓ /auth/me returns has_profile=True")
    
    def test_complete_onboarding_refinance_loan(self, session):
        """Complete onboarding with refinance loan type and verify 4 recommendations"""
        # Register new user
        unique_email = f"test_iter12_refinance_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@123",
            "name": "Test Refinance"
        })
        assert reg_response.status_code == 200
        
        # Complete onboarding with refinance loan type
        profile_response = session.put(f"{BASE_URL}/api/user/profile", json={
            "loan_type": "refinance",
            "monthly_income": 75000,
            "employment_type": "salaried",
            "existing_loans": True,
            "existing_loan_emi": 20000,
            "credit_score_known": True,
            "credit_score": 720,
            "desired_amount": 2000000,
            "desired_tenure_months": 120
        })
        assert profile_response.status_code == 200
        
        # Get recommendations - should return 4 refinance products
        rec_response = session.get(f"{BASE_URL}/api/loans/recommendations")
        assert rec_response.status_code == 200
        recommendations = rec_response.json()
        assert len(recommendations) == 4, f"Expected 4 refinance recommendations, got {len(recommendations)}"
        assert all(r['loan_type'] == 'refinance' for r in recommendations)
        print(f"  ✓ Got {len(recommendations)} refinance loan recommendations")
        
        # Verify each recommendation has required fields
        for rec in recommendations:
            assert 'emi' in rec
            assert 'total_cost' in rec
            assert 'approval_probability' in rec
            print(f"    - {rec['bank_name']}: EMI={rec['emi']}, Approval={rec['approval_probability']}%")


class TestLoginReturnsHasProfile:
    """Test that login endpoint returns correct has_profile value"""
    
    @pytest.fixture
    def session(self):
        return requests.Session()
    
    def test_login_returns_has_profile_false_for_new_user(self, session):
        """Login should return has_profile=False for user without profile"""
        # Register new user
        unique_email = f"test_iter12_login_{uuid.uuid4().hex[:8]}@test.com"
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@123",
            "name": "Test Login"
        })
        
        # Logout
        session.post(f"{BASE_URL}/api/auth/logout")
        
        # Login again
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "Test@123"
        })
        assert login_response.status_code == 200
        data = login_response.json()
        assert data['has_profile'] == False, "Login should return has_profile=False for user without profile"
        print(f"  ✓ Login returns has_profile=False for new user")
    
    def test_login_returns_has_profile_true_after_onboarding(self, session):
        """Login should return has_profile=True for user who completed onboarding"""
        # Register new user
        unique_email = f"test_iter12_login2_{uuid.uuid4().hex[:8]}@test.com"
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@123",
            "name": "Test Login 2"
        })
        
        # Complete onboarding
        session.put(f"{BASE_URL}/api/user/profile", json={
            "loan_type": "personal",
            "monthly_income": 50000,
            "employment_type": "salaried",
            "existing_loans": False,
            "credit_score_known": False,
            "desired_amount": 300000,
            "desired_tenure_months": 36
        })
        
        # Logout
        session.post(f"{BASE_URL}/api/auth/logout")
        
        # Login again
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "Test@123"
        })
        assert login_response.status_code == 200
        data = login_response.json()
        assert data['has_profile'] == True, "Login should return has_profile=True after onboarding"
        print(f"  ✓ Login returns has_profile=True after onboarding")
        
        # Also verify /auth/me returns has_profile=True
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data['has_profile'] == True
        print(f"  ✓ /auth/me also returns has_profile=True")


class TestRecommendationsForAllLoanTypes:
    """Test that recommendations work for all 10 loan types"""
    
    @pytest.fixture
    def session(self):
        return requests.Session()
    
    @pytest.mark.parametrize("loan_type", [
        "personal", "home", "car", "bike", "education",
        "refinance", "gold", "used_vehicle", "plot", "mutual_funds"
    ])
    def test_recommendations_for_loan_type(self, session, loan_type):
        """Each loan type should return recommendations after onboarding"""
        # Register new user
        unique_email = f"test_iter12_{loan_type}_{uuid.uuid4().hex[:8]}@test.com"
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@123",
            "name": f"Test {loan_type}"
        })
        
        # Complete onboarding with this loan type
        session.put(f"{BASE_URL}/api/user/profile", json={
            "loan_type": loan_type,
            "monthly_income": 50000,
            "employment_type": "salaried",
            "existing_loans": False,
            "credit_score_known": True,
            "credit_score": 700,
            "desired_amount": 500000,
            "desired_tenure_months": 60
        })
        
        # Get recommendations
        rec_response = session.get(f"{BASE_URL}/api/loans/recommendations")
        assert rec_response.status_code == 200
        recommendations = rec_response.json()
        assert len(recommendations) > 0, f"No recommendations for {loan_type}"
        assert all(r['loan_type'] == loan_type for r in recommendations)
        print(f"  ✓ {loan_type}: {len(recommendations)} recommendations")


class TestAdminCredentials:
    """Test admin login works with documented credentials"""
    
    def test_admin_login(self):
        """Admin should be able to login with documented credentials"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rinkosh.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data['role'] == 'admin'
        print(f"  ✓ Admin login successful, role={data['role']}")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health(self):
        """Health endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print(f"  ✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
