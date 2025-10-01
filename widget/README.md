# 🚀 KAI-Fusion Widget - Docker Ready

Clean, lightweight chat widget with Docker deployment. Makes direct requests to `/api/workflow/execute` endpoint.

## 📁 Final Structure

```
widget/
├── index.html          # Demo page with configuration
├── widget.js           # Pure JavaScript widget (simplified)
├── Dockerfile          # nginx-based container
├── docker-compose.yml  # Easy deployment
└── README.md           # This file
```

## 🚀 Quick Start

```bash
cd widget/

# Start with Docker (recommended)
docker compose up -d

# Widget runs on: http://localhost:8080
```

## 🎯 What Was Changed

✅ **Cleaned API endpoints** - Now uses only `/api/workflow/execute`  
✅ **Docker deployment** - nginx-based container  
✅ **Simplified codebase** - Removed unnecessary endpoints  
✅ **CORS enabled** - Works across domains  
✅ **Health check** - Available at `/health`

## 🔧 Integration

### From Docker deployment:
```html
<script src="http://localhost:8080/widget.js" 
        data-target-url="http://your-api.com"
        data-api-key="your-key"></script>
```

### Local file integration:
```html
<script src="./widget.js" 
        data-target-url="http://your-api.com"
        data-api-key="your-key"
        data-position="right"
        data-color="#2563eb"></script>
```

## 📋 Configuration Options

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-target-url` | *required* | Your API endpoint |
| `data-api-key` | `""` | API authentication |
| `data-position` | `right` | Widget position |
| `data-color` | `#2563eb` | Theme color |
| `data-width` | `400px` | Panel width |
| `data-height` | `600px` | Panel height |

## 🔗 API Integration

Widget sends POST requests to: `{target-url}/api/v1/chat/completions`

**Request format:**
```json
{
  "input_data": {
    "input": "user message",
    "message": "user message", 
    "session_id": "session_12345"
  }
}
```

**Response format:**
```json
{
  "result": {
    "response": "AI response text"
  }
}
```

## 🐳 Docker Commands

```bash
# Start widget server
docker compose up -d

# View logs
docker compose logs -f kai-widget

# Stop widget
docker compose down

# Rebuild after changes
docker compose up -d --build
```

## 🌐 Access Points

- **Demo:** http://localhost:8080
- **Widget JS:** http://localhost:8080/widget.js
- **Health:** http://localhost:8080/health

## ✨ Features

- 🚀 **Single endpoint** - Only `/api/workflow/execute`
- 🐳 **Docker ready** - One command deployment
- 📱 **Responsive** - Works on all devices
- 🔒 **Secure** - API key support
- 🎨 **Customizable** - Colors, position, size
- 💻 **Clean code** - Simplified and optimized

---

**Ready to use! Just run `docker compose up -d` and visit localhost:8080**