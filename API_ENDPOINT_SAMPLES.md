# NextFlow API Endpoint Samples

This file documents sample requests and responses for all API endpoints currently implemented under `src/app/api`.

## 1) `GET /api/auth/session`

Returns current auth/session user snapshot.

### Sample success response (`200`)
```json
{
  "ok": true,
  "authenticated": true,
  "sessionId": "sess_123",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "Leo",
    "lastName": "N",
    "imageUrl": "https://img.clerk.com/..."
  }
}
```

### Sample unauthorized response (`401`)
```json
{
  "ok": false,
  "authenticated": false
}
```

---

## 2) `GET /api/dashboard/summary`

Returns dashboard counters.

### Sample success response (`200`)
```json
{
  "ok": true,
  "summary": {
    "workflows": 12,
    "webhookEvents": 38
  }
}
```

### Sample response when DB is not configured (`200`)
```json
{
  "ok": true,
  "summary": {
    "workflows": 0,
    "webhookEvents": 0
  },
  "warning": "DATABASE_URL not set"
}
```

### Sample unauthorized response (`401`)
```json
{
  "ok": false,
  "error": "Unauthorized"
}
```

---

## 3) `GET /api/media/ffmpeg-command`

Returns a sample FFmpeg command.

### Sample success response (`200`)
```json
{
  "command": "ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 -preset medium -crf 23 output.mp4",
  "note": "Install FFmpeg locally and run this command in your worker runtime."
}
```

---

## 4) `POST /api/media/transloadit`

Creates a Transloadit assembly (signed request).

### Sample request body
```json
{
  "templateId": "YOUR_TRANSLOADIT_TEMPLATE_ID",
  "inputUrl": "https://example.com/sample.mp4"
}
```

### Sample success response (`200`)
```json
{
  "ok": true,
  "message": "Transloadit assembly created successfully.",
  "assembly": {
    "ok": "ASSEMBLY_UPLOADING",
    "assembly_id": "a1b2c3d4e5",
    "assembly_url": "https://api2.transloadit.com/assemblies/a1b2c3d4e5"
  },
  "ffmpegCommand": "ffmpeg -i input.mp4 -vf fps=24,scale=1024:1024 -c:v libx264 -preset medium output.mp4"
}
```

### Sample validation error (`400`)
```json
{
  "ok": false,
  "error": "templateId and inputUrl are required"
}
```

### Sample env error (`400`)
```json
{
  "ok": false,
  "error": "TRANSLOADIT_KEY and TRANSLOADIT_SECRET are required"
}
```

---

## 5) `POST /api/webhooks/transloadit`

Receives Transloadit webhook and stores event (if DB configured).

### Sample webhook request body
```json
{
  "ok": "ASSEMBLY_COMPLETED",
  "assembly_id": "a1b2c3d4e5",
  "results": {
    "encoded": [
      {
        "ssl_url": "https://cdn.example.com/output.mp4"
      }
    ]
  }
}
```

### Sample success response (`200`)
```json
{
  "ok": true,
  "provider": "transloadit",
  "received": true,
  "event": "assembly.completed",
  "assemblyId": "a1b2c3d4e5",
  "signatureValid": true
}
```

### Sample signature error (`401`)
```json
{
  "ok": false,
  "error": "Invalid Transloadit webhook signature"
}
```

---

## 6) `POST /api/webhooks/trigger`

Receives Trigger.dev webhook and stores event (if DB configured).

### Sample webhook request body
```json
{
  "type": "run.completed",
  "id": "run_123",
  "status": "COMPLETED"
}
```

### Sample success response (`200`)
```json
{
  "ok": true,
  "provider": "trigger.dev",
  "event": "run.completed",
  "signatureValid": true
}
```

### Sample signature error (`401`)
```json
{
  "ok": false,
  "error": "Invalid Trigger webhook signature"
}
```

---

## 7) `GET /api/workflows`

Lists latest workflows for signed-in user.

### Sample success response (`200`)
```json
{
  "ok": true,
  "workflows": [
    {
      "id": "wf_123",
      "userId": "user_123",
      "name": "Marketing Workflow",
      "graphJson": {
        "name": "Marketing Workflow",
        "nodes": [],
        "edges": []
      },
      "createdAt": "2026-03-23T09:10:00.000Z",
      "updatedAt": "2026-03-23T09:11:00.000Z"
    }
  ]
}
```

### Sample response when DB is not configured (`200`)
```json
{
  "ok": true,
  "workflows": [],
  "warning": "DATABASE_URL is not set. Returning empty list."
}
```

### Sample unauthorized response (`401`)
```json
{
  "ok": false,
  "error": "Unauthorized"
}
```

---

## 8) `POST /api/workflows`

Validates and stores workflow payload.

### Sample request body
```json
{
  "name": "Sample Mini Chat",
  "nodes": [
    {
      "id": "text-system-1",
      "type": "text",
      "label": "System Prompt",
      "data": {
        "label": "System Prompt",
        "text": "You are a helpful assistant."
      },
      "position": {
        "x": 100,
        "y": 100
      }
    },
    {
      "id": "llm-1",
      "type": "llm",
      "label": "Run Any LLM",
      "data": {
        "label": "Run Any LLM",
        "model": "gemini-2.5-flash",
        "output": ""
      },
      "position": {
        "x": 420,
        "y": 100
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "text-system-1",
      "target": "llm-1",
      "sourceHandle": "output",
      "targetHandle": "system_prompt"
    }
  ]
}
```

