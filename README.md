# Melingo - Proactive Engagement System for Shopify

A JavaScript-based engagement system that tracks user behavior on Shopify stores and uses AI to determine the optimal moment to display personalized messages.

## 🎯 Overview

Melingo analyzes user session data in real-time and leverages OpenAI's LLM to decide when and what message to show users, increasing engagement and conversion rates.

## 🏗️ Architecture

- **Frontend**: JavaScript tracker + popup UI
- **Backend**: FastAPI service deployed on Modal
- **AI**: OpenAI GPT-3.5-turbo for intelligent decision making

## 🚀 Setup Instructions

### 1. Backend Setup (Modal)

```bash
cd backend

pip install modal

modal secret create openai-secret OPENAI_API_KEY=your_openai_api_key_here

modal deploy modal_app.py
```

### 2. Frontend Setup

The frontend consists of three files in the `frontend/` directory:
- `tracker.js` - Core tracking functionality
- `popup.js` - Popup component
- `popup.css` - Popup styling

## 🛍️ Shopify Integration Steps

### 1. Upload Files to Shopify

1. Go to **Online Store → Themes → Edit code**
2. In the **Assets folder**, upload:
   - `tracker.js` → save as `melingo-tracker.js`
   - `popup.js` → save as `melingo-popup.js`
   - `popup.css` → save as `melingo-popup.css`

### 2. Add to Theme

Add this code to `layout/theme.liquid` before the closing `</head>` tag:

```html
<script>
  window.MELINGO_API_URL = 'https://your-modal-app-url.modal.run';
  window.MELINGO_DEBUG = false;
</script>
{{ 'melingo-popup.css' | asset_url | stylesheet_tag }}
<script src="{{ 'melingo-popup.js' | asset_url }}" defer></script>
<script src="{{ 'melingo-tracker.js' | asset_url }}" defer></script>
```

### 3. Test Integration

1. Visit your store
2. Open browser console (F12)
3. Look for: `🎯 Melingo: Tracker initialized`
4. Test manually: `MelingoTracker.requestAnalysis();`

## 🤖 How AI Prompting Works

### Session Analysis
The system tracks and analyzes:
- Page views (product, category, cart, home)
- User clicks and interactions
- Session duration
- Cart activity
- Current page type

### AI Decision Process
1. **Data Collection**: Session events are aggregated
2. **Analysis**: Behavioral patterns are analyzed
3. **AI Prompt**: Structured data sent to OpenAI:
   ```json
   {
     "page_views": 3,
     "clicks": 5,
     "session_duration": 120,
     "has_cart_items": true,
     "current_page": "product"
   }
   ```
4. **AI Response**: GPT-3.5 decides whether to show a message and generates content:
   ```json
   {
     "should_show_message": true,
     "message": "Complete your order for free shipping!",
     "trigger_type": "urgency"
   }
   ```

### Trigger Logic
- **Discount**: First-time visitors, browsers
- **Urgency**: Users with cart items
- **Help**: Users spending long time on product pages
- **Recommendation**: High-engagement users

## 🔧 Required Environment Variables

### Modal Secrets
Create these secrets in Modal:

```bash
modal secret create openai-secret OPENAI_API_KEY=sk-your-openai-key


modal secret create melingo-config DEBUG=false
```

### Frontend Configuration
Set these in your Shopify theme:

```javascript
window.MELINGO_API_URL = 'https://your-modal-deployment.modal.run';
window.MELINGO_DEBUG = false; 
window.MELINGO_SESSION_TIMEOUT = 30 * 60 * 1000; 
```

## 📊 What Gets Tracked

- ✅ Page views with page type detection
- ✅ Button and link clicks
- ✅ Add to cart actions
- ✅ Session duration and activity
- ✅ Page visibility changes

## 🎨 Popup Features

- **Smart Timing**: AI-determined optimal moments
- **Responsive Design**: Works on desktop and mobile
- **Theme Integration**: Dark theme matching store design
- **Multiple Types**: Discount, urgency, help, recommendation
- **Auto-dismiss**: Configurable timeout
- **Click Tracking**: Measures engagement

## 🧪 Testing

### Manual Testing
```javascript
MelingoTracker.requestAnalysis();


MelingoPopup.show("Test message!", "discount");


console.log(MelingoTracker.eventQueue);
```


---

**Built for the Shopify Proactive Engagement System assignment** 🎯
