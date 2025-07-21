

from ..base import ProcessorNode, NodeInput, NodeType, NodeOutput
from typing import Dict, Any, Sequence
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_core.language_models import BaseLanguageModel
from langchain_core.tools import BaseTool
from langchain_core.prompts import PromptTemplate
from langchain_core.memory import BaseMemory
from langchain.agents import AgentExecutor, create_react_agent

class ReactAgentNode(ProcessorNode):
    """
    A sophisticated ReAct agent designed for robust orchestration of LLMs, tools, and memory.
    This agent uses a refined prompting strategy to improve its reasoning and tool utilization.
    """
    
    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "ReactAgent",
            "display_name": "ReAct Agent",
            "description": "Orchestrates LLM, tools, and memory for complex, multi-step tasks.",
            "category": "Agents",
            "node_type": NodeType.PROCESSOR,
            "inputs": [
                NodeInput(name="input", type="string", required=True, description="The user's input to the agent."),
                NodeInput(name="llm", type="BaseLanguageModel", required=True, description="The language model that the agent will use."),
                NodeInput(name="tools", type="Sequence[BaseTool]", required=False, description="The tools that the agent can use."),
                NodeInput(name="memory", type="BaseMemory", required=False, description="The memory that the agent can use."),
                NodeInput(name="max_iterations", type="int", default=15, description="The maximum number of iterations the agent can perform."),
                NodeInput(name="system_prompt", type="str", default="You are a helpful AI assistant.", description="The system prompt for the agent."),
                NodeInput(name="prompt_instructions", type="str", required=False, multiline=True, 
                         description="Custom prompt instructions for the agent. If not provided, uses smart orchestration defaults.",
                         default=""),
            ],
            "outputs": [NodeOutput(name="output", type="str", description="The final output from the agent.")]
        }

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """
        Sets up and returns a RunnableLambda that executes the agent.
        """
        def agent_executor_lambda(runtime_inputs: dict) -> dict:
            llm = connected_nodes.get("llm")
            tools = connected_nodes.get("tools")
            memory = connected_nodes.get("memory")

            if not isinstance(llm, BaseLanguageModel):
                raise ValueError("A valid LLM connection is required.")

            tools_list = self._prepare_tools(tools)

            agent_prompt = self._create_prompt(tools_list)

            agent = create_react_agent(llm, tools_list, agent_prompt)

            executor = AgentExecutor(
                agent=agent,
                tools=tools_list,
                memory=memory,
                verbose=True, # Essential for real-time debugging
                handle_parsing_errors=True,
                max_iterations=self.user_data.get("max_iterations", 15)
            )

            # Prepare the input with tools context for the prompt
            print(f"[DEBUG ReactAgent] inputs: {inputs}")
            print(f"[DEBUG ReactAgent] runtime_inputs: {runtime_inputs}")
            print(f"[DEBUG ReactAgent] tools_list: {[tool.name for tool in tools_list]}")
            
            # Handle runtime_inputs being either dict or string
            if isinstance(runtime_inputs, str):
                user_input = runtime_inputs
            elif isinstance(runtime_inputs, dict):
                user_input = runtime_inputs.get("input", inputs.get("input", ""))
            else:
                user_input = inputs.get("input", "")
            
            # Prepare memory context for the agent to see
            memory_context = ""
            if memory and hasattr(memory, 'chat_memory') and hasattr(memory.chat_memory, 'messages'):
                messages = memory.chat_memory.messages
                if messages:
                    recent_messages = messages[-6:]  # Son 6 mesaj
                    memory_context = "\n".join([f"- {msg.content[:100]}" for msg in recent_messages])
                else:
                    memory_context = "Henüz geçmiş konuşma yok"
            else:
                memory_context = "Hafıza mevcut değil"
                
            # Prepare tools description for the agent to understand available capabilities
            tools_description = ""
            if tools_list:
                tools_description = "\n".join([f"- {tool.name}: {tool.description}" for tool in tools_list])
            else:
                tools_description = "Hiç araç bağlanmamış"

            final_input = {
                "input": user_input,
                "tools": tools_list,  # LangChain create_react_agent için gerekli
                "tool_names": [tool.name for tool in tools_list],
                "memory": memory_context,
                "tools_info": tools_description
            }
            
            print(f"[DEBUG ReactAgent] final_input keys: {list(final_input.keys())}")
            print(f"[DEBUG ReactAgent] final_input['input']: {final_input['input']}")
            
            return executor.invoke(final_input)

        return RunnableLambda(agent_executor_lambda)

    def _prepare_tools(self, tools_input: Any) -> list[BaseTool]:
        """Ensures the tools are in the correct list format."""
        if not tools_input:
            return []
        if isinstance(tools_input, list):
            return tools_input
        if isinstance(tools_input, BaseTool):
            return [tools_input]
        return []

    def _create_prompt(self, tools: list[BaseTool]) -> PromptTemplate:
        """
        Creates a unified ReAct-compatible prompt that works with LangChain's create_react_agent.
        Uses custom prompt_instructions if provided, otherwise falls back to smart orchestration.
        """
        custom_instructions = self.user_data.get("prompt_instructions", "").strip()
        
        # Base system context
        base_system_context = """
Sen KAI-Fusion workflow automation platformunda çalışan gelişmiş bir ReAct (Reasoning + Acting) agent'sın.
Platform bilgisi: KAI-Fusion v2.0.0
Güncel tarih: 2025-07-21
Session ID: Dinamik workflow oturumu aktif

KAI-Fusion, kurumsal düzeyde bir low-code/no-code workflow automation platformudur. Kullanıcılar güçlü LLM'ler, özelleşmiş araçlar ve akıllı hafıza sistemlerini birbirine bağlayarak karmaşık, çok katmanlı iş süreçleri oluşturabilirler.

**MULTİLİNGUAL COMMUNICATION MASTERY**:
Sen evrensel bir dil uzmanısın. Kullanıcı hangi dilde yazarsa o dilde mükemmel cevap ver:
- İngilizce → İngilizce (native level fluency)
- Türkçe → Türkçe (ana dil seviyesinde akıcılık)
- Diğer diller → O dilin doğal yapısına uygun
- Karma dil kullanımı → Kullanıcının tercih ettiği dil karışımına uygun

**INTELLIGENT TOOL USAGE**:
- Sadece gerçekten gerektiğinde araç kullan
- Basit sorular, tanışma için araç kullanma
- Araçlardan aldığın veriyi kendi contextinle harmanlayarak sun
- Hiçbir zaman araç isimlerini söyleme

**SEMANTIC MEMORY USAGE**:
- Hafızayı pattern recognition için kullan
- Kullanıcının tercihlerini öğren ve uygula
- Context continuity sağla
"""
        
        if custom_instructions:
            # Use custom prompt instructions with role priority mandate
            prompt_content = f"""
{custom_instructions}

**ROLE PRIORITY MANDATE**: 
Yukarıdaki custom instructions senin BİRİNCİL ROLÜNDÜr. System prompt sadece çerçeve sağlar, asıl kimliğin ve davranış kalıbın custom instructions'tan gelir. Bu role tamamen odaklan ve bütün actions'larını bu role göre şekillendir.

{base_system_context}

**ARAÇ KULLANIM ZORUNLULUKLARI**:
Güncel veya niş bilgilerden faydalanabilecek *herhangi* bir sorgu için *mutlaka* mevcut araçları kullanmalısın, kullanıcı açıkça araç kullanmamanı söylemedikçe. Örnek konular (bunlarla sınırlı değil): politika, güncel olaylar, hava durumu, spor, bilimsel gelişmeler, kültürel trendler, son medya/eğlence gelişmeleri, genel haberler, uzmanlık konular, derin araştırma soruları ve daha birçok soru türü.

**REACT EXECUTION FRAMEWORK**:
```
Question: [Kullanıcının tam isteği/sorgusu]
Thought: [Stratejik analiz - sadece ne yapılacağı değil, neden yapılacağı, alternatiflerin değerlendirmesi, optimal yaklaşımın belirlenmesi]
Action: [Seçilen araç - mantıklı gerekçesiyle]
Action Input: [Optimize edilmiş, maksimum verim için tasarlanmış girdi]
Observation: [Araç çıktısını derinlemesine analiz - sadece okuma değil, değerlendirme ve sonraki adımlar için hazırlık]
... (Karmaşık görevler için döngü tekrarı - her döngüde öğrenme ve optimizasyon)
Thought: [Final synthesis - tüm bilgilerin harmanlayıp optimal sonuca ulaşma]
Final Answer: [Mükemmel kalite, kapsamlı, yüksek değer katan, kullanıcı odaklı nihai cevap]
```

**MEVCUT SISTEM ARAÇLARI**:
{{{{tools}}}}

**ARAÇ KAPASİTELERİ VE STRATEJİK KULLANIM**:
{{{{tools_info}}}}

**SEMANTIC MEMORY INTELLIGENCE SYSTEM**:
{{{{memory}}}}

Çok önemli: Kullanıcının timezone bilgisi dinamik olarak ayarlanır. Güncel tarih 21 Temmuz 2025'tir. Bu tarihten önceki herhangi bir tarih geçmiştedir, sonrası ise gelecektir. Modern şirketler/kişiler/olaylarla ilgili olarak kullanıcı 'en son', 'en güncel', 'bugünkü' vb. dediğinde bilgilerinin güncel olmayabileceğini varsayma; gerçek 'en son'un ne olduğunu dikkatle *önce* araçlarla confirm et.

<user_input>
{{{{input}}}}
</user_input>

Thought:{{{{agent_scratchpad}}}}
"""
        else:
            # Use default smart orchestration prompt
            prompt_content = f"""
{base_system_context}

<decision_making>
Hangi araçları ne zaman kullanacağın konusunda akıllı kararlar ver:
- Güncel bilgi gerekiyorsa: Search araçlarını kullan
- Hesaplama gerekiyorsa: Calculator varsa kullan  
- Dosya işlemleri gerekiyorsa: File araçlarını kullan
- Basit sohbet/tanışma: Araç kullanma, direkt cevapla
- Geçmiş konuşma referansı: Hafızayı kontrol et
</decision_making>

MEVCUT ARAÇLAR:
{{{{tools}}}}

ARAÇ DETAYLARİ:
{{{{tools_info}}}}

HAFIZA DURUMU:
{{{{memory}}}}

AKILLI KARAR VERME:
1. Basit sohbet, tanışma, selam, teşekkür → ARAÇ KULLANMA, direkt cevapla
2. Güncel haberler, transfer haberleri, spor haberleri → Search aracını kullan
3. Hesaplama, matematik → Calculator varsa kullan
4. Dosya işlemleri → File tools varsa kullan
5. Geçmiş konuşmalar → Memory'yi kontrol et

KULLANIM FORMATI:

Question: kullanıcının sorusu
Thought: ne yapmalı düşün - araç gerekli mi yoksa direkt cevap verebilir misin?
Action: eğer araç gerekiyorsa [{{{{tool_names}}}}] içinden birini seç
Action Input: araç için gerekli girdi (basit string olarak)
Observation: aracın sonucu
... (gerekirse tekrarla)
Thought: artık cevabım hazır
Final Answer: kullanıcıya vereceğin nihai cevap

ÖNEMLİ: Eğer araç kullanmana gerek yoksa, direkt Final Answer'a geç:
Thought: Bu basit bir sohbet, araç kullanmaya gerek yok
Final Answer: [cevabın]

ÖRNEKLER:

Basit sohbet örneği:
Question: Merhaba, nasılsın?
Thought: Bu basit bir sohbet, araç kullanmaya gerek yok
Final Answer: Merhaba! Ben iyiyim, teşekkür ederim. Sen nasılsın?

Tanışma örneği:
Question: Benim adım Ali
Thought: Bu basit tanışma, araç kullanmaya gerek yok
Final Answer: Memnun oldum Ali! Ben senin AI asistanınım.

Arama gereken örnek:
Question: Galatasaray'ın son transfer haberlerini araştır
Thought: Güncel transfer haberleri için search aracını kullanmalıyım
Action: tavily_search
Action Input: Galatasaray transfer haberleri 2025

ARAÇ KULLANIM DETAYİ:
- Search araçları için: Action Input: arama sorgusu (basit metin)
- Calculator için: Action Input: matematiksel ifade
- Diğer araçlar için: uygun format

Başla!

Question: {{{{input}}}}
Thought:{{{{agent_scratchpad}}}}
"""

        return PromptTemplate.from_template(prompt_content)

# Alias for frontend compatibility
ToolAgentNode = ReactAgentNode
