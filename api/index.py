"""
Vercel Serverless Function Handler for FastAPI
Routes all API requests from the frontend to the FastAPI backend.
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import your FastAPI app from the backend
from server import app as fastapi_app

# Configure CORS for Vercel deployment
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Export the app for Vercel
app = fastapi_app
