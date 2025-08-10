"""
Simple runner script for the Melingo FastAPI app (Local Version)
"""

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting Melingo Engagement API (Local Server)...")
    print("📝 API Documentation: http://localhost:8000/docs")
    print("🌐 API running at: http://localhost:8000")
    print("🔧 No Modal required - running as standard FastAPI server!")
    
    uvicorn.run("local_app:app", host="0.0.0.0", port=8000, reload=True)
