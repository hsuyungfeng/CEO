#!/usr/bin/env python3
"""
Phase 5 API Testing Suite
Complete endpoint validation with detailed reporting
"""

import requests
import json
import sys
from typing import Dict, List, Tuple
from datetime import datetime

class APITester:
    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
        self.passed = 0
        self.failed = 0

    def test(
        self,
        method: str,
        endpoint: str,
        expected_status: int,
        description: str,
        data: Dict = None,
        headers: Dict = None
    ) -> bool:
        """Test an API endpoint"""
        url = f"{self.base_url}{endpoint}"

        try:
            if method == "GET":
                response = self.session.get(url, headers=headers)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=headers)
            elif method == "PATCH":
                response = self.session.patch(url, json=data, headers=headers)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            passed = response.status_code == expected_status

            result = {
                "method": method,
                "endpoint": endpoint,
                "description": description,
                "expected": expected_status,
                "actual": response.status_code,
                "passed": passed,
                "timestamp": datetime.now().isoformat()
            }

            self.results.append(result)

            if passed:
                self.passed += 1
                print(f"✓ [{method}] {endpoint} - {description}")
            else:
                self.failed += 1
                print(f"✗ [{method}] {endpoint} - {description} (got {response.status_code}, expected {expected_status})")
                if response.text:
                    print(f"  Response: {response.text[:200]}")

            return passed

        except requests.exceptions.ConnectionError:
            self.failed += 1
            print(f"✗ [{method}] {endpoint} - Connection failed (is server running on {self.base_url}?)")
            return False
        except Exception as e:
            self.failed += 1
            print(f"✗ [{method}] {endpoint} - Error: {str(e)}")
            return False

    def run_tests(self):
        """Run all test categories"""
        print("\n" + "="*60)
        print("🧪 Phase 5 API Testing Suite")
        print(f"Target: {self.base_url}")
        print("="*60 + "\n")

        # 1. Health Check
        print("📊 1. Health Check")
        print("-" * 40)
        self.test("GET", "/api/health", 200, "Server health status")
        print()

        # 2. Public Products
        print("📦 2. Public Products API")
        print("-" * 40)
        self.test("GET", "/api/products?page=1&limit=10&categoryId=&search=&sortBy=createdAt&order=desc", 200, "Get all products (page 1)")
        self.test("GET", "/api/products?page=1&limit=10&categoryId=&search=&sortBy=name&order=asc", 200, "Paginated products by name")
        self.test("GET", "/api/home", 200, "Featured products (via home)")
        self.test("GET", "/api/products?page=1&limit=10&categoryId=&search=&sortBy=totalSold&order=desc", 200, "Products by sales")
        print()

        # 3. Categories
        print("🏷️  3. Categories API")
        print("-" * 40)
        self.test("GET", "/api/categories", 200, "Get all categories")
        print()

        # 4. Home
        print("🏠 4. Home API")
        print("-" * 40)
        self.test("GET", "/api/home", 200, "Home featured products")
        print()

        # 5. Auth (without credentials)
        print("🔐 5. Auth Endpoints (Public)")
        print("-" * 40)
        self.test("GET", "/api/auth/me", 401, "Get current user (unauthorized)")
        print()

        # 6. Groups
        print("👥 6. Group Buying API")
        print("-" * 40)
        self.test("GET", "/api/groups?page=1&limit=10", 200, "Get public groups (page 1)")
        self.test("GET", "/api/groups?page=1&limit=10&status=PENDING", 200, "Filter groups by status")
        print()

        # 7. Protected endpoints (should fail without auth)
        print("🔒 7. Protected Endpoints (Expected Failures)")
        print("-" * 40)
        self.test("GET", "/api/user/profile", 401, "User profile (requires auth)")
        self.test("GET", "/api/cart", 401, "Shopping cart (requires auth)")
        self.test("GET", "/api/orders", 401, "User orders (requires auth)")
        self.test("GET", "/api/invoices", 401, "Invoices (requires auth)")
        print()

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        total = self.passed + self.failed
        pass_rate = (self.passed / total * 100) if total > 0 else 0

        print("="*60)
        print("📊 Test Summary")
        print("="*60)
        print(f"Total Tests: {total}")
        print(f"✓ Passed: {self.passed}")
        print(f"✗ Failed: {self.failed}")
        print(f"Pass Rate: {pass_rate:.1f}%")
        print("="*60)

        if self.failed == 0:
            print("✅ All tests passed! Environment is ready for Phase 5.")
            print("\nNext steps:")
            print("1. Review PHASE_5_TESTING_PLAN.md for detailed test scenarios")
            print("2. Begin executing P0 tests (Auth, Products, Orders, Groups)")
            print("3. Document results in test report template")
        else:
            print(f"\n⚠️  {self.failed} test(s) failed. Review above for details.")
            print("\nCommon issues:")
            print("- Dev server not running (npm run dev)")
            print("- Database not accessible")
            print("- API endpoint not implemented")

        print("\n")

if __name__ == "__main__":
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3001"

    tester = APITester(base_url)
    tester.run_tests()

    sys.exit(0 if tester.failed == 0 else 1)
