#!/usr/bin/env python3
"""
SignSynth Demo Script
Demonstrates the complete workflow of text-to-sign language video generation.
"""

import asyncio
import json
import time
import requests
from typing import Dict, Any

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
API_KEY = "demo-api-key"

class SignSynthDemo:
    def __init__(self, api_base_url: str, api_key: str):
        self.api_base_url = api_base_url
        self.api_key = api_key
        self.headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key
        }

    def check_health(self) -> bool:
        """Check if the API is healthy."""
        try:
            response = requests.get(f"{self.api_base_url}/health", timeout=10)
            if response.status_code == 200:
                print("✅ API is healthy")
                return True
            else:
                print(f"❌ API health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Failed to connect to API: {e}")
            return False

    def get_supported_languages(self) -> Dict[str, Any]:
        """Get supported languages and settings."""
        try:
            response = requests.get(f"{self.api_base_url}/generate/supported-languages", headers=self.headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to get supported languages: {response.status_code}")
                return {}
        except Exception as e:
            print(f"❌ Error getting supported languages: {e}")
            return {}

    def create_job(self, text: str, **kwargs) -> Dict[str, Any]:
        """Create a new video generation job."""
        job_data = {
            "text": text,
            "language": kwargs.get("language", "en"),
            "sign_language": kwargs.get("sign_language", "ASL"),
            "speed": kwargs.get("speed", "normal"),
            "avatar_id": kwargs.get("avatar_id", "default"),
            "render_quality": kwargs.get("render_quality", "hd"),
            **kwargs
        }

        try:
            response = requests.post(f"{self.api_base_url}/generate", json=job_data, headers=self.headers)
            if response.status_code == 200:
                job = response.json()
                print(f"✅ Job created: {job['id']}")
                return job
            else:
                print(f"❌ Failed to create job: {response.status_code} - {response.text}")
                return {}
        except Exception as e:
            print(f"❌ Error creating job: {e}")
            return {}

    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get job status and details."""
        try:
            response = requests.get(f"{self.api_base_url}/jobs/{job_id}", headers=self.headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to get job status: {response.status_code}")
                return {}
        except Exception as e:
            print(f"❌ Error getting job status: {e}")
            return {}

    def wait_for_completion(self, job_id: str, timeout: int = 300) -> Dict[str, Any]:
        """Wait for job completion with progress updates."""
        print(f"⏳ Waiting for job {job_id} to complete...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            job = self.get_job_status(job_id)
            if not job:
                break
                
            status = job.get("status", "unknown")
            progress = job.get("progress", 0)
            
            print(f"📊 Status: {status} - Progress: {progress}%")
            
            if status in ["succeeded", "failed", "cancelled"]:
                return job
                
            time.sleep(5)  # Check every 5 seconds
        
        print(f"⏰ Timeout waiting for job {job_id}")
        return self.get_job_status(job_id)

    def download_video(self, job_id: str, output_path: str) -> bool:
        """Download the generated video."""
        try:
            # Get download URL
            response = requests.get(f"{self.api_base_url}/jobs/{job_id}/download", headers=self.headers)
            if response.status_code == 200:
                download_info = response.json()
                download_url = download_info.get("download_url")
                
                if download_url:
                    # Download the video
                    video_response = requests.get(download_url, stream=True)
                    if video_response.status_code == 200:
                        with open(output_path, 'wb') as f:
                            for chunk in video_response.iter_content(chunk_size=8192):
                                f.write(chunk)
                        print(f"✅ Video downloaded to: {output_path}")
                        return True
                    else:
                        print(f"❌ Failed to download video: {video_response.status_code}")
                        return False
                else:
                    print("❌ No download URL available")
                    return False
            else:
                print(f"❌ Failed to get download URL: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error downloading video: {e}")
            return False

    def run_demo(self):
        """Run the complete demo workflow."""
        print("🚀 Starting SignSynth Demo")
        print("=" * 50)
        
        # Check API health
        if not self.check_health():
            return
        
        # Get supported languages
        print("\n📋 Getting supported languages...")
        languages = self.get_supported_languages()
        if languages:
            print("✅ Supported languages retrieved")
            print(f"   Sign Languages: {[lang['code'] for lang in languages.get('sign_languages', [])]}")
            print(f"   Qualities: {[q['code'] for q in languages.get('qualities', [])]}")
        
        # Create a test job
        test_text = "Hello, how are you today? I hope you're having a wonderful day!"
        print(f"\n🎬 Creating job for text: '{test_text}'")
        
        job = self.create_job(
            text=test_text,
            sign_language="ASL",
            speed="normal",
            render_quality="hd"
        )
        
        if not job:
            return
        
        # Wait for completion
        completed_job = self.wait_for_completion(job["id"])
        
        if completed_job.get("status") == "succeeded":
            print("✅ Job completed successfully!")
            
            # Show job details
            print(f"\n📊 Job Details:")
            print(f"   Duration: {completed_job.get('duration', 'Unknown')}s")
            print(f"   File Size: {completed_job.get('file_size', 'Unknown')} bytes")
            print(f"   Processing Time: {completed_job.get('processing_time', 'Unknown')}s")
            
            # Download video
            output_path = f"demo_video_{job['id']}.mp4"
            print(f"\n💾 Downloading video to {output_path}...")
            if self.download_video(job["id"], output_path):
                print("🎉 Demo completed successfully!")
            else:
                print("❌ Demo completed but video download failed")
        else:
            print(f"❌ Job failed: {completed_job.get('error_message', 'Unknown error')}")

def main():
    """Main demo function."""
    demo = SignSynthDemo(API_BASE_URL, API_KEY)
    demo.run_demo()

if __name__ == "__main__":
    main()

