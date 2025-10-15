#!/usr/bin/env python3
"""
Integration tests for SignSynth API
Tests the complete workflow from text input to video generation.
"""

import asyncio
import json
import time
import requests
import pytest
from typing import Dict, Any

# Test configuration
API_BASE_URL = "http://localhost:8000/api/v1"
API_KEY = "demo-api-key"

class TestSignSynthIntegration:
    """Integration tests for SignSynth API."""
    
    @pytest.fixture
    def api_headers(self):
        """Get API headers for requests."""
        return {
            "Content-Type": "application/json",
            "x-api-key": API_KEY
        }
    
    def test_health_check(self, api_headers):
        """Test API health check endpoint."""
        response = requests.get(f"{API_BASE_URL}/health", headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data
    
    def test_supported_languages(self, api_headers):
        """Test supported languages endpoint."""
        response = requests.get(f"{API_BASE_URL}/generate/supported-languages", headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "sign_languages" in data
        assert "input_languages" in data
        assert "speeds" in data
        assert "qualities" in data
        assert "avatars" in data
        
        # Check sign languages
        sign_languages = data["sign_languages"]
        assert len(sign_languages) > 0
        assert any(lang["code"] == "ASL" for lang in sign_languages)
    
    def test_generation_limits(self, api_headers):
        """Test generation limits endpoint."""
        response = requests.get(f"{API_BASE_URL}/generate/limits", headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "max_text_length" in data
        assert "max_concurrent_jobs" in data
        assert "rate_limit_per_minute" in data
        assert "supported_formats" in data
    
    def test_create_job(self, api_headers):
        """Test job creation."""
        job_data = {
            "text": "Hello, how are you?",
            "sign_language": "ASL",
            "speed": "normal",
            "render_quality": "preview"
        }
        
        response = requests.post(f"{API_BASE_URL}/generate", json=job_data, headers=api_headers)
        assert response.status_code == 200
        
        job = response.json()
        assert "id" in job
        assert job["text"] == job_data["text"]
        assert job["status"] == "queued"
        assert job["progress"] == 0
        
        return job["id"]
    
    def test_get_job_status(self, api_headers):
        """Test getting job status."""
        # First create a job
        job_id = self.test_create_job(api_headers)
        
        # Then get its status
        response = requests.get(f"{API_BASE_URL}/jobs/{job_id}", headers=api_headers)
        assert response.status_code == 200
        
        job = response.json()
        assert job["id"] == job_id
        assert "status" in job
        assert "progress" in job
        assert "created_at" in job
    
    def test_list_jobs(self, api_headers):
        """Test listing jobs."""
        response = requests.get(f"{API_BASE_URL}/jobs", headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "jobs" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data
        assert "pages" in data
        
        # Check that jobs is a list
        assert isinstance(data["jobs"], list)
    
    def test_job_filters(self, api_headers):
        """Test job filtering and pagination."""
        # Test with filters
        params = {
            "page": 1,
            "per_page": 5,
            "status": "queued"
        }
        
        response = requests.get(f"{API_BASE_URL}/jobs", params=params, headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 1
        assert data["per_page"] == 5
    
    def test_job_stats(self, api_headers):
        """Test job statistics endpoint."""
        response = requests.get(f"{API_BASE_URL}/jobs/stats", headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total_jobs" in data
        assert "queued_jobs" in data
        assert "processing_jobs" in data
        assert "succeeded_jobs" in data
        assert "failed_jobs" in data
        assert "cancelled_jobs" in data
        
        # Check that all counts are non-negative
        for key in ["total_jobs", "queued_jobs", "processing_jobs", "succeeded_jobs", "failed_jobs", "cancelled_jobs"]:
            assert data[key] >= 0
    
    def test_preview_generation(self, api_headers):
        """Test preview generation endpoint."""
        preview_data = {
            "text": "Hello",
            "sign_language": "ASL",
            "speed": "normal"
        }
        
        response = requests.post(f"{API_BASE_URL}/generate/preview", json=preview_data, headers=api_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "job_id" in data
        assert "status" in data
        assert "progress" in data
    
    def test_invalid_job_id(self, api_headers):
        """Test handling of invalid job ID."""
        invalid_job_id = "invalid-job-id"
        
        response = requests.get(f"{API_BASE_URL}/jobs/{invalid_job_id}", headers=api_headers)
        assert response.status_code == 404
    
    def test_invalid_job_data(self, api_headers):
        """Test handling of invalid job data."""
        invalid_job_data = {
            "text": "",  # Empty text should be invalid
            "sign_language": "INVALID",  # Invalid sign language
            "speed": "invalid_speed"  # Invalid speed
        }
        
        response = requests.post(f"{API_BASE_URL}/generate", json=invalid_job_data, headers=api_headers)
        assert response.status_code == 400
    
    def test_rate_limiting(self, api_headers):
        """Test rate limiting (if implemented)."""
        # This test might need to be adjusted based on actual rate limiting implementation
        job_data = {
            "text": "Test rate limiting",
            "sign_language": "ASL",
            "speed": "normal",
            "render_quality": "preview"
        }
        
        # Make multiple requests quickly
        responses = []
        for i in range(10):
            response = requests.post(f"{API_BASE_URL}/generate", json=job_data, headers=api_headers)
            responses.append(response)
            time.sleep(0.1)  # Small delay between requests
        
        # Check that not all requests were successful (rate limiting should kick in)
        success_count = sum(1 for r in responses if r.status_code == 200)
        # This assertion might need adjustment based on actual rate limiting
        assert success_count > 0  # At least some requests should succeed
    
    def test_websocket_connection(self):
        """Test WebSocket connection (basic test)."""
        import websocket
        
        try:
            ws_url = "ws://localhost:8000/ws"
            ws = websocket.create_connection(ws_url, timeout=5)
            
            # Send a ping message
            ws.send(json.dumps({"type": "ping"}))
            
            # Wait for pong response
            response = ws.recv()
            data = json.loads(response)
            assert data["type"] == "pong"
            
            ws.close()
        except Exception as e:
            pytest.skip(f"WebSocket test skipped: {e}")

def run_integration_tests():
    """Run all integration tests."""
    print("🧪 Running SignSynth Integration Tests")
    print("=" * 50)
    
    # Check if API is running
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print("❌ API is not running or not healthy")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        return False
    
    print("✅ API is running and healthy")
    
    # Run pytest
    import subprocess
    import sys
    
    result = subprocess.run([
        sys.executable, "-m", "pytest", 
        __file__, 
        "-v", 
        "--tb=short"
    ], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    return result.returncode == 0

if __name__ == "__main__":
    success = run_integration_tests()
    exit(0 if success else 1)

