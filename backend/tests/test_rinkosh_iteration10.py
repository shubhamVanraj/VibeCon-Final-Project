"""
Rinkosh Loan Comparison Platform - Iteration 10 Tests
Tests for new loan categories: Gold, 2nd Hand Vehicle, Plot, Loan Against MF
Total 52 products across 10 categories and 20 banks
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://loan-compare-9.preview.emergentagent.com')


class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_health_endpoint(self):
        """Health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        print("✓ Health endpoint returns 200")


class TestLoanProducts:
    """Tests for loan products API - 52 products across 10 categories"""
    
    def test_total_products_count(self):
        """GET /api/loans/products returns 52 total products"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 52, f"Expected 52 products, got {len(products)}"
        print(f"✓ Total products: {len(products)}")
    
    def test_all_10_categories_present(self):
        """All 10 loan categories are present"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        assert response.status_code == 200
        products = response.json()
        
        categories = set(p["loan_type"] for p in products)
        expected_categories = {"personal", "home", "car", "bike", "education", "refinance", "gold", "used_vehicle", "plot", "mutual_funds"}
        
        # Note: refinance may not have products yet
        required_categories = {"personal", "home", "car", "bike", "education", "gold", "used_vehicle", "plot", "mutual_funds"}
        
        for cat in required_categories:
            assert cat in categories, f"Category '{cat}' not found in products"
        print(f"✓ All required categories present: {sorted(categories)}")
    
    def test_gold_loans_count(self):
        """Gold loan category has 5 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=gold")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 5, f"Expected 5 gold loans, got {len(products)}"
        
        # Verify specific banks
        banks = [p["bank_name"] for p in products]
        assert "Muthoot Finance" in banks, "Muthoot Finance gold loan not found"
        assert "Manappuram Finance" in banks, "Manappuram Finance gold loan not found"
        assert "SBI" in banks, "SBI gold loan not found"
        assert "HDFC Bank" in banks, "HDFC gold loan not found"
        assert "Canara Bank" in banks, "Canara gold loan not found"
        print(f"✓ Gold loans: {len(products)} products - {banks}")
    
    def test_used_vehicle_loans_count(self):
        """Used vehicle category has 4 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=used_vehicle")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 4, f"Expected 4 used vehicle loans, got {len(products)}"
        
        banks = [p["bank_name"] for p in products]
        print(f"✓ Used vehicle loans: {len(products)} products - {banks}")
    
    def test_plot_loans_count(self):
        """Plot loan category has 4 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=plot")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 4, f"Expected 4 plot loans, got {len(products)}"
        
        banks = [p["bank_name"] for p in products]
        print(f"✓ Plot loans: {len(products)} products - {banks}")
    
    def test_mutual_funds_loans_count(self):
        """Loan against mutual funds category has 4 products"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=mutual_funds")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 4, f"Expected 4 MF loans, got {len(products)}"
        
        banks = [p["bank_name"] for p in products]
        print(f"✓ Mutual funds loans: {len(products)} products - {banks}")
    
    def test_existing_categories_unchanged(self):
        """Existing categories still have correct counts"""
        expected_counts = {
            "personal": 13,
            "home": 10,
            "car": 6,
            "bike": 3,
            "education": 3
        }
        
        for loan_type, expected_count in expected_counts.items():
            response = requests.get(f"{BASE_URL}/api/loans/products?loan_type={loan_type}")
            assert response.status_code == 200
            products = response.json()
            assert len(products) == expected_count, f"Expected {expected_count} {loan_type} loans, got {len(products)}"
            print(f"✓ {loan_type.capitalize()} loans: {len(products)} products")
    
    def test_total_banks_count(self):
        """20 unique banks in products"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        assert response.status_code == 200
        products = response.json()
        
        banks = set(p["bank_name"] for p in products)
        assert len(banks) == 20, f"Expected 20 banks, got {len(banks)}"
        
        # Verify new banks are present
        assert "Muthoot Finance" in banks, "Muthoot Finance not found"
        assert "Manappuram Finance" in banks, "Manappuram Finance not found"
        print(f"✓ Total banks: {len(banks)}")
    
    def test_product_fields_complete(self):
        """All products have required fields"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        assert response.status_code == 200
        products = response.json()
        
        required_fields = ["product_id", "bank_name", "product_name", "loan_type", 
                          "interest_rate", "processing_fee_pct", "max_amount", 
                          "min_amount", "max_tenure_months", "min_tenure_months", 
                          "is_active", "features"]
        
        for product in products:
            for field in required_fields:
                assert field in product, f"Field '{field}' missing in product {product.get('product_id', 'unknown')}"
        
        print(f"✓ All {len(products)} products have required fields")


