# Quick Start Guide - Orbix AI Orchestrator

## 🚀 Get Started in 3 Steps

### Step 1: Configure Environment

1. Open `ai_orchestrator/.env`
2. Set your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. (Optional) Update other settings as needed

### Step 2: Start the Service

```bash
cd ai_orchestrator
uvicorn main:app --reload
```

The service will start on `http://localhost:8000`

### Step 3: Test It

**Health Check:**
```bash
curl http://localhost:8000/health
```

**Test Chat-to-Task (requires API key):**
```bash
curl -X POST http://localhost:8000/ai/chat_to_task \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "message_id": "test123",
    "workspace_id": "ws123",
    "channel_id": "ch123",
    "text": "We need to fix the login bug",
    "sender_id": "user123",
    "sender_name": "John Doe",
    "channel_name": "general"
  }'
```

---

## 📋 Integration Checklist

- [ ] Gemini API key set in `.env`
- [ ] AI service running on port 8000
- [ ] Backend running on port 3000
- [ ] Backend `.env` has `AI_SERVICE_URL=http://localhost:8000`
- [ ] Backend `.env` has `AI_SERVICE_API_KEY` matching AI service
- [ ] Workspace model updated with `aiAutomationMode` field
- [ ] Bot user created in database
- [ ] Message creation webhook added to backend

---

## 🔧 Troubleshooting

**Service won't start:**
- Check if port 8000 is available
- Verify Python dependencies: `pip install -r requirements.txt`
- Check `.env` file exists and has required keys

**401 Unauthorized errors:**
- Verify `AI_SERVICE_API_KEY` matches between services
- Check request headers include `X-API-Key`

**Backend connection errors:**
- Verify backend is running on configured port
- Check `ORBIX_BACKEND_URL` in `.env`

**Gemini API errors:**
- Verify API key is valid
- Check API quota/limits
- Ensure model name is correct

---

## 📚 Documentation

- `README.md` - Full documentation
- `INTEGRATION_GUIDE.md` - Backend integration details
- `TEST_RESULTS.md` - Test results and status

---

## 🎯 What's Next?

1. Integrate with your backend (see `INTEGRATION_GUIDE.md`)
2. Test with real workspace data
3. Monitor AI decisions and adjust confidence thresholds
4. Set up MongoDB vector search for enhanced RAG (optional)

