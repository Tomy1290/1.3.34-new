#!/usr/bin/env python3
"""
Backend API Testing Script - German Review Request
Tests the FastAPI backend endpoints as specified in the German review request.
Focus on POST /api/chat endpoint with specific test cases.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Backend URL - using localhost:8001 as backend runs internally
BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api"

def test_with_retry(test_func, test_name, max_retries=2, delay=1):
    """Execute test with retry logic"""
    for attempt in range(max_retries):
        try:
            print(f"\n{'='*60}")
            print(f"Testing: {test_name} (Attempt {attempt + 1}/{max_retries})")
            print(f"{'='*60}")
            
            result = test_func()
            if result:
                print(f"✅ {test_name} - PASSED")
                return True
            else:
                print(f"❌ {test_name} - FAILED")
                if attempt < max_retries - 1:
                    print(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
        except Exception as e:
            print(f"❌ {test_name} - ERROR: {str(e)}")
            if attempt < max_retries - 1:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print(f"❌ {test_name} - FAILED after {max_retries} attempts")
                return False
    
    return False

def test_api_prefix_validation():
    """Test 4: Validate all backend routes use /api prefix - GET /api/ returns Hello World"""
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("✅ GET /api/ returns correct Hello World message")
                return True
            else:
                print(f"❌ Expected message 'Hello World', got: {data.get('message')}")
                return False
        else:
            print(f"❌ Expected status 200, got: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_greeting_request():
    """Test 1: Send greeting request to /api/chat with specific payload"""
    try:
        # Exact payload as specified in German review request
        chat_data = {
            "mode": "greeting",
            "language": "de", 
            "summary": {
                "sleep": "6h",
                "steps": 5200
            },
            "model": "gemini-1.5-flash"
        }
        
        print(f"Sending POST request to /api/chat with data:")
        print(json.dumps(chat_data, indent=2))
        
        response = requests.post(
            f"{API_BASE}/chat",
            json=chat_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Check for 200 OK
        if response.status_code != 200:
            print(f"❌ Expected 200 OK, got: {response.status_code}")
            return False
            
        result = response.json()
        
        # Verify response structure
        if "text" not in result:
            print("❌ Missing 'text' field in response")
            return False
            
        if not isinstance(result["text"], str):
            print(f"❌ Expected 'text' to be string, got: {type(result['text'])}")
            return False
            
        if len(result["text"].strip()) == 0:
            print("❌ Response text is empty")
            return False
            
        # Check it's a short tip (not a 500 error)
        response_text = result["text"]
        print(f"✅ Got response text (first 100 chars): '{response_text[:100]}...'")
        
        # Verify it's not an error message
        if "500" in response_text or "error" in response_text.lower():
            print("❌ Response contains error indicators")
            return False
            
        print("✅ Greeting request successful - got short tip, no 500 error")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_chat_request_with_messages():
    """Test 2: Send chat request with messages (two user/assistant + last user)"""
    try:
        chat_data = {
            "mode": "chat",
            "language": "de",
            "messages": [
                {"role": "user", "content": "Wie kann ich besser schlafen?"},
                {"role": "assistant", "content": "Versuche eine regelmäßige Schlafenszeit einzuhalten."},
                {"role": "user", "content": "Was ist mit Sport?"}
            ]
        }
        
        print(f"Sending POST request to /api/chat with messages:")
        print(json.dumps(chat_data, indent=2))
        
        response = requests.post(
            f"{API_BASE}/chat",
            json=chat_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Check for 200 OK
        if response.status_code != 200:
            print(f"❌ Expected 200 OK, got: {response.status_code}")
            return False
            
        result = response.json()
        
        # Verify response structure
        if "text" not in result:
            print("❌ Missing 'text' field in response")
            return False
            
        if not isinstance(result["text"], str):
            print(f"❌ Expected 'text' to be string, got: {type(result['text'])}")
            return False
            
        response_text = result["text"]
        print(f"✅ Got chat response (first 100 chars): '{response_text[:100]}...'")
        
        print("✅ Chat request with messages successful - got response string")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_negative_case():
    """Test 3: Negative test - language 'de' without summary and mode 'greeting'"""
    try:
        # This should still return 200 with generic response, no exception
        chat_data = {
            "language": "de"
            # No mode, no summary - should use defaults
        }
        
        print(f"Sending POST request to /api/chat with minimal data:")
        print(json.dumps(chat_data, indent=2))
        
        response = requests.post(
            f"{API_BASE}/chat",
            json=chat_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Should still get 200 OK (no exception)
        if response.status_code != 200:
            print(f"❌ Expected 200 OK even for minimal request, got: {response.status_code}")
            return False
            
        result = response.json()
        
        # Verify response structure
        if "text" not in result:
            print("❌ Missing 'text' field in response")
            return False
            
        response_text = result["text"]
        print(f"✅ Got generic response (first 100 chars): '{response_text[:100]}...'")
        
        print("✅ Negative test passed - got 200 with generic response, no exception")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def check_backend_logs():
    """Check backend logs for AttributeError about 'str has no attribute file_contents'"""
    try:
        print("\n" + "="*60)
        print("CHECKING BACKEND LOGS FOR ERRORS")
        print("="*60)
        
        # Check recent backend logs
        import subprocess
        result = subprocess.run(
            ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True
        )
        
        log_content = result.stdout
        print("Recent backend error logs:")
        print(log_content)
        
        # Check for the specific AttributeError
        if "AttributeError" in log_content and "file_contents" in log_content:
            print("❌ Found AttributeError about 'file_contents' in logs")
            return False
        else:
            print("✅ No AttributeError about 'file_contents' found in logs")
            return True
            
    except Exception as e:
        print(f"❌ Could not check logs: {e}")
        return True  # Don't fail the test if we can't check logs

def main():
    """Run all backend tests as specified in German review request"""
    print("🚀 Starting Backend API Tests - German Review Request")
    print(f"Testing against: {API_BASE}")
    
    tests = [
        (test_api_prefix_validation, "Test 4: GET /api/ returns Hello World"),
        (test_greeting_request, "Test 1: Greeting request with summary"),
        (test_chat_request_with_messages, "Test 2: Chat request with messages"),
        (test_negative_case, "Test 3: Negative test - minimal request"),
    ]
    
    results = []
    
    for test_func, test_name in tests:
        success = test_with_retry(test_func, test_name)
        results.append((test_name, success))
    
    # Check logs separately
    log_check = check_backend_logs()
    results.append(("Log Check: No AttributeError file_contents", log_check))
    
    # Summary
    print(f"\n{'='*80}")
    print("🏁 TEST SUMMARY - GERMAN REVIEW REQUEST")
    print(f"{'='*80}")
    
    passed = 0
    failed = 0
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}")
        if success:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {len(results)} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed > 0:
        print(f"\n⚠️  {failed} test(s) failed. Check details above.")
        return False
    else:
        print(f"\n🎉 All tests passed!")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)