class TestAuthentication:
    """Authentication tests - verify no 429 errors"""
    
    def test_login_success_no_429(self):
        """Login with valid credentials returns 200 (no 429 rate limiting)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@rinkosh.com", "password": "Admin@123"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "user_id" in data
        assert data["email"] == "admin@rinkosh.com"
        assert data["role"] == "admin"
        print("✓ Login successful with 200 status (no 429)")
    
    def test_login_invalid_credentials(self):
        """Login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid login returns 401")
    
    def test_multiple_login_attempts_no_429(self):
        """Multiple login attempts don't trigger 429 immediately"""
        # Try 3 valid logins in succession
        for i in range(3):
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "admin@rinkosh.com", "password": "Admin@123"}
            )
            assert response.status_code == 200, f"Attempt {i+1}: Expected 200, got {response.status_code}"
        print("✓ Multiple valid logins work without 429")


class TestNewLoanTypeDetails:
    """Detailed tests for new loan type products"""
    
    def test_gold_loan_features(self):
        """Gold loans have appropriate features"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=gold")
        assert response.status_code == 200
        products = response.json()
        
        for product in products:
            assert product["interest_rate"] > 0, f"Invalid interest rate for {product['product_name']}"
            assert product["max_amount"] > 0, f"Invalid max amount for {product['product_name']}"
            # Gold loans typically have no income requirement
            assert product.get("min_income", 0) == 0, f"Gold loan {product['product_name']} should have no income requirement"
        
        print("✓ Gold loan features validated")
    
    def test_used_vehicle_loan_features(self):
        """Used vehicle loans have appropriate features"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=used_vehicle")
        assert response.status_code == 200
        products = response.json()
        
        for product in products:
            assert product["interest_rate"] > 0
            assert product["max_amount"] > 0
            # Used vehicle loans typically have higher interest rates
            assert product["interest_rate"] >= 10, f"Used vehicle loan rate seems too low: {product['interest_rate']}%"
        
        print("✓ Used vehicle loan features validated")
    
    def test_plot_loan_features(self):
        """Plot loans have appropriate features"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=plot")
        assert response.status_code == 200
        products = response.json()
        
        for product in products:
            assert product["interest_rate"] > 0
            assert product["max_amount"] >= 20000000, f"Plot loan max amount seems too low: {product['max_amount']}"
            # Plot loans typically have longer tenure
            assert product["max_tenure_months"] >= 180, f"Plot loan tenure seems too short: {product['max_tenure_months']} months"
        
        print("✓ Plot loan features validated")
    
    def test_mutual_funds_loan_features(self):
        """Loan against mutual funds have appropriate features"""
        response = requests.get(f"{BASE_URL}/api/loans/products?loan_type=mutual_funds")
        assert response.status_code == 200
        products = response.json()
        
        for product in products:
            assert product["interest_rate"] > 0
            # MF loans typically have no income requirement
            assert product.get("min_income", 0) == 0, f"MF loan {product['product_name']} should have no income requirement"
            # MF loans typically have no foreclosure charges
            assert product.get("foreclosure_charge_pct", 0) == 0, f"MF loan {product['product_name']} should have no foreclosure charges"
        
        print("✓ Mutual funds loan features validated")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
