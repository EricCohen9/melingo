"""
Melingo Shopify Engagement System - Modal Deployment with CORS
"""

import modal
from typing import List, Dict, Any, Optional
import time
from datetime import datetime


app = modal.App("melingo-engagement")

requirements = [
    "fastapi",
    "openai",
    "pydantic"
]

image = modal.Image.debian_slim().pip_install(requirements)

sessions_store: Dict[str, Dict] = {}

from pydantic import BaseModel

class TrackingEvent(BaseModel):
    session_id: str
    event_type: str
    page_type: Optional[str] = None
    page_url: str
    timestamp: float
    data: Optional[Dict[str, Any]] = None

class AnalyzeRequest(BaseModel):
    session_id: str

class AIResponse(BaseModel):
    should_show_message: bool
    message: Optional[str] = None
    trigger_type: Optional[str] = None

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("openai-secret")],
    timeout=60,
    max_containers=10
)
@modal.asgi_app()
def fastapi_app():
    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    import json
    
    app = FastAPI()
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "timestamp": datetime.now().isoformat()}
    
    @app.post("/track")
    async def track_event(request: Request):
        """Receive and store tracking events from frontend"""
        try:
            body = await request.body()
            event_data = json.loads(body.decode())
            
            session_id = event_data.get("session_id")
            
            if session_id not in sessions_store:
                sessions_store[session_id] = {
                    "events": [],
                    "created_at": time.time(),
                    "last_activity": time.time()
                }
            
            sessions_store[session_id]["events"].append(event_data)
            sessions_store[session_id]["last_activity"] = time.time()
            
            return {"status": "success", "session_id": session_id}
            
        except Exception as e:
            return {"error": str(e)}
    
    @app.post("/analyze")
    async def analyze_session(request: Request):
        """Analyze session data and get AI decision"""
        try:
            body = await request.body()
            request_data = json.loads(body.decode())
            session_id = request_data.get("session_id")
            
            if session_id not in sessions_store:
                return {"error": "Session not found"}
            
            session_data = sessions_store[session_id]
            events = session_data["events"]
            
            analysis = analyze_session_behavior(events)
            
            ai_response = get_ai_decision(analysis)
            
            return {
                "should_show_message": ai_response.should_show_message,
                "message": ai_response.message,
                "trigger_type": ai_response.trigger_type
            }
            
        except Exception as e:
            return {
                "should_show_message": True,
                "message": "Thanks for browsing! Get 15% off your first order!",
                "trigger_type": "discount"
            }
    
    return app

def analyze_session_behavior(events: List[Dict]) -> Dict:
    """Analyze session behavior patterns"""
    if not events:
        return {}
    page_views = [e for e in events if e["event_type"] == "page_view"]
    clicks = [e for e in events if e["event_type"] == "click"]
    cart_actions = [e for e in events if e["event_type"] == "add_to_cart"]
    
    session_duration = events[-1]["timestamp"] - events[0]["timestamp"]
    
    product_pages = [e for e in page_views if e.get("page_type") == "product"]
    cart_pages = [e for e in page_views if e.get("page_type") == "cart"]
    
    return {
        "total_events": len(events),
        "page_views": len(page_views),
        "clicks": len(clicks),
        "cart_actions": len(cart_actions),
        "session_duration": session_duration,
        "product_page_views": len(product_pages),
        "cart_page_views": len(cart_pages),
        "current_page": events[-1].get("page_type", "unknown"),
        "has_cart_items": len(cart_actions) > 0,
        "events": events[-5:]  
    }

def get_ai_decision(analysis: Dict) -> AIResponse:
    """Use OpenAI to decide if and what message to show"""
    
    try:
        from openai import OpenAI

        client = OpenAI()
        import os
        
        
        prompt = f"""
You are an AI assistant helping an e-commerce store engage customers at the right moment.

Analyze this user session data and decide if you should show an engagement message:

Session Analysis:
- Total page views: {analysis.get('page_views', 0)}
- Total clicks: {analysis.get('clicks', 0)}
- Products viewed: {analysis.get('product_page_views', 0)}
- Cart interactions: {analysis.get('cart_actions', 0)}
- Session duration: {analysis.get('session_duration', 0):.1f} seconds
- Current page type: {analysis.get('current_page', 'unknown')}
- Has items in cart: {analysis.get('has_cart_items', False)}

Rules for engagement:
1. Don't be annoying - only show messages when it adds value
2. Consider user behavior patterns (hesitation, high engagement, etc.)
3. Time messages appropriately (not too early, not too late)
4. Personalize based on behavior

Respond in JSON format:
{{
    "should_show_message": true/false,
    "message": "Your personalized message here (max 50 words)",
    "reasoning": "Brief explanation of why",
    "trigger_type": "discount" | "help" | "urgency" | "recommendation" | null
}}
"""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a smart e-commerce engagement assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.7
        )
        
        ai_text = response.choices[0].message.content
        
        print(f"🤖 OpenAI Response: {ai_text}")
        
        if "should_show_message\": true" in ai_text:
            import re
            message_match = re.search(r'"message":\s*"([^"]+)"', ai_text)
            trigger_match = re.search(r'"trigger_type":\s*"([^"]+)"', ai_text)
            
            message = message_match.group(1) if message_match else "Special offer just for you!"
            trigger_type = trigger_match.group(1) if trigger_match else "discount"
            
            print(f"✅ Parsed - Message: '{message}', Trigger: '{trigger_type}'")
            
            return AIResponse(
                should_show_message=True,
                message=message,
                trigger_type=trigger_type
            )
        else:
            print("❌ OpenAI said not to show message")
            return AIResponse(should_show_message=False)
            
    except Exception as e:
        print(f"❌ AI decision error: {e}")
        fallback_response = get_fallback_decision(analysis)
        print(f"🔄 Using fallback: {fallback_response.message}")
        return fallback_response

def get_fallback_decision(analysis: Dict) -> AIResponse:
    """Fallback decision logic if AI fails"""
    
    duration = analysis.get('session_duration', 0)
    product_views = analysis.get('product_page_views', 0)
    has_cart = analysis.get('has_cart_items', False)
    total_events = analysis.get('total_events', 0)
    
    if has_cart:
        return AIResponse(
            should_show_message=True,
            message="Great choice! Complete your order for free shipping!",
            trigger_type="urgency"
        )
    
    if total_events >= 3:
        return AIResponse(
            should_show_message=True,
            message="Still browsing? Get 10% off your first order!",
            trigger_type="discount"
        )
    
    return AIResponse(should_show_message=False)
