"""
Iteration 9 Backend Tests - Testing new Browse Loans feature and redirect changes
Tests:
- GET /api/loans/products (public endpoint, no auth required)
- Category filtering for loan products
- Login endpoint (no 429 errors)
- Register endpoint
- Auth flow redirects (verified via frontend)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndPublicEndpoints:
    """Test health and public endpoints"""
    
    def test_health_endpoint(self):
        """Health endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Health endpoint returns 200")
    
    def test_loan_products_public_no_auth(self):
        """GET /api/loans/products should work without authentication"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 35, f"Expected at least 35 products, got {len(data)}"
        print(f"✓ Loan products endpoint returns {len(data)} products (public, no auth)")
    
    def test_loan_products_structure(self):
        """Each loan product should have required fields"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "product_id", "bank_name", "product_name", "loan_type",
            "interest_rate", "max_amount", "max_tenure_months", 
            "processing_fee_pct", "features"
        ]
        
        for product in data[:5]:  # Check first 5 products
            for field in required_fields:
                assert field in product, f"Missing field: {field} in product {product.get('product_id')}"
        print("✓ Loan products have all required fields")


class TestLoanCategoryFiltering:
    """Test category filtering for loan products"""
    
    def test_filter_personal_loans(self):
        """Filter by loan_type=personal should return only personal loans"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=personal")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 10, f"Expected at least 10 personal loans, got {len(data)}"
        for product in data:
            assert product["loan_type"] == "personal"
        print(f"✓ Personal loan filter returns {len(data)} products")
    
    def test_filter_home_loans(self):
        """Filter by loan_type=home should return only home loans"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=home")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 5, f"Expected at least 5 home loans, got {len(data)}"
        for product in data:
            assert product["loan_type"] == "home"
        print(f"✓ Home loan filter returns {len(data)} products")
    
    def test_filter_car_loans(self):
        """Filter by loan_type=car should return only car loans"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=car")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3, f"Expected at least 3 car loans, got {len(data)}"
        for product in data:
            assert product["loan_type"] == "car"
        print(f"✓ Car loan filter returns {len(data)} products")
    
    def test_filter_bike_loans(self):
        """Filter by loan_type=bike should return only bike loans"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=bike")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3, f"Expected at least 3 bike loans, got {len(data)}"
        for product in data:
            assert product["loan_type"] == "bike"
        print(f"✓ Bike loan filter returns {len(data)} products")
    
    def test_filter_education_loans(self):
        """Filter by loan_type=education should return only education loans"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=education")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3, f"Expected at least 3 education loans, got {len(data)}"
        for product in data:
            assert product["loan_type"] == "education"
        print(f"✓ Education loan filter returns {len(data)} products")
    
    def test_all_categories_present(self):
        """All 6 loan categories should be present"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        assert response.status_code == 200
        data = response.json()
        
        categories = set(p["loan_type"] for p in data)
        expected_categories = {"personal", "home", "car", "bike", "education"}
        
        for cat in expected_categories:
            assert cat in categories, f"Missing category: {cat}"
        print(f"✓ All expected categories present: {categories}")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_valid_credentials(self):
        """Login with valid admin credentials should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@rinkosh.com", "password": "Admin@123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@rinkosh.com"
        assert data["role"] == "admin"
        assert "has_profile" in data
        print("✓ Login with valid credentials returns 200")
    
    def test_login_invalid_credentials(self):
        """Login with invalid credentials should return 401, not 429"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@rinkosh.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Login with invalid credentials returns 401 (not 429)")
    
    def test_login_multiple_failed_attempts_no_429(self):
        """Multiple failed login attempts should not trigger 429 immediately"""
        for i in range(5):
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": f"test{i}@example.com", "password": "wrongpassword"}
            )
            assert response.status_code == 401, f"Attempt {i+1}: Expected 401, got {response.status_code}"
        print("✓ 5 failed login attempts return 401 (no 429 rate limiting)")
    
    def test_register_new_user(self):
        """Register endpoint should work for new users"""
        import uuid
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "TestPass123",
                "name": "Test User"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_email
        assert data["has_profile"] == False
        print(f"✓ Register endpoint works for new user: {test_email}")
    
    def test_auth_me_requires_auth(self):
        """GET /api/auth/me should require authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /auth/me requires authentication")


class TestLoanProductDetails:
    """Test loan product data quality"""
    
    def test_products_have_bank_logos_data(self):
        """Products should have bank_name for logo rendering"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        data = response.json()
        
        banks = set(p["bank_name"] for p in data)
        assert len(banks) >= 15, f"Expected at least 15 unique banks, got {len(banks)}"
        print(f"✓ {len(banks)} unique banks in products: {sorted(banks)[:10]}...")
    
    def test_products_have_interest_rates(self):
        """All products should have valid interest rates"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        data = response.json()
        
        for product in data:
            rate = product.get("interest_rate")
            assert rate is not None, f"Missing interest_rate for {product['product_id']}"
            assert 5 <= rate <= 20, f"Invalid interest rate {rate} for {product['product_id']}"
        print("✓ All products have valid interest rates (5-20%)")
    
    def test_products_have_amounts(self):
        """All products should have valid max_amount"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        data = response.json()
        
        for product in data:
            max_amt = product.get("max_amount")
            assert max_amt is not None, f"Missing max_amount for {product['product_id']}"
            assert max_amt >= 15000, f"Invalid max_amount {max_amt} for {product['product_id']}"
        print("✓ All products have valid max_amount")
    
    def test_products_have_tenure(self):
        """All products should have valid tenure"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        data = response.json()
        
        for product in data:
            tenure = product.get("max_tenure_months")
            assert tenure is not None, f"Missing max_tenure_months for {product['product_id']}"
            assert tenure >= 6, f"Invalid tenure {tenure} for {product['product_id']}"
        print("✓ All products have valid tenure")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
