#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import uuid

class RinkoshAPITester:
    def __init__(self, base_url="https://loan-compare-9.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = self.session.headers.copy()
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@rinkosh.com", "password": "Admin@123"}
        )
        if success:
            self.user_id = response.get('user_id')
            self.log(f"   Admin user_id: {self.user_id}")
            return True
        return False

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        success, response = self.run_test("Auth Me", "GET", "auth/me", 200)
        if success:
            has_profile = response.get('has_profile', False)
            self.log(f"   User has profile: {has_profile}")
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": "Test User",
                "email": test_email,
                "password": "TestPass123"
            }
        )
        if success:
            self.log(f"   Registered user: {test_email}")
            return True, test_email
        return False, None

    def test_user_login(self, email, password="TestPass123"):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success:
            self.user_id = response.get('user_id')
            return True
        return False

    def test_profile_operations(self):
        """Test profile get and update"""
        # Get profile
        success, profile = self.run_test("Get Profile", "GET", "user/profile", 200)
        if not success:
            return False

        # Update profile (onboarding)
        profile_data = {
            "loan_type": "personal",
            "employment_type": "salaried",
            "monthly_income": 50000,
            "existing_loans": False,
            "existing_loan_emi": 0,
            "credit_score_known": True,
            "credit_score": 750,
            "desired_amount": 500000,
            "desired_tenure_months": 60
        }
        
        success, updated_profile = self.run_test(
            "Update Profile",
            "PUT",
            "user/profile",
            200,
            data=profile_data
        )
        if success:
            self.log(f"   Profile updated with onboarding_complete: {updated_profile.get('onboarding_complete')}")
            return True
        return False

    def test_loan_products(self):
        """Test loan products endpoint"""
        success, products = self.run_test("Get Loan Products", "GET", "loans/products", 200)
        if success:
            self.log(f"   Found {len(products)} loan products")
            return True
        return False

    def test_loan_recommendations(self):
        """Test loan recommendations"""
        success, recommendations = self.run_test("Get Recommendations", "GET", "loans/recommendations", 200)
        if success:
            self.log(f"   Found {len(recommendations)} recommendations")
            if recommendations:
                rec = recommendations[0]
                self.log(f"   Best option: {rec.get('bank_name')} at {rec.get('interest_rate')}%")
            return True
        return False

    def test_lead_operations(self):
        """Test lead creation, listing, and update"""
        # First get recommendations to create a lead
        success, recommendations = self.run_test("Get Recommendations for Lead", "GET", "loans/recommendations", 200)
        if not success or not recommendations:
            self.log("❌ No recommendations available for lead testing")
            return False

        rec = recommendations[0]
        
        # Create lead
        lead_data = {
            "product_id": rec['product_id'],
            "bank_name": rec['bank_name'],
            "product_name": rec['product_name']
        }
        
        success, lead = self.run_test("Create Lead", "POST", "leads", 200, data=lead_data)
        if not success:
            return False
        
        lead_id = lead.get('lead_id')
        self.log(f"   Created lead: {lead_id}")

        # Get leads
        success, leads = self.run_test("Get Leads", "GET", "leads", 200)
        if not success:
            return False
        
        self.log(f"   Found {len(leads)} leads")

        # Update lead status
        success, updated_lead = self.run_test(
            "Update Lead Status",
            "PUT",
            f"leads/{lead_id}",
            200,
            data={"status": "revoked"}
        )
        if success:
            self.log(f"   Lead status updated to: {updated_lead.get('status')}")
            return True
        return False

    def test_credit_builder(self):
        """Test credit builder suggestions"""
        success, suggestions = self.run_test("Get Credit Builder Suggestions", "GET", "credit-builder/suggestions", 200)
        if success:
            self.log(f"   Found {len(suggestions)} credit suggestions")
            return True
        return False

    def test_ai_suggest(self):
        """Test AI suggestion endpoint"""
        success, response = self.run_test(
            "AI Suggest",
            "POST",
            "ai/suggest",
            200,
            data={"message": "What is the best loan for me?", "language": "en"}
        )
        if success:
            ai_response = response.get('response', '')
            self.log(f"   AI response length: {len(ai_response)} characters")
            return True
        return False

    def test_language_update(self):
        """Test language update"""
        success, response = self.run_test(
            "Update Language",
            "PUT",
            "user/language",
            200,
            data={"language": "hi"}
        )
        if success:
            self.log(f"   Language updated to: {response.get('language')}")
            return True
        return False

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test("Logout", "POST", "auth/logout", 200)
        if success:
            self.log("   Successfully logged out")
            return True
        return False

    def test_forgot_password_flow(self):
        """Test forgot password flow"""
        # Test forgot password request
        success, response = self.run_test(
            "Forgot Password Request",
            "POST",
            "auth/forgot-password",
            200,
            data={"email": "admin@rinkosh.com"}
        )
        if not success:
            return False
        
        debug_otp = response.get('debug_otp')
        if not debug_otp:
            self.log("❌ No debug OTP returned")
            return False
        
        self.log(f"   Debug OTP: {debug_otp}")
        
        # Test reset password with OTP
        success, response = self.run_test(
            "Reset Password",
            "POST",
            "auth/reset-password",
            200,
            data={
                "email": "admin@rinkosh.com",
                "otp": debug_otp,
                "new_password": "Admin@123"  # Reset to same password
            }
        )
        if success:
            self.log("   Password reset successful")
            return True
        return False

    def test_credit_score_check(self):
        """Test credit score check placeholder"""
        success, response = self.run_test("Credit Score Check", "GET", "credit-score/check", 200)
        if success:
            status = response.get('status')
            providers = response.get('providers', [])
            self.log(f"   Status: {status}, Providers: {len(providers)}")
            return True
        return False

    def test_admin_analytics(self):
        """Test admin analytics endpoint"""
        success, response = self.run_test("Admin Analytics", "GET", "admin/analytics", 200)
        if success:
            total_users = response.get('total_users', 0)
            total_leads = response.get('total_leads', 0)
            leads_by_status = response.get('leads_by_status', {})
            leads_by_bank = response.get('leads_by_bank', [])
            commission_summary = response.get('commission_summary', {})
            recent_leads = response.get('recent_leads', [])
            
            self.log(f"   Total users: {total_users}")
            self.log(f"   Total leads: {total_leads}")
            self.log(f"   Leads by status: {leads_by_status}")
            self.log(f"   Leads by bank count: {len(leads_by_bank)}")
            self.log(f"   Commission summary: {commission_summary}")
            self.log(f"   Recent leads count: {len(recent_leads)}")
            return True
        return False

    def test_admin_lead_update(self, lead_id):
        """Test admin lead update endpoint"""
        success, response = self.run_test(
            "Admin Lead Update",
            "PUT",
            f"admin/leads/{lead_id}",
            200,
            data={"status": "applied"}
        )
        if success:
            updated_status = response.get('status')
            self.log(f"   Lead status updated to: {updated_status}")
            return True
        return False

    def test_non_admin_access(self):
        """Test that non-admin users get 403 on admin endpoints"""
        success, response = self.run_test("Non-Admin Analytics Access", "GET", "admin/analytics", 403)
        if success:
            self.log("   Non-admin correctly blocked from admin endpoints")
            return True
        return False

