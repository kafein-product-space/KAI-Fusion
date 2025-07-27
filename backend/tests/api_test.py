#!/usr/bin/env python3
"""
KAI-Fusion API Test Suite
========================

Comprehensive toolkit for testing backend APIs.
"""

import argparse
import requests
import json
import time
from typing import Dict, Any

class KAIFusionAPITester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        
    def log(self, message: str, level: str = "INFO"):
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def test_health(self) -> Dict[str, Any]:
        self.log("Testing backend health...")
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Backend health check passed")
                self.log(f"   Version: {data.get('version', 'Unknown')}")
                self.log(f"   Nodes: {data.get('components', {}).get('node_registry', {}).get('nodes_registered', 0)}")
                return {"status": "success", "data": data}
            else:
                self.log(f"❌ Health check failed: {response.status_code}")
                return {"status": "error", "error": f"HTTP {response.status_code}"}
        except Exception as e:
            self.log(f"❌ Health check error: {e}")
            return {"status": "error", "error": str(e)}
    
    def test_chat(self, message: str = "Hello!") -> Dict[str, Any]:
        self.log(f"Testing chat API with message: '{message}'")
        try:
            payload = {"content": message}
            response = self.session.post(f"{self.base_url}/api/v1/chat/", json=payload, timeout=30)
            if response.status_code == 201:
                messages = response.json()
                self.log(f"✅ Chat API success - {len(messages)} messages")
                for i, msg in enumerate(messages):
                    role = msg.get('role', 'unknown')
                    content = msg.get('content', '')[:100]
                    self.log(f"   {i+1}. {role}: {content}")
                return {"status": "success", "data": messages}
            else:
                self.log(f"❌ Chat API failed: {response.status_code}")
                return {"status": "error", "error": f"HTTP {response.status_code}"}
        except Exception as e:
            self.log(f"❌ Chat API error: {e}")
            return {"status": "error", "error": str(e)}

    def test_nodes(self) -> Dict[str, Any]:
        self.log("Testing nodes API...")
        try:
            response = self.session.get(f"{self.base_url}/api/v1/nodes/", timeout=10)
            if response.status_code == 200:
                nodes = response.json()
                self.log(f"✅ Found {len(nodes)} nodes")
                categories = {}
                for node in nodes:
                    cat = node.get('category', 'Unknown')
                    if cat not in categories:
                        categories[cat] = []
                    categories[cat].append(node['name'])
                
                for category, node_names in categories.items():
                    self.log(f"   📂 {category}: {', '.join(node_names[:3])}{'...' if len(node_names) > 3 else ''}")
                
                return {"status": "success", "data": nodes}
            else:
                self.log(f"❌ Nodes API failed: {response.status_code}")
                return {"status": "error", "error": f"HTTP {response.status_code}"}
        except Exception as e:
            self.log(f"❌ Nodes API error: {e}")
            return {"status": "error", "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="KAI-Fusion API Test Suite")
    parser.add_argument("--test", "-t", choices=["health", "chat", "nodes", "all"], default="all")
    parser.add_argument("--message", "-m", default="Hello! Test message.")
    parser.add_argument("--url", "-u", default="http://localhost:8000")
    
    args = parser.parse_args()
    tester = KAIFusionAPITester(args.url)
    
    print("🧪 KAI-Fusion API Test Suite")
    print("=" * 40)
    
    if args.test == "all":
        tester.test_health()
        print()
        tester.test_nodes()
        print()
        tester.test_chat(args.message)
    elif args.test == "health":
        tester.test_health()
    elif args.test == "nodes":
        tester.test_nodes()
    elif args.test == "chat":
        tester.test_chat(args.message)

if __name__ == "__main__":
    main()