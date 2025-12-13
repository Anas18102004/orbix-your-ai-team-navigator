# Orbix Video Meetings - Operations Guide

## Overview

Orbix Video Meetings is a feature-flagged MVP that enables workspace members to schedule, join, and record video meetings with AI-powered transcription and summarization.

**Default SFU**: mediasoup (self-hosted)  
**Fallback**: Managed providers (Daily.co, Agora) via `MEETINGS_SFU=managed`

## Architecture

```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │ WebSocket + HTTP
       ▼
┌─────────────────┐
│  Express API    │
│  /api/meetings  │
└──────┬──────────┘
       │
       ├──► mediasoup (SFU)
       ├──► S3 (Recordings)
       ├──► STT Provider (Whisper/Google/Azure)
       └──► LangGraph (Summaries)
```

## Environment Variables

### Feature Flag
```bash
FEATURE_MEETINGS=false  # Set to true to enable meetings feature
```

### SFU Configuration
```bash
MEETINGS_SFU=mediasoup  # "mediasoup" | "managed"
```

### TURN/STUN Servers (Required for mediasoup)
```bash
TURN_SERVER_URL=stun:turn.example.com:3478
TURN_USER=turnuser
TURN_PASS=turnpass
```

### S3 Storage (Recordings)
```bash
RECORDING_S3_BUCKET=orbix-meetings
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=us-east-1
```

### STT Provider
```bash
STT_PROVIDER=whisper  # "whisper" | "google" | "azure"
STT_API_KEY=your-stt-api-key
```

### LangGraph (AI Summaries)
```bash
LANGGRAPH_ENDPOINT=https://internal-langgraph/execute
LANGGRAPH_API_KEY=your-langgraph-key
LANGMODEL_PROVIDER=openai  # "openai" | "anthropic" | "azure"
```

### Retention
```bash
DEFAULT_MEETING_RETENTION_DAYS=365
```

## Quick Start: mediasoup Setup

### 1. Install mediasoup

```bash
npm install mediasoup
```

### 2. Configure mediasoup Workers

mediasoup requires worker processes. Configure in `server/services/meetings/sfu/mediasoupService.ts`:

```typescript
const mediasoup = require('mediasoup');

const workerSettings = {
  logLevel: 'warn',
  logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
  rtcMinPort: 40000,
  rtcMaxPort: 49999,
};

// Initialize worker pool
const numWorkers = os.cpus().length;
```

### 3. Provision TURN Server (coturn)

**Install coturn:**
```bash
# Ubuntu/Debian
sudo apt-get install coturn

# macOS
brew install coturn
```

**Configure `/etc/turnserver.conf`:**
```ini
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=YOUR_PUBLIC_IP
realm=orbix.meetings
server-name=orbix.meetings

# Static auth
user=turnuser:turnpass
```

**Start coturn:**
```bash
sudo systemctl start coturn
sudo systemctl enable coturn
```

### 4. S3 Bucket Setup

**Create bucket:**
```bash
aws s3 mb s3://orbix-meetings --region us-east-1
```

**Set lifecycle policy (auto-delete after retention):**
```json
{
  "Rules": [{
    "Id": "DeleteOldRecordings",
    "Status": "Enabled",
    "Expiration": {
      "Days": 365
    }
  }]
}
```

**CORS configuration:**
```json
{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}
```

## Monitoring & Metrics

### Key Metrics

- `meetings.created` - Counter
- `meetings.joined` - Counter
- `meetings.started` - Counter
- `meetings.ended` - Counter
- `recordings.uploaded` - Counter
- `stt.jobs.started` - Counter
- `stt.jobs.failed` - Counter
- `langgraph.jobs.started` - Counter
- `langgraph.jobs.failed` - Counter
- `recordings.deleted` - Counter

### Alarm Thresholds

- **High failure rate**: `stt.jobs.failed / stt.jobs.started > 0.1` (10%)
- **Recording upload failures**: Alert if > 5 failures/hour
- **LangGraph timeout**: Alert if jobs > 5 minutes

## Troubleshooting

### mediasoup Workers Not Starting

Check:
1. Port range availability (40000-49999)
2. Worker process limits (`ulimit -n`)
3. Logs: `server/logs/mediasoup-*.log`

### TURN Connection Failures

Test TURN server:
```bash
# Install trickle-ice
npm install -g trickle-ice

# Test
trickle-ice --ice-server stun:turn.example.com:3478
```

### S3 Upload Failures

Check:
1. IAM permissions (PutObject, GetObject)
2. Bucket CORS configuration
3. Network connectivity
4. File size limits (multipart upload threshold)

### STT Processing Delays

- Check STT provider quota/rate limits
- Monitor job queue depth
- Consider chunking large recordings

## Security Considerations

1. **Join Tokens**: Short-lived (1 minute TTL), signed with JWT
2. **S3 URLs**: Signed with 1-hour expiry (configurable)
3. **WebSocket Origin**: Validate against `FRONTEND_URL`
4. **Recording Access**: Workspace-scoped, role-based (Omni/Org Admin can download)
5. **Consent**: Explicit checkboxes, logged in audit logs

## Rollout Strategy

1. **Staging**: Run migrations, test with internal team
2. **Beta**: Enable `FEATURE_MEETINGS=true` for specific org IDs
3. **Gradual**: Monitor metrics for 1 week before wider rollout
4. **Full**: Enable for all workspaces

## Managed Provider Fallback

If mediasoup is not viable, set `MEETINGS_SFU=managed` and configure provider:

```bash
# Daily.co example
DAILY_API_KEY=your-daily-key
DAILY_DOMAIN=orbix.daily.co
```

The SFU abstraction layer will route to provider SDK instead of mediasoup.

## Support

For issues:
1. Check audit logs: `auditLogs` collection, filter by `resourceType: 'meeting'`
2. Review worker logs: `server/logs/stt-worker.log`, `server/logs/langgraph-worker.log`
3. Monitor metrics dashboard
