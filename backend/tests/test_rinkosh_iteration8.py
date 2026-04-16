"""
Rinkosh Iteration 8 Tests
Tests for:
- Login without 429 errors
- Multiple failed login attempts (should return 401, not 429)
- Analytics event tracking
- Page view tracking
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Health endpoint working")


class TestLoginWithoutRateLimiting:
    """Test login functionality without 429 errors"""
    
    def test_login_success_with_valid_credentials(self):
        """Test login with valid admin credentials works without 429"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rinkosh.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "user_id" in data
        assert data["email"] == "admin@rinkosh.com"
        assert data["role"] == "admin"
        print(f"✓ Login successful for admin@rinkosh.com, user_id: {data['user_id']}")
    
    def test_login_invalid_credentials_returns_401(self):
        """Test login with invalid credentials returns 401, not 429"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rinkosh.com",
            "password": "WrongPassword123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ Invalid credentials correctly returns 401")
    
    def test_multiple_failed_logins_no_429(self):
        """Test that 5+ failed login attempts do NOT trigger 429 Too Many Requests"""
        session = requests.Session()
        
        # Clear any existing lockout by using a unique email pattern
        test_email = f"test_brute_{int(time.time())}@example.com"
        
        # Try 6 failed login attempts - should all return 401, not 429
        for i in range(6):
            response = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": f"WrongPassword{i}"
            })
            # Should be 401 (invalid credentials), NOT 429 (rate limited)
            assert response.status_code == 401, f"Attempt {i+1}: Expected 401, got {response.status_code}: {response.text}"
            print(f"✓ Attempt {i+1}: Got 401 as expected (not 429)")
        
        print("✓ Multiple failed logins correctly return 401, not 429")
    
    def test_login_after_failed_attempts_still_works(self):
        """Test that valid login still works after failed attempts"""
        session = requests.Session()
        
        # First, do some failed attempts
        for i in range(3):
            session.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@rinkosh.com",
                "password": "WrongPassword"
            })
        
        # Now try valid login - should still work
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rinkosh.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Valid login works after failed attempts")


class TestAnalyticsEventTracking:
    """Test analytics event tracking endpoint"""
    
    def test_analytics_event_endpoint_exists(self):
        """Test POST /api/analytics/event endpoint exists and accepts events"""
        response = requests.post(f"{BASE_URL}/api/analytics/event", json={
            "event_type": "test_event",
            "data": {"test_key": "test_value", "timestamp": time.time()}
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Analytics event endpoint working")
    
    def test_analytics_page_view_event(self):
        """Test page_view event tracking"""
        response = requests.post(f"{BASE_URL}/api/analytics/event", json={
            "event_type": "page_view",
            "data": {"page": "landing"}
        })
        assert response.status_code == 200
        print("✓ Page view event tracked successfully")
    
    def test_analytics_login_success_event(self):
        """Test login_success event tracking"""
        response = requests.post(f"{BASE_URL}/api/analytics/event", json={
            "event_type": "login_success",
            "data": {"method": "password", "email": "test@example.com"}
        })
        assert response.status_code == 200
        print("✓ Login success event tracked successfully")
    
    def test_analytics_login_fail_event(self):
        """Test login_fail event tracking"""
        response = requests.post(f"{BASE_URL}/api/analytics/event", json={
            "event_type": "login_fail",
            "data": {"reason": "invalid_password", "email": "test@example.com"}
        })
        assert response.status_code == 200
        print("✓ Login fail event tracked successfully")
    
    def test_analytics_event_requires_event_type(self):
        """Test that event_type is required"""
        response = requests.post(f"{BASE_URL}/api/analytics/event", json={
            "data": {"test": "value"}
        })
        assert response.status_code == 400
        print("✓ Analytics endpoint correctly requires event_type")


class TestAuthEndpoints:
    """Test other auth endpoints"""
    
    def test_register_endpoint_exists(self):
        """Test register endpoint exists"""
        # Use unique email to avoid conflicts
        test_email = f"test_reg_{int(time.time())}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123",
            "name": "Test User"
        })
        # Should be 200 (success) or 400 (email exists)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ Register endpoint working, status: {response.status_code}")
    
    def test_logout_endpoint(self):
        """Test logout endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Logged out"
        print("✓ Logout endpoint working")
    
    def test_me_endpoint_requires_auth(self):
        """Test /auth/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /auth/me correctly requires authentication")
    
    def test_me_endpoint_with_auth(self):
        """Test /auth/me with valid session"""
        session = requests.Session()
        # Login first
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rinkosh.com",
            "password": "Admin@123"
        })
        assert login_resp.status_code == 200
        
        # Now check /auth/me
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["email"] == "admin@rinkosh.com"
        print("✓ /auth/me returns user data when authenticated")


class TestOTPLogin:
    """Test OTP login endpoints"""
    
    def test_otp_request_endpoint(self):
        """Test OTP request endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login-otp-request", json={
            "identifier": "admin@rinkosh.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # In dev mode, debug_otp should be returned
        if "debug_otp" in data:
            print(f"✓ OTP request working, debug OTP: {data['debug_otp']}")
        else:
            print("✓ OTP request working")


class TestAdminAnalytics:
    """Test admin analytics endpoints"""
    
    def test_admin_events_endpoint(self):
        """Test admin events endpoint with auth"""
        session = requests.Session()
        # Login as admin
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@rinkosh.com",
            "password": "Admin@123"
        })
        assert login_resp.status_code == 200
        
        # Get events
        events_resp = session.get(f"{BASE_URL}/api/admin/events")
        assert events_resp.status_code == 200
        data = events_resp.json()
        assert "events" in data
        assert "total_events" in data
        assert "event_type_counts" in data
        print(f"✓ Admin events endpoint working, total events: {data['total_events']}")
        print(f"  Event type counts: {data['event_type_counts']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
