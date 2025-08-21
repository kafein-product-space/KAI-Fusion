# 🤖 KAI-Fusion Standalone Chatbot Widget

Bu standalone chatbot widget sistemi, KAI-Fusion workflow'larından bağımsız olarak çalışabilen, herhangi bir web sitesine entegre edilebilen profesyonel bir chat arayüzüdür.

## 🚀 Özellikler

- **Standalone Operation**: Export sisteminden bağımsız çalışır
- **Multi-API Support**: OpenAI, KAI-Fusion API'leri ve demo mode
- **Easy Integration**: Tek script tag ile website entegrasyonu
- **Modern UI**: Profesyonel tasarım
- **Docker Ready**: Tek komutla deployment
- **Cross-origin**: CORS desteği ile her domain'den erişim
- **Responsive Design**: Mobil ve desktop uyumlu arayüz
- **Real-time Chat**: Anlık mesajlaşma deneyimi

## 📦 Kurulum ve Çalıştırma

### Docker ile (Önerilen)

```bash
# Widget klasörüne git
cd /path/to/KAI-Fusion/widget

# Çalıştır
docker-compose up -d

# Logları kontrol et
docker-compose logs -f
```

### Manuel Çalıştırma

```bash
# Bağımlılıkları kur
pip install -r requirements.txt

# Çalıştır
python main.py
```

## 🔧 Kullanım

### 1. Test Sayfası
Widget'ın çalışıp çalışmadığını test etmek için:
```
http://localhost:8002/test-widget
```

### 2. Ana Chat Arayüzü
Direkt chat arayüzüne erişim:
```
http://localhost:8002/
```

### 3. Website Entegrasyonu
Herhangi bir web sitesine eklemek için:

```html
<script src="http://localhost:8002/static/widget.js"
        data-api-url="http://localhost:8002"
        data-api-key="your-api-key" 
        data-label="💬 Chat" 
        data-color="#2563eb"
        data-width="720px" 
        data-height="540px"
        data-position="right" 
        data-open="false">
</script>
```

### 4. KAI-Fusion Integration
KAI-Fusion workflow'ları ile entegre etmek için:

```html
<script src="http://localhost:8002/static/widget.js"
        data-api-url="http://localhost:8000"
        data-api-key="your-kai-fusion-workflow-key" 
        data-label="💬 RAG Chat" 
        data-color="#2563eb"
        data-width="720px" 
        data-height="540px"
        data-position="right" 
        data-open="false">
</script>
```

## 🔑 API Configuration

### 1. Standalone Mode (OpenAI)
`.env` dosyasında OpenAI API key'i tanımlayın:
```env
OPENAI_API_KEY=sk-your-key-here
```
Widget konfigürasyonu:
```html
<script src="http://localhost:8002/static/widget.js"
        data-api-url="http://localhost:8002"
        data-api-key="">
</script>
```

### 2. KAI-Fusion Integration Mode
Widget'ı KAI-Fusion workflow'larına bağlamak için:
```html
<script src="http://localhost:8002/static/widget.js"
        data-api-url="http://localhost:8000"
        data-api-key="your-workflow-api-key">
</script>
```

### 3. Demo Mode
API key olmadığında otomatik demo mode'da çalışır ve örnek yanıtlar verir.

## 🎯 Çalışma Modları

| Mode | API URL | API Key | Açıklama |
|------|---------|---------|----------|
| **Standalone** | `localhost:8002` | OpenAI Key | Widget kendi OpenAI entegrasyonunu kullanır |
| **KAI-Fusion** | `localhost:8000` | Workflow Key | KAI-Fusion RAG workflow'larını kullanır |
| **Demo** | - | - | API key olmadığında demo yanıtlar |

## 📡 API Endpoints

- `GET /` - Ana chat arayüzü (modern, responsive UI)
- `GET /chat` - Chat sayfası (iframe embedding için)
- `GET /test-widget` - Widget test sayfası  
- `POST /api/chat` - Chat API endpoint (JSON)
- `GET /health` - Health check
- `/static/*` - Static files (widget.js, chat.html, CSS, etc.)

## 📋 Chat API Format

### Request
```json
POST /api/chat
{
  "message": "Merhaba!",
  "session_id": "session_123",
  "api_url": "http://localhost:8000",  // optional
  "api_key": "your-api-key"            // optional
}
```

### Response
```json
{
  "response": "Merhaba! Size nasıl yardımcı olabilirim?",
  "session_id": "session_123",
  "timestamp": "2025-08-21T12:00:00",
  "model": "gpt-3.5-turbo"
}
```

## 🛠️ Development

### Logs
```bash
docker-compose logs -f widget
```

### Stop/Start
```bash
docker-compose down
docker-compose up -d
```

### Rebuild
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🌐 Port Configuration

Default port: **8002**

Farklı port kullanmak için docker-compose.yml'de değiştirin:
```yaml
ports:
  - "8003:8000"  # Host port 8003, container port 8000
```

## 🔒 Security

- CORS tüm origin'lere açık (production'da kısıtlayın)
- API key authentication desteklenir
- Environment variable'lar için güvenli saklama önerilir

## 🚨 Troubleshooting

### Container Başlamıyor
```bash
docker logs kai-fusion-widget
```

### API Erişim Sorunu
1. Health check: `curl http://localhost:8002/health`
2. CORS ayarlarını kontrol edin
3. API key'lerin doğru olduğunu kontrol edin
4. Port conflict: Backend'in farklı portda çalıştığından emin olun

### Widget Yüklenmiyor
1. Static files: `curl http://localhost:8002/static/widget.js`
2. Browser console'da hataları kontrol edin
3. Network tab'ında request'leri kontrol edin
4. `data-api-url` parametresinin doğru olduğunu kontrol edin

### KAI-Fusion Entegrasyonu Çalışmıyor
1. KAI-Fusion API'nin çalıştığını kontrol edin: `curl http://localhost:8000/health`
2. Workflow API key'inin doğru olduğunu kontrol edin
3. `data-api-url="http://localhost:8000"` parametresini kullandığınızdan emin olun

### Common Issues
- **404 Not Found**: API endpoint'lerin doğru olduğunu kontrol edin
- **CORS Error**: API URL'lerin doğru konfigüre olduğunu kontrol edin  
- **Connection Refused**: Port'ların doğru mapping olduğunu kontrol edin

## 📄 License

KAI-Fusion project license