### Sample success response (`200`)
```json
{
  "ok": true,
  "workflow": {
    "id": "wf_123",
    "userId": "user_123",
    "name": "Sample Mini Chat",
    "graphJson": {
      "name": "Sample Mini Chat",
      "nodes": [],
      "edges": []
    }
  }
}
```

### Sample validation-only response when DB is not configured (`200`)
```json
{
  "ok": true,
  "workflow": {
    "name": "Sample Mini Chat",
    "nodes": [],
    "edges": []
  },
  "warning": "DATABASE_URL is not set. Workflow was validated only."
}
```

### Sample schema validation error (`400`)
```json
{
  "ok": false,
  "errors": {
    "formErrors": [],
    "fieldErrors": {
      "name": [
        "String must contain at least 2 character(s)"
      ]
    }
  }
}
```

---

## 9) `GET /api/workflows/:id`

Returns one workflow by id.

### Sample success response (`200`)
```json
{
  "ok": true,
  "workflow": {
    "id": "wf_123",
    "userId": "user_123",
    "name": "Sample Mini Chat",
    "graphJson": {
      "name": "Sample Mini Chat",
      "nodes": [],
      "edges": []
    }
  }
}
```

### Sample not found response (`404`)
```json
{
  "ok": false,
  "error": "Workflow not found"
}
```

### Sample DB config error (`400`)
```json
{
  "ok": false,
  "error": "DATABASE_URL is not configured"
}
```

---

## 10) `DELETE /api/workflows/:id`

Deletes workflow by id.

### Sample success response (`200`)
```json
{
  "ok": true
}
```

### Sample forbidden response (`403`)
```json
{
  "ok": false,
  "error": "Forbidden"
}
```

### Sample not found response (`404`)
```json
{
  "ok": false,
  "error": "Workflow not found"
}
```

---

## 11) `POST /api/workflows/run`

Runs workflow in one of three modes: `full`, `selected`, `single`.

### Sample request body (full run)
```json
{
  "mode": "full",
  "workflow": {
    "name": "Sample Mini Chat",
    "nodes": [
      {
        "id": "text-user-1",
        "type": "text",
        "label": "User Message",
        "data": {
          "label": "User Message",
          "text": "Write a short launch caption"
        },
        "position": {
          "x": 120,
          "y": 240
        }
      },
      {
        "id": "llm-1",
        "type": "llm",
        "label": "Run Any LLM",
        "data": {
          "label": "Run Any LLM",
          "model": "gemini-2.5-flash",
          "output": ""
        },
        "position": {
          "x": 460,
          "y": 240
        }
      }
    ],
    "edges": [
      {
        "id": "e-user-llm",
        "source": "text-user-1",
        "target": "llm-1",
        "sourceHandle": "output",
        "targetHandle": "user_message"
      }
    ]
  }
}
```

### Sample success response (`200`)
```json
{
  "ok": true,
  "run": {
    "id": "local-1710000000000",
    "mode": "full",
    "status": "success",
    "durationMs": 942,
    "nodeRuns": [
      {
        "nodeId": "text-user-1",
        "nodeType": "text",
        "status": "success",
        "durationMs": 0,
        "input": {
          "text": "Write a short launch caption"
        },
        "output": "Write a short launch caption"
      },
      {
        "nodeId": "llm-1",
        "nodeType": "llm",
        "status": "success",
        "durationMs": 892,
        "input": {
          "model": "gemini-2.5-flash",
          "systemInstruction": "",
          "userMessage": "Write a short launch caption",
          "imageUrls": []
        },
        "output": "Launch day is here! ..."
      }
    ]
  },
  "nodeOutputs": {
    "text-user-1": "Write a short launch caption",
    "llm-1": "Launch day is here! ..."
  }
}
```

### Sample invalid payload response (`400`)
```json
{
  "ok": false,
  "error": "Invalid workflow payload"
}
```

### Sample selected/single mode error (`400`)
```json
{
  "ok": false,
  "error": "nodeIds are required for single/selected modes"
}
```

---

## 12) `GET /api/workflows/runs`

Returns recent workflow runs for current user.

### Sample success response (`200`)
```json
{
  "ok": true,
  "runs": [
    {
      "id": "run_123",
      "userId": "user_123",
      "mode": "full",
      "status": "success",
      "durationMs": 942,
      "startedAt": "2026-03-23T09:10:00.000Z",
      "finishedAt": "2026-03-23T09:10:01.000Z",
      "nodeRuns": [
        {
          "id": "nr_1",
          "nodeId": "llm-1",
          "nodeType": "llm",
          "status": "success",
          "durationMs": 892
        }
      ]
    }
  ]
}
```

### Sample response when DB is not configured (`200`)
```json
{
  "ok": true,
  "runs": []
}
```

### Sample unauthorized response (`401`)
```json
{
  "ok": false,
  "error": "Unauthorized"
}
```

