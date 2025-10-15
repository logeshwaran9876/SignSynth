"""
Entry point for worker processes.
"""

import os
import sys
from celery import Celery

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from worker.celery_app import celery_app

if __name__ == "__main__":
    celery_app.start()

