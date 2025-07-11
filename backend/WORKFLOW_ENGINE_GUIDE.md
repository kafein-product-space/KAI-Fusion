# 🚀 LangGraph Workflow Engine - Kullanım Rehberi

Bu rehber, FastAPI backend'inde tam fonksiyonel hale getirilen LangGraph workflow engine'in nasıl kullanılacağını açıklar.

## ✨ Yapılan İyileştirmeler

### 1. BaseNode Sistemi Geliştirildi
- **Connection Handling**: Node'lar arası bağlantılar artık düzgün çalışıyor
- **Input/Output Processing**: User data ve bağlantılı node'lardan gelen veriler doğru işleniyor
- **Error Handling**: Hata durumları graceful şekilde handle ediliyor

### 2. GraphBuilder İyileştirildi
- **Connection Mapping**: Edge'ler artık doğru şekilde parse ediliyor ve node'lara atanıyor
- **Debug Logging**: Workflow build sürecinde detaylı loglar
- **Enhanced Validation**: Node type ve bağlantı validasyonu

### 3. LangGraphWorkflowEngine Tamamlandı
- **Comprehensive Validation**: Workflow'ların detaylı validasyonu
- **Better Error Reporting**: Açıklayıcı hata mesajları
- **Improved Logging**: Execution sürecinin takibi

### 4. API Endpoints İyileştirildi
- **Execute Endpoint**: Unified engine ile tam uyumlu
- **Stream Support**: Streaming execution desteği
- **Enhanced Error Handling**: Structured error responses

## 🔧 Test Edilmiş Node Türleri

### Provider Nodes
- **TestHello**: Basit greeting tool'u oluşturur
- **LLM Nodes**: OpenAI, Claude, Gemini desteği
- **Tool Nodes**: Google Search, Calculator, File tools
- **Prompt Nodes**: PromptTemplate, AgentPrompt

### Processor Nodes
- **TestProcessor**: Multiple input'ları birleştiren test node'u
- **LLMChain**: LLM + Prompt kombinasyonu
- **Agent Nodes**: ReAct agent desteği
- **Conditional Chains**: Koşullu yönlendirme

## 🚀 Hızlı Başlangıç

### 1. Server'ı Başlatın

```bash
cd flow/KAI-Fusion/backend
python app/main.py
```

Server http://localhost:8001 adresinde çalışacak.

### 2. Direct Engine Test'i

```bash
python test_workflow.py
```

Bu script doğrudan engine'i test eder ve şunları yapar:
- Single node workflow test'i
- Multi-node workflow test'i (TestHello -> TestProcessor)
- Validation ve execution test'i

### 3. API Endpoint Test'i

```bash
python api_test.py
```

Bu script HTTP API'yi test eder:
- Health endpoint
- Nodes listing
- Workflow validation
- Simple execution
- Complex workflow execution

## 📋 Workflow Formatı

### Basit Workflow

```json
{
  "nodes": [
    {
      "id": "hello_node",
      "type": "TestHello",
      "data": {
        "greeting": "Hi",
        "name": "User"
      },
      "position": {"x": 100, "y": 100}
    }
  ],
  "edges": []
}
```

### Bağlantılı Workflow

```json
{
  "nodes": [
    {
      "id": "hello_node",
      "type": "TestHello",
      "data": {
        "greeting": "Hello",
        "name": "World"
      },
      "position": {"x": 100, "y": 100}
    },
    {
      "id": "processor_node",
      "type": "TestProcessor",
      "data": {
        "input": "Processing data",
        "prefix": "RESULT:"
      },
      "position": {"x": 300, "y": 100}
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "hello_node",
      "target": "processor_node",
      "sourceHandle": "output",
      "targetHandle": "tool"
    }
  ]
}
```

## 🔌 API Kullanımı

### 1. Available Nodes Listesi

```bash
curl -X GET "http://localhost:8001/api/v1/nodes/"
```

### 2. Workflow Validation

```bash
curl -X POST "http://localhost:8001/api/v1/workflows/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "flow_data": {
      "nodes": [...],
      "edges": [...]
    }
  }'
```

### 3. Workflow Execution

```bash
curl -X POST "http://localhost:8001/api/v1/workflows/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "flow_data": {
      "nodes": [...],
      "edges": [...]
    },
    "input_text": "Test input",
    "stream": false
  }'
```

## 🐛 Debug İpuçları

### 1. Node Registry Kontrol

Engine başlarken available node'ları listeler:
```
🔧 Available node types:
  - TestHello
  - TestProcessor
  - OpenAIChat
  - ...
```

### 2. Connection Debug

GraphBuilder connection mapping'leri loglar:
```
[DEBUG] Input mapping: processor_node.tool <- hello_node.output
[DEBUG] Output mapping: hello_node.output -> processor_node.tool
```

### 3. Execution Debug

Node execution sırasında detaylı loglar:
```
[DEBUG] Executing node: hello_node (TestHello)
[DEBUG] Processor processor_node - User inputs: ['input', 'prefix']
[DEBUG] Processor processor_node - Connected inputs: ['tool']
```

## 🔄 Flow State Yönetimi

Engine LangGraph'ın FlowState sistemini kullanır:

- **current_input**: Mevcut input
- **last_output**: Son node'un çıktısı
- **executed_nodes**: Çalıştırılan node'ların listesi
- **variables**: User-defined değişkenler
- **node_outputs**: Her node'un benzersiz çıktısı

## 🎯 Node Geliştirme

### Provider Node Örneği

```python
class MyProviderNode(ProviderNode):
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "MyProvider",
            "description": "My custom provider",
            "category": "Custom",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(name="param", type="str", description="Parameter")
            ],
            "outputs": [
                NodeOutput(name="output", type="tool", description="My tool")
            ]
        }
    
    def execute(self, **kwargs) -> Runnable:
        # Implement your logic
        return MyTool()
```

### Processor Node Örneği

```python
class MyProcessorNode(ProcessorNode):
    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        # Get user inputs
        user_param = inputs.get("param")
        
        # Get connected objects
        llm = connected_nodes.get("llm")
        prompt = connected_nodes.get("prompt")
        
        # Combine them
        return LLMChain(llm=llm, prompt=prompt)
```

## 🎉 Başarı Kriterleri

Engine şu durumlarda başarılı çalışıyor:

1. ✅ **Node Discovery**: Tüm node'lar başarıyla keşfediliyor
2. ✅ **Validation**: Workflow'lar doğru validate ediliyor
3. ✅ **Connection Mapping**: Node'lar arası bağlantılar çalışıyor
4. ✅ **Execution**: Single ve multi-node workflow'lar çalışıyor
5. ✅ **Error Handling**: Hatalar graceful şekilde handle ediliyor
6. ✅ **API Integration**: HTTP endpoints düzgün çalışıyor

## 🔮 Gelecek Geliştirmeler

1. **Streaming Support**: Real-time execution monitoring
2. **Persistent Checkpointing**: Database-backed state persistence
3. **Conditional Routing**: Advanced flow control
4. **Parallel Execution**: Fan-out/fan-in patterns
5. **Metrics & Monitoring**: Performance tracking
6. **Custom Node UI**: Frontend integration

---

**Sistem artık tam fonksiyonel! Frontend'den gelen workflow tanımları başarıyla çalıştırılabilir.** 🎊 