# KAI-Fusion Workflow Testing Makefile
# ====================================

.PHONY: help test demo clean setup health

# Default target
help:
	@echo "KAI-Fusion Workflow Testing Commands"
	@echo "===================================="
	@echo ""
	@echo "Setup & Health:"
	@echo "  make setup     - Install dependencies and setup environment"
	@echo "  make health    - Check backend health"
	@echo ""
	@echo "Testing:"
	@echo "  make test      - Run comprehensive tests"
	@echo "  make demo      - Run demo chatbot workflow"
	@echo "  make api-test  - Test API endpoints"
	@echo ""
	@echo "Workflows:"
	@echo "  make list      - List available nodes"
	@echo "  make template  - Create workflow template"
	@echo "  make chat      - Test chat functionality"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean     - Clean test results"
	@echo "  make docs      - Open API documentation"

# Setup and health checks
setup:
	@echo "🔧 Setting up KAI-Fusion workflow testing..."
	@cd .. && pip install -r requirements.txt
	@echo "✅ Setup complete"

health:
	@echo "🏥 Checking backend health..."
	@curl -s http://localhost:8000/health | python -m json.tool || echo "❌ Backend not running"

# Main testing commands
test:
	@echo "🧪 Running comprehensive tests..."
	@python test_runner.py --list-nodes
	@python api_test.py --test all

demo:
	@echo "🤖 Running demo chatbot workflow..."
	@python test_runner.py --workflow agent_chatbot_fixed.json --input "Hello! Please introduce yourself."

api-test:
	@echo "🔗 Testing API endpoints..."
	@python api_test.py --test all

# Workflow operations
list:
	@echo "📋 Available nodes:"
	@python test_runner.py --list-nodes

template:
	@echo "📄 Creating simple OpenAI template..."
	@python test_runner.py --create --template simple_openai

chat:
	@echo "💬 Testing chat functionality..."
	@python api_test.py --test chat --message "Test message"

# Maintenance
clean:
	@echo "🧹 Cleaning test results..."
	@rm -rf test_results/*
	@rm -f api_test_results.json
	@mkdir -p test_results
	@echo "✅ Cleaned"

docs:
	@echo "📖 Opening API documentation..."
	@open http://localhost:8000/docs || echo "Visit: http://localhost:8000/docs"

# Quick workflow test
quick-test:
	@echo "⚡ Quick workflow test..."
	@python test_runner.py --workflow agent_chatbot_fixed.json --input "Test"