# KAI-Fusion Testing Suite

> **Professional test framework for workflow validation**

## 🧪 Test Tools

### **test_runner.py**
Main workflow testing tool:
```bash
# List available nodes
python test_runner.py --list-nodes

# Test workflow
python test_runner.py --workflow templates/agent_chatbot_fixed.json --input "Hello!"

# Interactive mode
python test_runner.py --interactive
```

### **api_test.py**
API endpoint testing:
```bash
# Test all endpoints
python api_test.py --test all

# Test specific endpoint
python api_test.py --test chat --message "Test message"
```

### **test_analyzer.py**
Test result analysis:
```bash
# Analyze test results
python test_analyzer.py --analyze test_results/

# Performance analysis
python test_analyzer.py --performance
```

## 📁 Templates

Pre-built workflow examples:
- **agent_chatbot_fixed.json** - Working agent chatbot
- **simple_openai.json** - Basic OpenAI workflow
- **embeddings_test.json** - Document embedding pipeline
- **webhook_test.json** - Webhook trigger example

## 📊 Test Results

Results stored in `test_results/` with:
- Execution logs
- Performance metrics
- Error analysis
- Success/failure tracking

## 🎯 Usage Examples

```bash
# Quick health check
python api_test.py --test health

# Test agent workflow
python test_runner.py --workflow templates/agent_chatbot_fixed.json --input "selam"

# Analyze performance
python test_analyzer.py --performance
```