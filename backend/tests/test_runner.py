#!/usr/bin/env python3
"""
KAI-Fusion Workflow Test Runner - Terminal-based Workflow Testing
===============================================================

Bu araç terminal'den JSON ile workflow'ları oluşturup test etmemizi sağlar.
Canvas UI'ya gerek kalmadan direkt workflow'ları çalıştırabilir, debug edebiliriz.

Kullanım:
    python test_runner.py --workflow simple_openai.json
    python test_runner.py --create --template openai_chat
    python test_runner.py --list-nodes
    python test_runner.py --interactive

Özellikler:
- JSON workflow dosyalarını yükle ve çalıştır
- Node template'leri ile hızlı workflow oluştur
- Interactive mode ile adım adım workflow build et
- Test sonuçlarını analiz et ve kaydet
- Her node türü için hazır template'ler
"""

import argparse
import json
import os
import sys
import time
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

# Backend import için path ekle
sys.path.append(str(Path(__file__).parent.parent))

from app.core.engine_v2 import LangGraphWorkflowEngine
from app.core.state import FlowState
from app.nodes import *  # Import all nodes


class WorkflowTestRunner:
    """Workflow test runner sınıfı."""
    
    def __init__(self):
        self.engine = LangGraphWorkflowEngine()
        self.test_results_dir = Path(__file__).parent / "test_results"
        self.templates_dir = Path(__file__).parent / "templates"
        
        # Dizinleri oluştur
        self.test_results_dir.mkdir(exist_ok=True)
        self.templates_dir.mkdir(exist_ok=True)
        
        # Available nodes'ları manuel olarak tanımla
        self.available_nodes = {
            "Start": StartNode,
            "End": EndNode,
            "WebhookStart": WebhookStartNode,
            "TimerStart": TimerStartNode,
            "OpenAIGPT": OpenAINode,
            "OpenAIChat": OpenAIChatNode,
            "Agent": ReactAgentNode,
            "ToolAgent": ToolAgentNode,
            "OpenAIDocumentEmbedder": OpenAIEmbedderNode,
            "ConversationMemory": ConversationMemoryNode,
            "BufferMemory": BufferMemoryNode,
            "TavilyWebSearch": TavilySearchNode,
            "DocumentReranker": RerankerNode,
            "HTTPClient": HttpClientNode,
            "WebScraper": WebScraperNode,
            "DocumentChunkSplitter": ChunkSplitterNode,
            "PostgreSQLVectorStore": PGVectorStoreNode,
            "RAGQuestionAnswering": RetrievalQANode,
        }
        
        print(f"🚀 KAI-Fusion Workflow Test Runner initialized")
        print(f"📁 Test results: {self.test_results_dir}")
        print(f"📄 Templates: {self.templates_dir}")
        print(f"🧩 Available nodes: {len(self.available_nodes)}")

    def list_available_nodes(self):
        """Mevcut node'ları listele."""
        print("\n🧩 Available Nodes:")
        print("=" * 50)
        
        # Kategorilere göre grupla
        categories = {}
        for node_type, node_class in self.available_nodes.items():
            try:
                instance = node_class()
                category = instance._metadata.get("category", "Unknown")
                
                if category not in categories:
                    categories[category] = []
                
                categories[category].append({
                    "type": node_type,
                    "name": instance._metadata.get("display_name", node_type),
                    "description": instance._metadata.get("description", "No description")[:80] + "..."
                })
            except Exception as e:
                print(f"⚠️  Error loading {node_type}: {e}")
        
        # Kategorileri yazdır
        for category, nodes in sorted(categories.items()):
            print(f"\n📂 {category}:")
            for node in nodes:
                print(f"  • {node['name']} ({node['type']})")
                print(f"    {node['description']}")

    def create_workflow_template(self, template_name: str) -> Dict[str, Any]:
        """Hazır workflow template'i oluştur."""
        templates = {
            "simple_openai": {
                "name": "Simple OpenAI Chat",
                "description": "Basic OpenAI chat workflow",
                "nodes": [
                    {
                        "id": "start_1",
                        "type": "StartNode",
                        "position": {"x": 100, "y": 100},
                        "data": {
                            "initial_input": "Hello, how are you?"
                        }
                    },
                    {
                        "id": "openai_1",
                        "type": "OpenAINode",
                        "position": {"x": 400, "y": 100},
                        "data": {
                            "model_name": "gpt-4o",
                            "temperature": 0.7,
                            "max_tokens": 500,
                            "api_key": "your-openai-api-key-here"
                        }
                    },
                    {
                        "id": "end_1",
                        "type": "EndNode", 
                        "position": {"x": 700, "y": 100},
                        "data": {}
                    }
                ],
                "edges": [
                    {"id": "e1", "source": "start_1", "target": "openai_1"},
                    {"id": "e2", "source": "openai_1", "target": "end_1"}
                ]
            },
            
            "rag_pipeline": {
                "name": "RAG Pipeline",
                "description": "Complete RAG workflow with embeddings",
                "nodes": [
                    {
                        "id": "start_1",
                        "type": "StartNode",
                        "position": {"x": 50, "y": 100},
                        "data": {
                            "initial_input": "What is artificial intelligence?"
                        }
                    },
                    {
                        "id": "webscraper_1",
                        "type": "WebScraperNode",
                        "position": {"x": 200, "y": 100},
                        "data": {
                            "url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
                            "max_chars": 5000
                        }
                    },
                    {
                        "id": "splitter_1",
                        "type": "ChunkSplitterNode",
                        "position": {"x": 350, "y": 100},
                        "data": {
                            "chunk_size": 1000,
                            "chunk_overlap": 200
                        }
                    },
                    {
                        "id": "embedder_1",
                        "type": "OpenAIEmbedderNode",
                        "position": {"x": 500, "y": 100},
                        "data": {
                            "model_name": "text-embedding-3-small",
                            "api_key": "your-openai-api-key-here"
                        }
                    },
                    {
                        "id": "vectorstore_1",
                        "type": "PGVectorStoreNode",
                        "position": {"x": 650, "y": 100},
                        "data": {
                            "connection_string": "postgresql://user:pass@localhost/vectordb",
                            "collection_name": "test_docs"
                        }
                    },
                    {
                        "id": "retrieval_1",
                        "type": "RetrievalQANode",
                        "position": {"x": 800, "y": 100},
                        "data": {
                            "k": 3
                        }
                    },
                    {
                        "id": "openai_1",
                        "type": "OpenAINode",
                        "position": {"x": 950, "y": 100},
                        "data": {
                            "model_name": "gpt-4o",
                            "temperature": 0.1,
                            "max_tokens": 1000,
                            "api_key": "your-openai-api-key-here"
                        }
                    },
                    {
                        "id": "end_1",
                        "type": "EndNode",
                        "position": {"x": 1100, "y": 100},
                        "data": {}
                    }
                ],
                "edges": [
                    {"id": "e1", "source": "start_1", "target": "webscraper_1"},
                    {"id": "e2", "source": "webscraper_1", "target": "splitter_1"},
                    {"id": "e3", "source": "splitter_1", "target": "embedder_1"},
                    {"id": "e4", "source": "embedder_1", "target": "vectorstore_1"},
                    {"id": "e5", "source": "vectorstore_1", "target": "retrieval_1"},
                    {"id": "e6", "source": "retrieval_1", "target": "openai_1"},
                    {"id": "e7", "source": "openai_1", "target": "end_1"}
                ]
            },
            
            "webhook_trigger": {
                "name": "Webhook Triggered Workflow",
                "description": "Workflow triggered by webhook",
                "nodes": [
                    {
                        "id": "webhook_start_1",
                        "type": "WebhookStartNode",
                        "position": {"x": 100, "y": 100},
                        "data": {
                            "require_auth": True,
                            "allowed_origins": "*"
                        }
                    },
                    {
                        "id": "openai_1",
                        "type": "OpenAINode",
                        "position": {"x": 400, "y": 100},
                        "data": {
                            "model_name": "gpt-4o",
                            "temperature": 0.7,
                            "max_tokens": 500,
                            "api_key": "your-openai-api-key-here"
                        }
                    },
                    {
                        "id": "http_client_1",
                        "type": "HttpClientNode",
                        "position": {"x": 700, "y": 100},
                        "data": {
                            "method": "POST",
                            "url": "https://webhook.site/your-endpoint",
                            "content_type": "json",
                            "body": '{"result": "{{ result }}", "status": "completed"}'
                        }
                    }
                ],
                "edges": [
                    {"id": "e1", "source": "webhook_start_1", "target": "openai_1"},
                    {"id": "e2", "source": "openai_1", "target": "http_client_1"}
                ]
            }
        }
        
        if template_name not in templates:
            available = ", ".join(templates.keys())
            raise ValueError(f"Template '{template_name}' not found. Available: {available}")
        
        return templates[template_name]

    def save_template(self, template_name: str, workflow: Dict[str, Any]):
        """Template'i dosyaya kaydet."""
        template_file = self.templates_dir / f"{template_name}.json"
        with open(template_file, 'w', encoding='utf-8') as f:
            json.dump(workflow, f, indent=2, ensure_ascii=False)
        print(f"✅ Template saved: {template_file}")

    def load_workflow(self, workflow_file: str) -> Dict[str, Any]:
        """JSON workflow dosyasını yükle."""
        if not os.path.exists(workflow_file):
            raise FileNotFoundError(f"Workflow file not found: {workflow_file}")
        
        with open(workflow_file, 'r', encoding='utf-8') as f:
            workflow = json.load(f)
        
        print(f"📄 Loaded workflow: {workflow.get('name', 'Unnamed')}")
        print(f"🧩 Nodes: {len(workflow.get('nodes', []))}")
        print(f"🔗 Edges: {len(workflow.get('edges', []))}")
        
        return workflow

    async def execute_workflow(self, workflow: Dict[str, Any], input_text: str = None) -> Dict[str, Any]:
        """Workflow'ı çalıştır."""
        print(f"\n🚀 Executing workflow: {workflow.get('name', 'Unnamed')}")
        print("=" * 50)
        
        start_time = time.time()
        
        try:
            # Input'u belirle
            if input_text is None:
                # İlk node'dan initial input'u al
                start_node = next((n for n in workflow['nodes'] if 'start' in n['type'].lower()), None)
                if start_node:
                    input_text = start_node.get('data', {}).get('initial_input', 'Hello')
                else:
                    input_text = 'Test input'
            
            print(f"📝 Input: {input_text}")
            
            # Workflow'ı validate et
            validation_result = self.engine.validate(workflow)
            if not validation_result.get("valid", True):
                errors = validation_result.get("errors", ["Validation failed"])
                raise ValueError(f"Workflow validation failed: {', '.join(errors)}")
            
            print("✅ Workflow validation passed")
            
            # Workflow'ı build et
            self.engine.build(flow_data=workflow)
            print("✅ Workflow graph built")
            
            # Execute et
            result_stream = await self.engine.execute(inputs={"input": input_text})
            
            # Stream'den sonucu al
            if hasattr(result_stream, '__aiter__'):
                # Async generator ise son sonucu al
                final_result = None
                async for chunk in result_stream:
                    if isinstance(chunk, dict) and 'result' in chunk:
                        final_result = chunk['result']
                    elif isinstance(chunk, dict) and 'output' in chunk:
                        final_result = chunk['output']
                result = final_result or result_stream
            else:
                result = result_stream
            
            execution_time = time.time() - start_time
            
            print(f"✅ Execution completed in {execution_time:.2f}s")
            print(f"📊 Result: {result}")
            
            # Test sonucunu kaydet
            test_result = {
                "workflow": workflow,
                "input": input_text,
                "result": result,
                "execution_time": execution_time,
                "timestamp": datetime.now().isoformat(),
                "success": True
            }
            
            return test_result
            
        except Exception as e:
            execution_time = time.time() - start_time
            print(f"❌ Execution failed in {execution_time:.2f}s")
            print(f"💥 Error: {str(e)}")
            
            test_result = {
                "workflow": workflow,
                "input": input_text,
                "error": str(e),
                "execution_time": execution_time,
                "timestamp": datetime.now().isoformat(),
                "success": False
            }
            
            return test_result

    def save_test_result(self, test_result: Dict[str, Any], filename: str = None):
        """Test sonucunu kaydet."""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            workflow_name = test_result.get('workflow', {}).get('name', 'unnamed')
            filename = f"{workflow_name}_{timestamp}.json"
        
        result_file = self.test_results_dir / filename
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(test_result, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"💾 Test result saved: {result_file}")

    def interactive_mode(self):
        """Interactive mode ile workflow build et."""
        print("\n🔧 Interactive Workflow Builder")
        print("=" * 40)
        
        workflow = {
            "name": input("Workflow name: "),
            "description": input("Description: "),
            "nodes": [],
            "edges": []
        }
        
        # Node'ları ekle
        print("\n🧩 Adding nodes (type 'done' to finish):")
        node_counter = 1
        
        while True:
            node_type = input(f"\nNode {node_counter} type (or 'done'): ")
            if node_type.lower() == 'done':
                break
            
            if node_type not in self.available_nodes:
                print(f"❌ Unknown node type. Available: {list(self.available_nodes.keys())[:5]}...")
                continue
            
            node_id = f"{node_type.lower()}_{node_counter}"
            node = {
                "id": node_id,
                "type": node_type,
                "position": {"x": node_counter * 200, "y": 100},
                "data": {}
            }
            
            # Node data'sını topla
            print(f"Configure {node_type} (press Enter to skip):")
            # Bu kısım node türüne göre dinamik olabilir
            
            workflow["nodes"].append(node)
            node_counter += 1
        
        # Edge'leri ekle
        print("\n🔗 Adding connections:")
        for i in range(len(workflow["nodes"]) - 1):
            source = workflow["nodes"][i]["id"]
            target = workflow["nodes"][i + 1]["id"]
            
            workflow["edges"].append({
                "id": f"e{i + 1}",
                "source": source,
                "target": target
            })
        
        print(f"\n✅ Workflow created with {len(workflow['nodes'])} nodes")
        return workflow


