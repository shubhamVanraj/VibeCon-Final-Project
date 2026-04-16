"""
Iteration 11 Tests - Chatbot, Location Picker, Charts
Tests for new features: ChatWidget, LocationPicker, LoanCharts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_health_endpoint(self):
        """Health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ Health endpoint working")


class TestLoanStats:
    """Tests for /api/loans/stats endpoint (used by LoanCharts)"""
    
    def test_stats_endpoint_returns_200(self):
        """GET /api/loans/stats returns 200"""
        response = requests.get(f"{BASE_URL}/api/loans/stats")
        assert response.status_code == 200
        print("✓ Stats endpoint returns 200")
    
    def test_stats_has_required_fields(self):
        """Stats response has all required fields for charts"""
        response = requests.get(f"{BASE_URL}/api/loans/stats")
        data = response.json()
        
        # Required fields for LoanCharts component
        assert "total_products" in data
        assert "total_banks" in data
        assert "total_categories" in data
        assert "categories" in data
        assert "top_banks" in data
        
        print(f"✓ Stats has required fields: total_products={data['total_products']}, total_banks={data['total_banks']}, total_categories={data['total_categories']}")
    
    def test_stats_categories_structure(self):
        """Categories have proper structure for charts"""
        response = requests.get(f"{BASE_URL}/api/loans/stats")
        data = response.json()
        
        categories = data.get("categories", {})
        assert len(categories) > 0, "Should have at least one category"
        
        # Check structure of each category
        for cat_name, cat_data in categories.items():
            assert "count" in cat_data, f"Category {cat_name} missing count"
            assert "min_rate" in cat_data, f"Category {cat_name} missing min_rate"
            assert "max_rate" in cat_data, f"Category {cat_name} missing max_rate"
            assert "avg_rate" in cat_data, f"Category {cat_name} missing avg_rate"
        
        print(f"✓ All {len(categories)} categories have proper structure")
    
    def test_stats_top_banks_structure(self):
        """Top banks have proper structure for charts"""
        response = requests.get(f"{BASE_URL}/api/loans/stats")
        data = response.json()
        
        top_banks = data.get("top_banks", [])
        assert len(top_banks) > 0, "Should have at least one bank"
        
        # Check structure of each bank
        for bank in top_banks:
            assert "bank" in bank, "Bank missing name"
            assert "products" in bank, "Bank missing products count"
            assert "avg_rate" in bank, "Bank missing avg_rate"
        
        print(f"✓ Top {len(top_banks)} banks have proper structure")


class TestPublicChatbot:
    """Tests for /api/ai/chat-public endpoint (ChatWidget)"""
    
    def test_chat_public_endpoint_returns_200(self):
        """POST /api/ai/chat-public returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat-public",
            json={"message": "Hello", "language": "en"}
        )
        assert response.status_code == 200
        print("✓ Chat public endpoint returns 200")
    
    def test_chat_public_returns_response(self):
        """Chat endpoint returns response and session_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat-public",
            json={"message": "What is processing fee?", "language": "en"}
        )
        data = response.json()
        
        assert "response" in data, "Missing response field"
        assert "session_id" in data, "Missing session_id field"
        assert len(data["response"]) > 0, "Response should not be empty"
        
        print(f"✓ Chat returns response (length={len(data['response'])}) and session_id={data['session_id']}")
    
    def test_chat_public_handles_hindi(self):
        """Chat endpoint handles Hindi language"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat-public",
            json={"message": "प्रोसेसिंग फीस क्या है?", "language": "hi"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        print("✓ Chat handles Hindi language")
    
    def test_chat_public_with_session_id(self):
        """Chat endpoint accepts session_id for conversation continuity"""
        # First message
        response1 = requests.post(
            f"{BASE_URL}/api/ai/chat-public",
            json={"message": "Hello", "language": "en"}
        )
        session_id = response1.json().get("session_id")
        
        # Second message with same session
        response2 = requests.post(
            f"{BASE_URL}/api/ai/chat-public",
            json={"message": "What about home loans?", "language": "en", "session_id": session_id}
        )
        assert response2.status_code == 200
        print(f"✓ Chat accepts session_id for continuity")
    
    def test_chat_public_graceful_fallback(self):
        """Chat returns graceful fallback when LLM budget exceeded"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat-public",
            json={"message": "Test message", "language": "en"}
        )
        data = response.json()
        
        # Should return a response (either AI or fallback)
        assert "response" in data
        assert len(data["response"]) > 0
        
        # Check if it's the expected fallback message
        fallback_phrases = ["high demand", "try again", "experiencing"]
        is_fallback = any(phrase in data["response"].lower() for phrase in fallback_phrases)
        
        if is_fallback:
            print("✓ Chat returns graceful fallback message (LLM budget exceeded - expected)")
        else:
            print("✓ Chat returns AI response")


class TestLoanProducts:
    """Tests for loan products endpoint"""
    
    def test_products_endpoint(self):
        """GET /api/loans/products returns products"""
        response = requests.get(f"{BASE_URL}/api/loans/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Products endpoint returns {len(data)} products")


class TestAuthentication:
    """Tests for authentication endpoints"""
    
    def test_login_with_valid_credentials(self):
        """Login with admin credentials works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@rinkosh.com", "password": "Admin@123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert data.get("email") == "admin@rinkosh.com"
        assert data.get("role") == "admin"
        print("✓ Admin login successful")
    
    def test_login_with_invalid_credentials(self):
        """Login with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@rinkosh.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✓ Invalid credentials return 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