def main():
    print("🚀 Starting Rinkosh API Testing (Iteration 3)...")
    print("=" * 60)
    
    tester = RinkoshAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health),
        ("Admin Login", tester.test_admin_login),
        ("Auth Me", tester.test_auth_me),
    ]
    
    # Run basic tests first
    for test_name, test_func in tests:
        if not test_func():
            print(f"\n❌ Critical test failed: {test_name}")
            print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
            return 1
    
    # Test new admin analytics endpoints (Phase 3)
    print("\n📊 Testing Admin Analytics (Phase 3)...")
    if not tester.test_admin_analytics():
        print("❌ Admin analytics failed")
    
    # Test user flow to create leads for admin testing
    print("\n🔄 Testing User Registration & Lead Creation...")
    reg_success, test_email = tester.test_user_registration()
    if not reg_success:
        print("❌ User registration failed")
        return 1
    
    if not tester.test_auth_me():
        print("❌ Auth me after registration failed")
        return 1
    
    if not tester.test_profile_operations():
        print("❌ Profile operations failed")
        return 1
    
    # Test loan features to create leads
    print("\n💰 Testing Loan Features...")
    loan_tests = [
        ("Loan Products", tester.test_loan_products),
        ("Loan Recommendations", tester.test_loan_recommendations),
        ("Lead Operations", tester.test_lead_operations),
    ]
    
    lead_id = None
    for test_name, test_func in loan_tests:
        if not test_func():
            print(f"❌ {test_name} test failed")
        elif test_name == "Lead Operations":
            # Get the lead ID for admin testing
            success, leads = tester.run_test("Get Leads for Admin Test", "GET", "leads", 200)
            if success and leads:
                lead_id = leads[0].get('lead_id')
    
    # Test non-admin access to admin endpoints
    print("\n🔒 Testing Non-Admin Access Control...")
    if not tester.test_non_admin_access():
        print("❌ Non-admin access control failed")
    
    # Switch back to admin for admin-specific tests
    print("\n👑 Testing Admin-Specific Features...")
    if not tester.test_admin_login():
        print("❌ Admin re-login failed")
        return 1
    
    # Test admin analytics again with data
    if not tester.test_admin_analytics():
        print("❌ Admin analytics with data failed")
    
    # Test admin lead update if we have a lead
    if lead_id:
        if not tester.test_admin_lead_update(lead_id):
            print("❌ Admin lead update failed")
    
    # Test other features
    print("\n🏗️ Testing Other Features...")
    other_tests = [
        ("Credit Builder", tester.test_credit_builder),
        ("Credit Score Check", tester.test_credit_score_check),
        ("Language Update", tester.test_language_update),
        ("AI Suggest", tester.test_ai_suggest),
        ("Forgot Password Flow", tester.test_forgot_password_flow),
    ]
    
    for test_name, test_func in other_tests:
        if not test_func():
            print(f"❌ {test_name} test failed")
    
    # Final logout
    tester.test_logout()
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("🎉 Excellent! Backend is working well.")
        return 0
    elif success_rate >= 75:
        print("⚠️  Good, but some issues need attention.")
        return 0
    else:
        print("❌ Multiple issues found. Backend needs fixes.")
        return 1

if __name__ == "__main__":
    sys.exit(main())