async def main():
    """Ana fonksiyon."""
    parser = argparse.ArgumentParser(description="KAI-Fusion Workflow Test Runner")
    parser.add_argument("--workflow", "-w", help="Workflow JSON file to execute")
    parser.add_argument("--input", "-i", help="Input text for workflow")
    parser.add_argument("--create", "-c", action="store_true", help="Create new workflow from template")
    parser.add_argument("--template", "-t", help="Template name for creation")
    parser.add_argument("--list-nodes", "-l", action="store_true", help="List available nodes")
    parser.add_argument("--interactive", action="store_true", help="Interactive workflow builder")
    parser.add_argument("--save-result", "-s", help="Save test result with filename")
    
    args = parser.parse_args()
    
    # Test runner'ı başlat
    runner = WorkflowTestRunner()
    
    if args.list_nodes:
        runner.list_available_nodes()
        return
    
    if args.interactive:
        workflow = runner.interactive_mode()
        if input("\nExecute workflow now? (y/N): ").lower() == 'y':
            result = await runner.execute_workflow(workflow, args.input)
            if args.save_result:
                runner.save_test_result(result, args.save_result)
        
        if input("Save as template? (y/N): ").lower() == 'y':
            template_name = input("Template name: ")
            runner.save_template(template_name, workflow)
        return
    
    if args.create and args.template:
        workflow = runner.create_workflow_template(args.template)
        runner.save_template(args.template, workflow)
        print(f"✅ Template '{args.template}' created and saved")
        return
    
    if args.workflow:
        workflow = runner.load_workflow(args.workflow)
        result = await runner.execute_workflow(workflow, args.input)
        
        if args.save_result:
            runner.save_test_result(result, args.save_result)
        else:
            runner.save_test_result(result)
        
        return
    
    # Hiç argüman verilmemişse help göster
    parser.print_help()


if __name__ == "__main__":
    asyncio.run(main())