#!/usr/bin/env python3
"""
Backend API Testing Script
Tests the FastAPI backend endpoints as specified in the review request.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Backend URL - using localhost:8001 as specified in review request
BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api"

def test_with_retry(test_func, test_name, max_retries=3, delay=2):
    """Execute test with retry logic for hot reload scenarios"""
    for attempt in range(max_retries):
        try:
            print(f"\n{'='*50}")
            print(f"Testing: {test_name} (Attempt {attempt + 1}/{max_retries})")
            print(f"{'='*50}")
            
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

def test_root_endpoint():
    """Test GET /api/ returns Hello World"""
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                return True
            else:
                print(f"Expected message 'Hello World', got: {data.get('message')}")
                return False
        else:
            print(f"Expected status 200, got: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False

def test_status_endpoints():
    """Test POST and GET /api/status endpoints"""
    try:
        # Test POST /api/status
        post_data = {"client_name": "tester"}
        print(f"Sending POST request with data: {post_data}")
        
        post_response = requests.post(
            f"{API_BASE}/status", 
            json=post_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"POST Status Code: {post_response.status_code}")
        print(f"POST Response: {post_response.text}")
        
        if post_response.status_code != 200:
            print(f"POST request failed with status: {post_response.status_code}")
            return False
            
        post_result = post_response.json()
        
        # Verify POST response structure
        required_fields = ["id", "client_name", "timestamp"]
        for field in required_fields:
            if field not in post_result:
                print(f"Missing field '{field}' in POST response")
                return False
        
        if post_result["client_name"] != "tester":
            print(f"Expected client_name 'tester', got: {post_result['client_name']}")
            return False
            
        print(f"✅ POST /api/status returned valid object with id: {post_result['id']}")
        
        # Test GET /api/status
        print("\nTesting GET /api/status...")
        get_response = requests.get(f"{API_BASE}/status", timeout=10)
        
        print(f"GET Status Code: {get_response.status_code}")
        print(f"GET Response: {get_response.text}")
        
        if get_response.status_code != 200:
            print(f"GET request failed with status: {get_response.status_code}")
            return False
            
        get_result = get_response.json()
        
        if not isinstance(get_result, list):
            print(f"Expected list response, got: {type(get_result)}")
            return False
            
        # Check if our posted item is in the list
        found_item = False
        for item in get_result:
            if item.get("id") == post_result["id"] and item.get("client_name") == "tester":
                found_item = True
                break
                
        if not found_item:
            print("Posted item not found in GET /api/status response")
            return False
            
        print(f"✅ GET /api/status returned list with {len(get_result)} items, including our posted item")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False

def test_chat_endpoint():
    """Test POST /api/chat with and without LLM availability"""
    try:
        # Test chat endpoint with the specified payload
        chat_data = {
            "mode": "greeting",
            "language": "de", 
            "summary": {
                "sleep": "ok",
                "water": "low"
            }
        }
        
        print(f"Sending POST request to /api/chat with data: {json.dumps(chat_data, indent=2)}")
        
        response = requests.post(
            f"{API_BASE}/chat",
            json=chat_data,
            headers={"Content-Type": "application/json"},
            timeout=30  # Longer timeout for LLM calls
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"Chat request failed with status: {response.status_code}")
            return False
            
        result = response.json()
        
        # Verify response structure
        if "text" not in result:
            print("Missing 'text' field in chat response")
            return False
            
        if not isinstance(result["text"], str):
            print(f"Expected 'text' to be string, got: {type(result['text'])}")
            return False
            
        if len(result["text"].strip()) == 0:
            print("Chat response text is empty")
            return False
            
        print(f"✅ Chat endpoint returned valid response with text: '{result['text'][:100]}...'")
        
        # Test graceful fallback by checking if response indicates fallback behavior
        response_text = result["text"].lower()
        if "trouble connecting" in response_text or "try again later" in response_text:
            print("✅ Graceful fallback detected - LLM service unavailable but API still works")
        elif len(result["text"]) > 10:  # Assume real LLM response if substantial
            print("✅ LLM integration appears to be working - got substantial response")
        else:
            print("✅ Got basic response - fallback or minimal LLM response")
            
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False

def main():
    """Run all backend tests"""
    print("🚀 Starting Backend API Tests")
    print(f"Testing against: {API_BASE}")
    
    tests = [
        (test_root_endpoint, "GET /api/ - Hello World"),
        (test_status_endpoints, "POST/GET /api/status - Status Check CRUD"),
        (test_chat_endpoint, "POST /api/chat - Chat with LLM/Fallback")
    ]
    
    results = []
    
    for test_func, test_name in tests:
        success = test_with_retry(test_func, test_name)
        results.append((test_name, success))
    
    # Summary
    print(f"\n{'='*60}")
    print("🏁 TEST SUMMARY")
    print(f"{'='*60}")
    
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
        print(f"\n⚠️  {failed} test(s) failed. Check backend logs for details.")
        sys.exit(1)
    else:
        print(f"\n🎉 All tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()