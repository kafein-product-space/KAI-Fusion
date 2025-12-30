
"""
KAI-Fusion ReactAgent Node - Modern LangGraph-Based AI Agent Orchestration
=========================================================================

This module implements a sophisticated ReactAgent node using the latest LangGraph API,
serving as the orchestration brain of the KAI-Fusion platform. Built on LangGraph's
modern create_react_agent framework, it provides enterprise-grade agent capabilities
with advanced tool integration, state-based memory management, and multilingual support.

ARCHITECTURAL OVERVIEW:
======================

The ReactAgent operates on the modern LangGraph state-based paradigm:
1. **State Management**: Uses CompiledStateGraph for robust execution flow
2. **Message-Based Communication**: Handles conversations as message sequences
3. **Tool Orchestration**: Automatic tool calling and result processing
4. **Memory Integration**: Checkpointer-based persistent memory

┌─────────────────────────────────────────────────────────────┐
│              Modern ReactAgent Architecture                 │
├─────────────────────────────────────────────────────────────┤
│  Messages  →  [CompiledStateGraph]  →  [Tool Execution]     │
│      ↓               ↑                       ↓              │
│  [Checkpointer]  ←  [State Updates]  ←  [Agent Reasoning]   │
│      ↓               ↑                       ↓              │
│  [Persistence]  →  [Response Generation]  ←  [Results]      │
└─────────────────────────────────────────────────────────────┘

KEY INNOVATIONS:
===============

1. **Multilingual Intelligence**: Native Turkish/English support with cultural context
2. **Efficiency Optimization**: Smart tool usage to minimize unnecessary calls
3. **Memory Integration**: Sophisticated conversation history management
4. **Retriever Tool Support**: Seamless RAG integration with document search
5. **Error Resilience**: Robust error handling with graceful degradation
6. **Performance Monitoring**: Built-in execution tracking and optimization

TOOL ECOSYSTEM:
==============

The agent supports multiple tool types:
- **Search Tools**: Web search, document retrieval, knowledge base queries
- **API Tools**: External service integration, data fetching
- **Processing Tools**: Text analysis, data transformation
- **Memory Tools**: Conversation history, context management
- **Custom Tools**: User-defined business logic tools

MEMORY ARCHITECTURE:
===================

Advanced memory management with multiple layers:
- **Short-term Memory**: Current conversation context
- **Long-term Memory**: Persistent user preferences and history  
- **Working Memory**: Intermediate reasoning steps and tool results
- **Semantic Memory**: Vector-based knowledge storage and retrieval

PERFORMANCE OPTIMIZATIONS:
=========================

1. **Smart Tool Selection**: Context-aware tool prioritization
2. **Caching Strategy**: Intelligent result caching to avoid redundant calls
3. **Parallel Execution**: Where possible, execute tools concurrently
4. **Resource Management**: Memory and computation resource optimization
5. **Timeout Handling**: Graceful handling of slow or unresponsive tools

MULTILINGUAL CAPABILITIES:
=========================

- **Language Detection**: Automatic detection of user language
- **Contextual Responses**: Culturally appropriate responses in Turkish/English
- **Code-Switching**: Natural handling of mixed-language inputs
- **Localized Tool Usage**: Language-specific tool selection and parameterization

ERROR HANDLING STRATEGY:
=======================

Comprehensive error handling with multiple fallback mechanisms:
1. **Tool Failure Recovery**: Alternative tool selection on failure
2. **Memory Corruption Handling**: State recovery and cleanup
3. **Timeout Management**: Graceful handling of long-running operations
4. **Partial Result Processing**: Useful output even from incomplete operations

INTEGRATION PATTERNS:
====================

Seamless integration with KAI-Fusion ecosystem:
- **LangGraph Compatibility**: Full state management integration
- **LangSmith Tracing**: Comprehensive observability and debugging
- **Vector Store Integration**: Advanced RAG capabilities
- **Custom Node Connectivity**: Easy integration with custom business logic

AUTHORS: KAI-Fusion Development Team
VERSION: 2.1.0
LAST_UPDATED: 2025-07-26
LICENSE: Proprietary
"""

from ..base import NodePosition, ProcessorNode, NodeInput, NodePropertyType, NodeType, NodeOutput, NodeProperty
from app.nodes.memory import BufferMemoryNode
from app.core.tool import AutoToolManager
from typing import Dict, Any, Sequence, List, Optional
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_core.language_models import BaseLanguageModel
from langchain_core.tools import BaseTool
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.memory import BaseMemory
from langchain_core.retrievers import BaseRetriever
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.state import CompiledStateGraph
# Manual retriever tool creation since langchain-community import is not working
from langchain_core.tools import Tool
import re
import sys
import os
import locale
from langchain.globals import get_debug
from langchain_core.callbacks import BaseCallbackHandler

# ================================================================================
# DEBUG CALLBACK HANDLER (Console step-by-step traces for LLM and Tool calls)
# ================================================================================
class AgentDebugCallback(BaseCallbackHandler):
    """
    Debug callback handler for LangChain agent execution tracing.
    
    This handler provides detailed console output for debugging purposes,
    capturing events from chains, LLMs, and tools during agent execution.
    Useful for development and troubleshooting agent behavior.
    """
    
    @staticmethod
    def _safe_name(serialized) -> str:
        """
        Safely extract component name from serialized data.
        
        Args:
            serialized: The serialized component data, can be dict, object, or None.
            
        Returns:
            str: The extracted name or 'unknown' if extraction fails.
        """
        try:
            if serialized is None:
                return "unknown"
            if isinstance(serialized, dict):
                # LangChain often passes {"id": [...]} or {"name": "..."} etc.
                return serialized.get("name") or serialized.get("id") or "unknown"
            # Fallback to type name
            return type(serialized).__name__
        except Exception:
            return "unknown"

    def on_chain_start(self, serialized, inputs, **kwargs):
        """
        Callback triggered when a chain starts execution.
        
        Args:
            serialized: Serialized chain data.
            inputs: Input data being passed to the chain.
            **kwargs: Additional keyword arguments.
        """
        try:
            name = self._safe_name(serialized)
            keys = list(inputs.keys()) if isinstance(inputs, dict) else type(inputs)
            print(f"[TRACE][CHAIN.START] {name} inputs_keys={keys}")
        except Exception as e:
            print(f"[TRACE][CHAIN.START] error={e}")

    def on_chain_end(self, outputs, **kwargs):
        """
        Callback triggered when a chain completes execution.
        
        Args:
            outputs: Output data produced by the chain.
            **kwargs: Additional keyword arguments.
        """
        try:
            keys = list(outputs.keys()) if isinstance(outputs, dict) else type(outputs)
            print(f"[TRACE][CHAIN.END] outputs_keys={keys}")
        except Exception as e:
            print(f"[TRACE][CHAIN.END] error={e}")

    def on_chain_error(self, error, **kwargs):
        """
        Callback triggered when a chain encounters an error.
        
        Args:
            error: The exception that occurred.
            **kwargs: Additional keyword arguments.
        """
        try:
            print(f"[TRACE][CHAIN.ERROR] {type(error).__name__}: {error}")
        except Exception:
            pass

    def on_llm_start(self, serialized, prompts, **kwargs):
        """
        Callback triggered when an LLM call starts.
        
        Args:
            serialized: Serialized LLM data.
            prompts: List of prompts being sent to the LLM.
            **kwargs: Additional keyword arguments.
        """
        try:
            name = self._safe_name(serialized)
            count = len(prompts) if hasattr(prompts, "__len__") else "unknown"
            print(f"[TRACE][LLM.START] {name} prompts={count}")
            for i, p in enumerate(prompts or [], 1):
                p_str = str(p)
                snippet = p_str[:500].replace("\n", " ")
                print(f"[TRACE][LLM.PROMPT {i}] {snippet}")
        except Exception as e:
            print(f"[TRACE][LLM.START] error={e}")

    def on_llm_end(self, response, **kwargs):
        """
        Callback triggered when an LLM call completes.
        
        Args:
            response: The LLM response object containing generations and usage info.
            **kwargs: Additional keyword arguments.
        """
        try:
            gens = getattr(response, "generations", None)
            text = gens[0][0].text if gens and gens[0] and gens[0][0] else ""
            print(f"[TRACE][LLM.END] text_snippet={text[:300].replace(chr(10), ' ')}")
            llm_output = getattr(response, "llm_output", None)
            usage = llm_output.get("token_usage") if isinstance(llm_output, dict) else None
            if usage:
                print(f"[TRACE][LLM.USAGE] {usage}")
        except Exception as e:
            print(f"[TRACE][LLM.END] parse_error={e}")

    def on_llm_error(self, error, **kwargs):
        """
        Callback triggered when an LLM call encounters an error.
        
        Args:
            error: The exception that occurred.
            **kwargs: Additional keyword arguments.
        """
        try:
            print(f"[TRACE][LLM.ERROR] {type(error).__name__}: {error}")
        except Exception:
            pass

    def on_tool_start(self, serialized, input_str, **kwargs):
        """
        Callback triggered when a tool execution starts.
        
        Args:
            serialized: Serialized tool data.
            input_str: Input string being passed to the tool.
            **kwargs: Additional keyword arguments.
        """
        try:
            name = self._safe_name(serialized)
            print(f"[TRACE][TOOL.START] {name} args={input_str}")
        except Exception as e:
            print(f"[TRACE][TOOL.START] error={e}")

    def on_tool_end(self, output, **kwargs):
        """
        Callback triggered when a tool execution completes.
        
        Args:
            output: The output produced by the tool.
            **kwargs: Additional keyword arguments.
        """
        try:
            out_snippet = str(output)[:300].replace("\n", " ")
            print(f"[TRACE][TOOL.END] output={out_snippet}")
        except Exception as e:
            print(f"[TRACE][TOOL.END] error={e}")

    def on_tool_error(self, error, **kwargs):
        """
        Callback triggered when a tool execution encounters an error.
        
        Args:
            error: The exception that occurred.
            **kwargs: Additional keyword arguments.
        """
        try:
            print(f"[TRACE][TOOL.ERROR] {type(error).__name__}: {error}")
        except Exception:
            pass

# ================================================================================
# LANGUAGE DETECTION AND LOCALIZATION SYSTEM
# ================================================================================
 
def detect_language(text: str) -> str:
    """
    Comprehensive multilingual language detection supporting 20+ languages.
    Uses character sets, common words, and statistical patterns for accurate detection.

    Detection Strategy:
    1. Character set analysis (primary indicator)
    2. Language-specific word patterns and n-grams
    3. Statistical scoring with confidence thresholds
    4. Fallback mechanisms for edge cases
    5. Support for mixed-language content

    Supported Languages:
    - Turkish (tr), English (en), German (de), French (fr), Spanish (es)
    - Italian (it), Portuguese (pt), Dutch (nl), Russian (ru), Arabic (ar)
    - Chinese (zh), Japanese (ja), Korean (ko), Hindi (hi), Persian (fa)
    - Greek (el), Polish (pl), Czech (cs), Romanian (ro), Hungarian (hu)

    Args:
        text (str): Input text to analyze

    Returns:
        str: ISO 639-1 language code (e.g., 'en', 'tr', 'de', 'fr', etc.)
    """
    if not text or not text.strip():
        return 'en'  # Default to English for empty input

    text_lower = text.lower().strip()

    # Language detection patterns with character sets and common words
    language_patterns = {
        'tr': {  # Turkish
            'charset': r'[ğüşıöçĞÜŞİÖÇ]',
            'high_priority': [
                r'\b(müşteri|ürün|proje|firma|şirket|hizmet|selam|merhaba)\b',
                r'\b(ve|ile|bir|bu|şu|o|ki|ama|veya|çünkü|nasıl|ne|kim)\b',
                r'\b(teşekkür|ederim|yardımcı|olurum|eder|yardım)\b'
            ],
            'medium_priority': [
                r'\b(ben|sen|biz|siz|onlar|o|bu|hangi|nerede|neden)\b',
                r'\b(yapmak|etmek|olmak|gitmek|gelmek|vermek|almak)\b'
            ]
        },
        'en': {  # English
            'charset': r'[a-zA-Z]',
            'high_priority': [
                r'\b(the|and|or|but|because|with|for|from|this|that)\b',
                r'\b(hello|hi|dear|thank|please|help|assist|welcome)\b',
                r'\b(customer|product|project|company|service|information)\b'
            ],
            'medium_priority': [
                r'\b(what|how|who|when|where|why|which|which)\b',
                r'\b(i|you|we|they|he|she|it|me|us|them)\b',
                r'\b(is|are|was|were|will|would|can|could|should)\b'
            ]
        },
        'de': {  # German
            'charset': r'[äöüßÄÖÜß]',
            'high_priority': [
                r'\b(und|oder|aber|weil|mit|für|von|das|der|die|den)\b',
                r'\b(hallo|hallo|danke|bitte|hilfe|unterstützung|willkommen)\b',
                r'\b(kunde|produkt|projekt|firma|unternehmen|dienst|information)\b'
            ],
            'medium_priority': [
                r'\b(was|wie|wer|wann|wo|warum|welche)\b',
                r'\b(ich|du|sie|wir|ihr|er|sie|es|mich|dich|uns)\b'
            ]
        },
        'fr': {  # French
            'charset': r'[éèêàâùûïîôçÉÈÊÀÂÙÛÏÎÔÇ]',
            'high_priority': [
                r'\b(et|ou|mais|parce|avec|pour|de|le|la|les|un|une)\b',
                r'\b(bonjour|salut|merci|s\'il|vous|plaît|aide|bienvenue)\b',
                r'\b(client|produit|projet|entreprise|service|information)\b'
            ],
            'medium_priority': [
                r'\b(quoi|comment|qui|quand|où|pourquoi|quel|quelle)\b',
                r'\b(je|tu|il|elle|nous|vous|ils|elles|me|te)\b'
            ]
        },
        'es': {  # Spanish
            'charset': r'[ñáéíóúüÑÁÉÍÓÚÜ]',
            'high_priority': [
                r'\b(y|o|pero|porque|con|para|de|el|la|los|las|un|una)\b',
                r'\b(hola|gracias|por|favor|ayuda|bienvenido|información)\b',
                r'\b(cliente|producto|proyecto|empresa|servicio|información)\b'
            ],
            'medium_priority': [
                r'\b(qué|cómo|quién|cuándo|dónde|por|qué|cuál)\b',
                r'\b(yo|tú|él|ella|nosotros|ustedes|ellos|ellas)\b'
            ]
        },
        'it': {  # Italian
            'charset': r'[àèéìíîóòùçÀÈÉÌÍÎÓÒÙÇ]',
            'high_priority': [
                r'\b(e|o|ma|perché|con|per|di|il|la|i|le|un|una)\b',
                r'\b(ciao|grazie|per|favore|aiuto|benvenuto|informazione)\b',
                r'\b(cliente|prodotto|progetto|azienda|servizio|informazione)\b'
            ],
            'medium_priority': [
                r'\b(che|come|chi|quando|dove|perché|quale)\b',
                r'\b(io|tu|lui|lei|noi|voi|loro|me|te|ci)\b'
            ]
        },
        'pt': {  # Portuguese
            'charset': r'[ãáéíóúàâêôçÃÁÉÍÓÚÀÂÊÔÇ]',
            'high_priority': [
                r'\b(e|ou|mas|porque|com|para|de|o|a|os|as|um|uma)\b',
                r'\b(olá|obrigado|por|favor|ajuda|bem-vindo|informação)\b',
                r'\b(cliente|produto|projeto|empresa|serviço|informação)\b'
            ],
            'medium_priority': [
                r'\b(o|que|como|quem|quando|onde|por|que|qual)\b',
                r'\b(eu|tu|ele|ela|nós|vocês|eles|elas|me|te)\b'
            ]
        },
        'ru': {  # Russian
            'charset': r'[а-яА-ЯёЁ]',
            'high_priority': [
                r'\b(и|или|но|потому|что|с|для|из|это|этот|эта|эти)\b',
                r'\b(привет|спасибо|пожалуйста|помощь|добро|пожаловать)\b',
                r'\b(клиент|продукт|проект|компания|услуга|информация)\b'
            ],
            'medium_priority': [
                r'\b(что|как|кто|когда|где|почему|какой)\b',
                r'\b(я|ты|он|она|мы|вы|они|меня|тебя|нас)\b'
            ]
        },
        'ar': {  # Arabic
            'charset': r'[\u0600-\u06FF]',
            'high_priority': [
                r'\b(و|أو|لكن|لأن|مع|من|في|هذا|هذه|هؤلاء)\b',
                r'\b(مرحبا|شكرا|من|فضلك|مساعدة|أهلا|بك|معلومات)\b',
                r'\b(عميل|منتج|مشروع|شركة|خدمة|معلومات)\b'
            ],
            'medium_priority': [
                r'\b(ما|كيف|من|متى|أين|لماذا|أي)\b',
                r'\b(أنا|أنت|هو|هي|نحن|أنتم|هم|هي|ني)\b'
            ]
        },
        'zh': {  # Chinese
            'charset': r'[\u4e00-\u9fff]',
            'high_priority': [
                r'\b(和|或|但|因为|与|为|从|的|这|那|个|是)\b',
                r'\b(你好|谢谢|请|帮助|欢迎|信息|服务)\b',
                r'\b(客户|产品|项目|公司|服务|信息)\b'
            ],
            'medium_priority': [
                r'\b(什么|如何|谁|何时|哪里|为什么|哪个)\b',
                r'\b(我|你|他|她|我们|你们|他们|她们)\b'
            ]
        },
        'ja': {  # Japanese
            'charset': r'[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]',
            'high_priority': [
                r'\b(と|か|しかし|なぜなら|と|の|これ|それ|の|です|ます)\b',
                r'\b(こんにちは|ありがとう|ください|おねがいします|助け|ようこそ)\b',
                r'\b(お客様|製品|プロジェクト|会社|サービス|情報)\b'
            ],
            'medium_priority': [
                r'\b(何|どう|誰|いつ|どこ|なぜ|どの)\b',
                r'\b(私|あなた|彼|彼女|私たち|あなたたち|彼ら|彼女ら)\b'
            ]
        },
        'ko': {  # Korean
            'charset': r'[\uac00-\ud7af]',
            'high_priority': [
                r'\b(그리고|또는|하지만|왜냐하면|과|위해|의|이|그|저|입니다)\b',
                r'\b(안녕하세요|감사합니다|주세요|도와주세요|환영합니다|정보)\b',
                r'\b(고객|제품|프로젝트|회사|서비스|정보)\b'
            ],
            'medium_priority': [
                r'\b(무엇|어떻게|누가|언제|어디|왜|어느)\b',
                r'\b(나|너|그|그녀|우리|너희|그들|그녀들|나|너)\b'
            ]
        },
        'hi': {  # Hindi
            'charset': r'[\u0900-\u097f]',
            'high_priority': [
                r'\b(और|या|लेकिन|क्योंकि|के|लिए|से|का|कि|ये|वह|है)\b',
                r'\b(नमस्ते|धन्यवाद|कृपया|मदद|स्वागत|जानकारी)\b',
                r'\b(ग्राहक|उत्पाद|परियोजना|कंपनी|सेवा|जानकारी)\b'
            ],
            'medium_priority': [
                r'\b(क्या|कैसे|कौन|कब|कहाँ|क्यों|कौन)\b',
                r'\b(मैं|तू|वह|वह|हम|आप|वे|वे|मुझे|तुझे)\b'
            ]
        },
        'fa': {  # Persian/Farsi
            'charset': r'[\u0600-\u06FF]',
            'high_priority': [
                r'\b(و|یا|اما|چرا|با|برای|از|این|آن|آنها|است)\b',
                r'\b(سلام|مرسی|لطفا|کمک|خوش|آمدید|اطلاعات)\b',
                r'\b(مشتری|محصول|پروژه|شرکت|خدمات|اطلاعات)\b'
            ],
            'medium_priority': [
                r'\b(چه|چگونه|کی|کی|کجا|چرا|کدامیک)\b',
                r'\b(من|تو|او|او|ما|شما|آنها|آنها|مرا|ترا)\b'
            ]
        }
    }

    # Initialize scores for all languages
    scores = {lang: 0 for lang in language_patterns.keys()}

    # Character set analysis (highest priority)
    for lang, patterns in language_patterns.items():
        if 'charset' in patterns and re.search(patterns['charset'], text):
            if lang in ['ar', 'fa', 'ru']:  # RTL languages get higher priority
                scores[lang] += 8
            elif lang in ['zh', 'ja', 'ko', 'hi']:  # CJK and Devanagari
                scores[lang] += 6
            else:
                scores[lang] += 4

    # Pattern matching analysis
    for lang, patterns in language_patterns.items():
        # High priority patterns
        for pattern in patterns.get('high_priority', []):
            if re.search(pattern, text_lower):
                scores[lang] += 3

        # Medium priority patterns
        for pattern in patterns.get('medium_priority', []):
            if re.search(pattern, text_lower):
                scores[lang] += 1

    # Special handling for Turkish business terms
    turkish_business_terms = [
        'müşteri', 'ürün', 'proje', 'firma', 'şirket', 'hizmet',
        'satış', 'alım', 'satım', 'ticaret', 'pazarlama', 'reklam',
        'müşteri', 'hizmet', 'bilgi', 'destek', 'yardım', 'soru'
    ]
    for term in turkish_business_terms:
        if term in text_lower:
            scores['tr'] += 2

    # English business terms
    english_business_terms = [
        'customer', 'product', 'project', 'company', 'service', 'information',
        'help', 'support', 'question', 'please', 'thank', 'welcome'
    ]
    for term in english_business_terms:
        if term in text_lower:
            scores['en'] += 1

    # Find the language with highest score
    max_score = max(scores.values())
    if max_score == 0:
        return 'en'  # Default to English if no patterns match

    # Get all languages with maximum score
    top_languages = [lang for lang, score in scores.items() if score == max_score]

    # If there's a tie, use tie-breaker logic
    if len(top_languages) > 1:
        # Prefer languages with unique character sets
        for lang in ['tr', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ar', 'zh', 'ja', 'ko', 'hi', 'fa']:
            if lang in top_languages:
                return lang

        # If still tied, prefer English as fallback
        if 'en' in top_languages:
            return 'en'

        # Otherwise, return the first one alphabetically
        return sorted(top_languages)[0]

    return top_languages[0]

def get_language_specific_prompt(language_code: str) -> str:
    """
    Returns comprehensive language-specific system prompt with mandatory language enforcement
    supporting 15+ languages with their unique characteristics and cultural contexts.

    Args:
        language_code (str): ISO 639-1 language code (e.g., 'en', 'tr', 'de', 'fr', etc.)

    Returns:
        str: Language-specific system prompt with cultural adaptation
    """

    # Universal language enforcement rules (always included)
    universal_rules = """"""

    prompts = {
        'tr': f"""
{universal_rules}

Sen KAI-Fusion platformunda çalışan uzman bir Türkçe AI asistanısın.

KURALLAR:
1. Kullanıcı Türkçe soru sordu → SEN DE TÜRKÇE CEVAP VER (ZORUNLU!)
2. Kullanıcı başka dilde soru sordu → SEN DE O DİLDE CEVAP VER (ZORUNLU!)
3. Asla karışık dil kullanma - tamamen tek dilde konuş
4. Kullanıcının dilini algıla ve o dilde yanıt ver

KONUŞMA GEÇMİŞİ KULLANIMI:
- Önceki mesajları kontrol et ve bağlamı anlayarak cevap ver
- Belirsiz zamirler için (o, bu, şu) konuşma geçmişini kullan
- Her zaman tam bağlamı anlayarak, kullanıcının dilinde cevap ver

ARAÇ KULLANIM KURALLARI:
- Soru araçla cevaplanabiliyorsa, ÖNCELİKLE ARACI KULLAN
- Belgeler, kişiler veya özel bilgiler için araçları kullan
- Sadece genel konuşma için araç kullanma (merhaba, nasılsın)
- Araç sonuçlarını kullanıcının dilinde sun
- Eğer araç sonuç bulamazsa, genel bilginle yardım et

CEVAP VERME STİLİ:
- Kullanıcının dilinde, samimi ve yardımsever ton kullan
- Karmaşık konuları basitleştirerek açıkla
- Kullanıcının seviyesine uygun teknik detay ver
- Türkçe: Saygılı, samimi ve profesyonel
- Diğer diller: Kültürel olarak uygun ve profesyonel

DİL ALGILAMA:
- Kullanıcının yazdığı dile bak ve o dili kullan
- Türkçe karakterler (ğ, ü, ş, i, ö, ç) → Türkçe
- Diğer dil karakterleri → O dil
- Emin değilsen, mesajın başına bak
""",
        'en': f"""
{universal_rules}

You are an expert multilingual AI assistant working on the KAI-Fusion platform.

RULES:
1. User asks in any language → YOU MUST ANSWER IN THAT SAME LANGUAGE (MANDATORY!)
2. Never mix languages - speak entirely in one language
3. Always detect and respond in the user's detected language
4. Maintain consistency throughout the entire conversation

CONVERSATION HISTORY USAGE:
- Check previous messages and understand context before responding
- Use conversation history for pronouns and context
- Always provide full context in the user's language

TOOL USAGE RULES:
- If question can be answered with tools, USE TOOLS FIRST
- Use tools for documents, people, or specific information
- Don't use tools for general conversation (hello, how are you)
- Present tool results in the user's language
- If tools don't find results, help with general knowledge

RESPONSE STYLE:
- Use user's language, friendly and helpful tone
- Simplify complex topics with clear explanations
- Provide technical details appropriate to user's level
- Adapt to cultural context and local preferences
- Be respectful and professional in all languages

LANGUAGE DETECTION:
- Look at the language user writes and use that language
- Detect language-specific characters and patterns
- If unsure, check the beginning of the message
- Support multilingual content and code-switching
""",
        'de': f"""
{universal_rules}

Sie sind ein erfahrener deutscher AI-Assistent auf der KAI-Fusion Plattform.

REGELN:
1. Benutzer fragt auf Deutsch → SIE ANTWORTEN AUF DEUTSCH (Zwingend!)
2. Benutzer fragt in anderer Sprache → SIE ANTWORTEN IN DERSELBEN SPRACHE (Zwingend!)
3. Niemals Sprachen mischen - sprechen Sie vollständig in einer Sprache
4. Die Sprache des Benutzers erkennen und in dieser antworten

GESPRÄCHSVERLAUF NUTZEN:
- Frühere Nachrichten prüfen und Kontext verstehen
- Für Pronomen (er, sie, es, das, dieser) den Gesprächsverlauf nutzen
- Immer vollständigen Kontext in der Sprache des Benutzers geben

WERKZEUGNUTZUNGSREGELN:
- Wenn Frage mit Werkzeugen beantwortet werden kann, WERKZEUGE ZUERST VERWENDEN
- Werkzeuge für Dokumente, Personen oder spezifische Informationen nutzen
- Keine Werkzeuge für allgemeine Unterhaltung (hallo, wie geht es dir)
- Werkzeugergebnisse in der Sprache des Benutzers präsentieren
- Wenn Werkzeuge keine Ergebnisse finden, mit allgemeinem Wissen helfen

ANTWORTSTIL:
- Freundlicher und hilfsbereiter Ton in der Sprache des Benutzers
- Komplexe Themen vereinfacht erklären
- Technische Details entsprechend Benutzerniveau
- Deutsch: Höflich, professionell und zugänglich
- Andere Sprachen: Kulturell angemessen und professionell
""",
        'fr': f"""
{universal_rules}

Vous êtes un assistant IA français expert travaillant sur la plateforme KAI-Fusion.

RÈGLES:
1. L'utilisateur pose une question en français → VOUS RÉPONDEZ EN FRANÇAIS (Obligatoire!)
2. L'utilisateur pose une question dans une autre langue → VOUS RÉPONDEZ DANS LA MÊME LANGUE (Obligatoire!)
3. Ne mélangez jamais les langues - parlez entièrement dans une seule langue
4. Détectez la langue de l'utilisateur et répondez dans cette langue

UTILISATION DE L'HISTORIQUE DE CONVERSATION:
- Vérifiez les messages précédents et comprenez le contexte
- Utilisez l'historique pour les pronoms (il, elle, ce, cette, celui)
- Fournissez toujours le contexte complet dans la langue de l'utilisateur

RÈGLES D'UTILISATION DES OUTILS:
- Si la question peut être répondue avec des outils, UTILISEZ LES OUTILS D'ABORD
- Utilisez les outils pour les documents, personnes ou informations spécifiques
- N'utilisez pas d'outils pour les conversations générales (bonjour, comment allez-vous)
- Présentez les résultats des outils dans la langue de l'utilisateur
- Si les outils ne trouvent pas de résultats, aidez avec des connaissances générales

STYLE DE RÉPONSE:
- Ton amical et serviable dans la langue de l'utilisateur
- Simplifiez les sujets complexes avec des explications claires
- Détails techniques adaptés au niveau de l'utilisateur
- Français: Poli, professionnel et accessible
- Autres langues: Approprié culturellement et professionnel
""",
        'es': f"""
{universal_rules}

Eres un asistente de IA español experto trabajando en la plataforma KAI-Fusion.

REGLAS:
1. El usuario pregunta en español → TÚ RESPONDES EN ESPAÑOL (¡Obligatorio!)
2. El usuario pregunta en otro idioma → TÚ RESPONDES EN EL MISMO IDIOMA (¡Obligatorio!)
3. Nunca mezcles idiomas - habla completamente en un solo idioma
4. Detecta el idioma del usuario y responde en ese idioma

USO DEL HISTORIAL DE CONVERSACIÓN:
- Revisa los mensajes anteriores y comprende el contexto
- Usa el historial para pronombres (él, ella, esto, esta, ese)
- Proporciona siempre el contexto completo en el idioma del usuario

REGLAS DE USO DE HERRAMIENTAS:
- Si la pregunta puede responderse con herramientas, USA LAS HERRAMIENTAS PRIMERO
- Usa herramientas para documentos, personas o información específica
- No uses herramientas para conversación general (hola, cómo estás)
- Presenta los resultados de las herramientas en el idioma del usuario
- Si las herramientas no encuentran resultados, ayuda con conocimiento general

ESTILO DE RESPUESTA:
- Tono amigable y servicial en el idioma del usuario
- Simplifica temas complejos con explicaciones claras
- Detalles técnicos apropiados al nivel del usuario
- Español: Cortés, profesional y accesible
- Otros idiomas: Apropiado culturalmente y profesional
""",
        'it': f"""
{universal_rules}

Sei un assistente IA italiano esperto che lavora sulla piattaforma KAI-Fusion.

REGOLE:
1. L'utente pone una domanda in italiano → TU RISPONDI IN ITALIANO (Obbligatorio!)
2. L'utente pone una domanda in un'altra lingua → TU RISPONDI NELLA STESSA LINGUA (Obbligatorio!)
3. Non mischiare mai le lingue - parla completamente in una sola lingua
4. Rileva la lingua dell'utente e rispondi in quella lingua

UTILIZZO DELLA STORIA DELLA CONVERSAZIONE:
- Controlla i messaggi precedenti e comprendi il contesto
- Usa la storia per i pronomi (lui, lei, questo, quella, quello)
- Fornisci sempre il contesto completo nella lingua dell'utente

REGOLE DI UTILIZZO DEGLI STRUMENTI:
- Se la domanda può essere risposta con gli strumenti, USA GLI STRUMENTI PRIMA
- Usa gli strumenti per documenti, persone o informazioni specifiche
- Non usare strumenti per conversazione generale (ciao, come stai)
- Presenta i risultati degli strumenti nella lingua dell'utente
- Se gli strumenti non trovano risultati, aiuta con conoscenze generali

STILE DI RISPOSTA:
- Tono amichevole e servizievole nella lingua dell'utente
- Semplifica argomenti complessi con spiegazioni chiare
- Dettagli tecnici appropriati al livello dell'utente
- Italiano: Cortese, professionale e accessibile
- Altre lingue: Appropriato culturalmente e professionale
""",
        'pt': f"""
{universal_rules}

Você é um assistente de IA português especialista trabalhando na plataforma KAI-Fusion.

REGRAS:
1. O usuário pergunta em português → VOCÊ RESPONDE EM PORTUGUÊS (Obrigatório!)
2. O usuário pergunta em outro idioma → VOCÊ RESPONDE NO MESMO IDIOMA (Obrigatório!)
3. Nunca misture idiomas - fale completamente em um só idioma
4. Detecte o idioma do usuário e responda nesse idioma

USO DO HISTÓRICO DE CONVERSA:
- Verifique as mensagens anteriores e compreenda o contexto
- Use o histórico para pronomes (ele, ela, isso, esta, esse)
- Forneça sempre o contexto completo na língua do usuário

REGRAS DE USO DE FERRAMENTAS:
- Se a pergunta puder ser respondida com ferramentas, USE AS FERRAMENTAS PRIMEIRO
- Use ferramentas para documentos, pessoas ou informações específicas
- Não use ferramentas para conversa geral (olá, como você está)
- Apresente os resultados das ferramentas na língua do usuário
- Se as ferramentas não encontrarem resultados, ajude com conhecimento geral

ESTILO DE RESPOSTA:
- Tom amigável e prestativo na língua do usuário
- Simplifique tópicos complexos com explicações claras
- Detalhes técnicos apropriados ao nível do usuário
- Português: Cortês, profissional e acessível
- Outros idiomas: Apropriado culturalmente e profissional
""",
        'ru': f"""
{universal_rules}

Вы - опытный русский ИИ-ассистент, работающий на платформе KAI-Fusion.

ПРАВИЛА:
1. Пользователь спрашивает на русском → ВЫ ОТВЕЧАЕТЕ НА РУССКОМ (Обязательно!)
2. Пользователь спрашивает на другом языке → ВЫ ОТВЕЧАЕТЕ НА ТОМ ЖЕ ЯЗЫКЕ (Обязательно!)
3. Никогда не смешивайте языки - говорите полностью на одном языке
4. Определяйте язык пользователя и отвечайте на этом языке

ИСПОЛЬЗОВАНИЕ ИСТОРИИ БЕСЕДЫ:
- Проверяйте предыдущие сообщения и понимайте контекст
- Используйте историю для местоимений (он, она, это, эта, тот)
- Всегда предоставляйте полный контекст на языке пользователя

ПРАВИЛА ИСПОЛЬЗОВАНИЯ ИНСТРУМЕНТОВ:
- Если вопрос можно ответить с помощью инструментов, ИСПОЛЬЗУЙТЕ ИНСТРУМЕНТЫ СНАЧАЛА
- Используйте инструменты для документов, людей или специфической информации
- Не используйте инструменты для общей беседы (привет, как дела)
- Представляйте результаты инструментов на языке пользователя
- Если инструменты не находят результатов, помогайте общими знаниями

СТИЛЬ ОТВЕТА:
- Дружелюбный и полезный тон на языке пользователя
- Упрощайте сложные темы с ясными объяснениями
- Технические детали, соответствующие уровню пользователя
- Русский: Вежливый, профессиональный и доступный
- Другие языки: Культурно уместный и профессиональный
""",
        'ar': f"""
{universal_rules}

أنت مساعد ذكي عربي خبير يعمل على منصة KAI-Fusion.

القواعد:
1. المستخدم يسأل بالعربية → أنت تجيب بالعربية (إلزامي!)
2. المستخدم يسأل بلغة أخرى → أنت تجيب بنفس اللغة (إلزامي!)
3. لا تخلط بين اللغات أبداً - تحدث بلغة واحدة فقط
4. اكتشف لغة المستخدم وأجب بها

استخدام تاريخ المحادثة:
- تحقق من الرسائل السابقة وافهم السياق
- استخدم التاريخ للضمائر (هو، هي، هذا، هذه، ذلك)
- قدم دائماً السياق الكامل بلغة المستخدم

قواعد استخدام الأدوات:
- إذا كان السؤال يمكن الإجابة عليه بالأدوات، استخدم الأدوات أولاً
- استخدم الأدوات للوثائق والأشخاص والمعلومات الخاصة
- لا تستخدم الأدوات للمحادثة العامة (مرحباً، كيف حالك)
- قدم نتائج الأدوات بلغة المستخدم
- إذا لم تجد الأدوات نتائج، ساعد بالمعرفة العامة

أسلوب الرد:
- نبرة ودية ومساعدة بلغة المستخدم
- بسط المواضيع المعقدة بشرح واضح
- تفاصيل تقنية مناسبة لمستوى المستخدم
- العربية: مهذبة ومهنية ومتاحة
- اللغات الأخرى: مناسبة ثقافياً ومهنية
""",
        'zh': f"""
{universal_rules}

您是KAI-Fusion平台上工作的专家中文AI助手。

规则：
1. 用户用中文提问 → 您必须用中文回答（强制性！）
2. 用户用其他语言提问 → 您必须用相同语言回答（强制性！）
3. 永远不要混合语言 - 完全用一种语言说话
4. 检测用户的语言并用该语言回答

对话历史使用：
- 检查之前的消息并理解上下文
- 使用历史记录处理代词（他、她、这个、那个、那个）
- 始终在用户的语言中提供完整上下文

工具使用规则：
- 如果可以用工具回答问题，首先使用工具
- 对文档、人员或特定信息使用工具
- 不要对一般对话使用工具（你好、你好吗）
- 用用户的语言呈现工具结果
- 如果工具没有找到结果，用一般知识帮助

回答风格：
- 用用户语言的友好和乐于助人的语气
- 用清晰解释简化复杂主题
- 根据用户水平提供适当的技术细节
- 中文：礼貌、专业且易于理解
- 其他语言：文化上适当且专业
""",
        'ja': f"""
{universal_rules}

あなたはKAI-Fusionプラットフォームで働く専門の日本語AIアシスタントです。

ルール：
1. ユーザーが日本語で質問 → あなたは日本語で回答（必須！）
2. ユーザーが他の言語で質問 → あなたは同じ言語で回答（必須！）
3. 言語を混ぜないこと - 完全に一つの言語で話す
4. ユーザーの言語を検出してその言語で回答する

会話履歴の使用：
- 前のメッセージを確認して文脈を理解する
- 代名詞（彼、彼女、これ、それ、あれ）のために会話履歴を使用
- 常にユーザーの言語で完全な文脈を提供する

ツール使用ルール：
- ツールで答えられる質問がある場合、最初にツールを使用する
- 文書、人物、または特定の情報にツールを使用する
- 一般的な会話にツールを使用しない（こんにちは、元気ですか）
- ツールの結果をユーザーの言語で提示する
- ツールが結果を見つけられない場合、一般知識で助ける

回答スタイル：
- ユーザーの言語でフレンドリーで役立つトーン
- 複雑なトピックを明確な説明で簡略化する
- ユーザーのレベルに適した技術的詳細を提供する
- 日本語：丁寧でプロフェッショナル、わかりやすい
- 他の言語：文化的に適切でプロフェッショナル
""",
        'ko': f"""
{universal_rules}

당신은 KAI-Fusion 플랫폼에서 일하는 전문 한국어 AI 어시스턴트입니다.

규칙:
1. 사용자가 한국어로 질문 → 당신은 한국어로 답변（강제적!）
2. 사용자가 다른 언어로 질문 → 당신은 같은 언어로 답변（강제적!）
3. 언어를 섞지 마십시오 - 완전히 하나의 언어로 말하십시오
4. 사용자의 언어를 감지하고 그 언어로 답변하십시오

대화 기록 사용:
- 이전 메시지를 확인하고 맥락을 이해하십시오
- 대명사（그, 그녀, 이것, 저것, 저것）를 위해 대화 기록을 사용하십시오
- 항상 사용자의 언어로 완전한 맥락을 제공하십시오

도구 사용 규칙:
- 도구로 답변할 수 있는 질문이 있으면 먼저 도구를 사용하십시오
- 문서, 사람 또는 특정 정보에 도구를 사용하십시오
- 일반 대화에 도구를 사용하지 마십시오（안녕하세요, 어떻게 지내세요）
- 도구 결과를 사용자의 언어로 제시하십시오
- 도구가 결과를 찾지 못하면 일반 지식으로 도와주십시오

답변 스타일:
- 사용자의 언어로 친근하고 도움이 되는 톤
- 복잡한 주제를 명확한 설명으로 단순화하십시오
- 사용자의 수준에 적합한 기술적 세부 사항을 제공하십시오
- 한국어: 정중하고 전문적이며 이해하기 쉬운
- 다른 언어: 문화적으로 적절하고 전문적인
""",
        'hi': f"""
{universal_rules}

आप KAI-Fusion प्लेटफॉर्म पर काम करने वाले विशेषज्ञ हिंदी AI सहायक हैं।

नियम:
1. उपयोगकर्ता हिंदी में सवाल पूछता है → आप हिंदी में जवाब दें（अनिवार्य!）
2. उपयोगकर्ता अन्य भाषा में सवाल पूछता है → आप उसी भाषा में जवाब दें（अनिवार्य!）
3. कभी भी भाषाएं न मिलाएं - पूरी तरह से एक भाषा में बोलें
4. उपयोगकर्ता की भाषा का पता लगाएं और उस भाषा में जवाब दें

बातचीत इतिहास का उपयोग:
- पिछले संदेशों की जांच करें और संदर्भ समझें
- सर्वनामों के लिए बातचीत इतिहास का उपयोग करें（वह, वह, यह, वह, वह）
- हमेशा उपयोगकर्ता की भाषा में पूरा संदर्भ प्रदान करें

उपकरण उपयोग नियम:
- यदि सवाल उपकरणों से जवाब दिया जा सकता है, तो पहले उपकरणों का उपयोग करें
- दस्तावेजों, लोगों या विशिष्ट जानकारी के लिए उपकरणों का उपयोग करें
- सामान्य बातचीत के लिए उपकरणों का उपयोग न करें（नमस्ते, कैसे हैं）
- उपकरण परिणामों को उपयोगकर्ता की भाषा में प्रस्तुत करें
- यदि उपकरण परिणाम नहीं खोजते हैं, तो सामान्य ज्ञान से मदद करें

जवाब शैली:
- उपयोगकर्ता की भाषा में अनुकूल और सहायक टोन
- जटिल विषयों को स्पष्ट स्पष्टीकरण के साथ सरल बनाएं
- उपयोगकर्ता के स्तर के अनुरूप तकनीकी विवरण प्रदान करें
- हिंदी: विनम्र, पेशेवर और समझने में आसान
- अन्य भाषाएं: सांस्कृतिक रूप से उचित और पेशेवर
""",
        'fa': f"""
{universal_rules}

شما یک دستیار هوش مصنوعی فارسی متخصص هستید که روی پلتفرم KAI-Fusion کار می‌کنید.

قوانین:
1. کاربر به فارسی سوال می‌کند → شما به فارسی پاسخ دهید（اجباری!）
2. کاربر به زبان دیگری سوال می‌کند → شما به همان زبان پاسخ دهید（اجباری!）
3. هرگز زبان‌ها را مخلوط نکنید - کاملاً به یک زبان صحبت کنید
4. زبان کاربر را تشخیص دهید و به آن زبان پاسخ دهید

استفاده از تاریخچه گفتگو:
- پیام‌های قبلی را بررسی کنید و context را درک کنید
- از تاریخچه گفتگو برای ضمایر استفاده کنید（او، او، این، آن، آن）
- همیشه context کامل را به زبان کاربر ارائه دهید

قوانین استفاده از ابزارها:
- اگر سوال با ابزارها قابل پاسخ است، ابتدا از ابزارها استفاده کنید
- از ابزارها برای اسناد، افراد یا اطلاعات خاص استفاده کنید
- از ابزارها برای گفتگوهای عمومی استفاده نکنید（سلام، چطوری）
- نتایج ابزارها را به زبان کاربر ارائه دهید
- اگر ابزارها نتیجه‌ای پیدا نکردند، با دانش عمومی کمک کنید

سبک پاسخگویی:
- لحن دوستانه و کمک‌کننده به زبان کاربر
- موضوعات پیچیده را با توضیحات واضح ساده کنید
- جزئیات فنی مناسب سطح کاربر را ارائه دهید
- فارسی: مودبانه، حرفه‌ای و قابل فهم
- زبان‌های دیگر: مناسب فرهنگی و حرفه‌ای
"""
    }

    return prompts.get(language_code, prompts['en'])  # Default to English

# ================================================================================
# REACTAGENT NODE - THE ORCHESTRATION BRAIN OF KAI-FUSION
# ================================================================================

class ReactAgentNode(ProcessorNode):
    """
    KAI-Fusion ReactAgent - Modern LangGraph-Based AI Agent Orchestration Engine
    ==========================================================================
    
    The ReactAgentNode is the crown jewel of the KAI-Fusion platform, representing the
    culmination of modern AI agent architecture, multilingual intelligence, and
    enterprise-grade orchestration capabilities. Built upon LangGraph's latest
    create_react_agent framework, it transcends traditional agent limitations to deliver
    sophisticated, state-driven AI interactions with robust memory and tool management.

    AUTHORS: KAI-Fusion Development Team
    MAINTAINER: Senior AI Architecture Team
    VERSION: 3.0.0
    LAST_UPDATED: 2025-09-07
    LICENSE: Proprietary - KAI-Fusion Platform
    """
    
    def __init__(self):
        """Initialize ReactAgentNode with modular metadata configuration."""
        super().__init__()
        self._metadata = self._build_metadata()
        self.auto_tool_manager = AutoToolManager()

    def _build_metadata(self) -> Dict[str, Any]:
        """Build comprehensive metadata dictionary from modular components."""
        return {
            "name": self._get_node_name(),
            "display_name": self._get_display_name(),
            "description": self._get_description(),
            "category": self._get_category(),
            "node_type": self._get_node_type(),
            "colors": ["purple-500", "indigo-600"],      
            "icon": {"name": "bot", "path": None, "alt": None},
            "inputs": self._build_input_schema(),
            "outputs": self._build_output_schema(),
            "properties": self._build_properties_schema()
        }

    def _build_properties_schema(self) -> List[NodeProperty]:
        """Build the properties schema from modular property definitions."""
        return [
            NodeProperty(
                name="agent_type",
                displayName="Agent Type",
                type=NodePropertyType.SELECT,
                options=[
                    {"label": "ReAct Agent ⭐", "value": "react"},
                    {"label": "Conversational Agent", "value": "conversational"},
                    {"label": "Task-Oriented Agent", "value": "task_oriented"},
                ],
                default="react",
                required=True,
            ),
            NodeProperty(
                name="system_prompt",
                displayName="System Prompt",
                type=NodePropertyType.TEXT_AREA,
                default="You are a helpful assistant. Use tools to answer questions.",
                hint="Define agent behavior and capabilities. This is the core system instruction.",
                required=True,
            ),
            NodeProperty(
                name="user_prompt_template",
                displayName="User Prompt Template",
                type=NodePropertyType.TEXT_AREA,
                default="{{input}}",
                hint="Template for user input",
                required=False,
            ),
            NodeProperty(
                name="max_iterations",
                displayName="Max Iterations",
                type=NodePropertyType.RANGE,
                default=5,
                min=1,
                max=20,
                minLabel="Quick",
                maxLabel="Thorough",
                required=True,
            ),
            NodeProperty(
                name="temperature",
                displayName="Temperature",
                type=NodePropertyType.RANGE,
                default=0.7,
                min=0.0,
                max=2.0,
                step=0.1,
                color="purple-400",
                minLabel="Precise",
                maxLabel="Creative",
                required=True,
            ),
            NodeProperty(
                name="enable_memory",
                displayName="Enable Memory",
                type=NodePropertyType.CHECKBOX,
                default=True,
                hint="Allow agent to remember previous interactions",
            ),
            NodeProperty(
                name="enable_tools",
                displayName="Enable Tools",
                type=NodePropertyType.CHECKBOX,
                default=True,
                hint="Allow agent to use connected tools and functions",
            ),
        ]

    def _get_node_name(self) -> str:
        """Get the internal node name identifier."""
        return "Agent"

    def _get_display_name(self) -> str:
        """Get the user-friendly display name."""
        return "Agent"

    def _get_description(self) -> str:
        """Get the detailed node description."""
        return "Orchestrates LLM, tools, and memory for complex, multi-step tasks."

    def _get_category(self) -> str:
        """Get the node category for UI organization."""
        return "Agents"

    def _get_node_type(self) -> NodeType:
        """Get the processor node type."""
        return NodeType.PROCESSOR

    def _build_input_schema(self) -> List[NodeInput]:
        """Build the input schema from modular input definitions."""
        return [
            self._create_input_node(),
            self._create_llm_input(),
            self._create_tools_input(),
            self._create_memory_input(),
            self._create_max_iterations_input(),
            self._create_system_prompt_input(),
            self._create_prompt_instructions_input()
        ]

    def _build_output_schema(self) -> List[NodeOutput]:
        """Build the output schema from modular output definitions."""
        return [self._create_output_node()]

    def _create_input_node(self) -> NodeInput:
        """Create the main input node configuration."""
        return NodeInput(
            name="input",
            displayName="Input",
            type="string",
            is_connection=True,
            required=True,
            description="The user's input to the agent."
        )

    def _create_llm_input(self) -> NodeInput:
        """Create the LLM connection input configuration."""
        return NodeInput(
            name="llm",
            displayName="LLM",
            type="BaseLanguageModel",
            required=True,
            is_connection=True,
            direction=NodePosition.BOTTOM,
            description="The language model that the agent will use."
        )

    def _create_tools_input(self) -> NodeInput:
        """Create the tools connection input configuration."""
        return NodeInput(
            name="tools",
            displayName="Tools",
            type="Sequence[BaseTool]",
            required=False,
            is_connection=True,
            direction=NodePosition.BOTTOM,
            description="The tools that the agent can use."
        )

    def _create_memory_input(self) -> NodeInput:
        """Create the memory connection input configuration."""
        return NodeInput(
            name="memory",
            displayName="Memory",
            type="BaseMemory",
            required=False,
            is_connection=True,
            direction=NodePosition.BOTTOM,
            description="The memory that the agent can use."
        )

    def _create_max_iterations_input(self) -> NodeInput:
        """Create the max iterations parameter input configuration."""
        return NodeInput(
            name="max_iterations",
            type="int",
            default=10,
            description="The maximum number of iterations the agent can perform."
        )

    def _create_system_prompt_input(self) -> NodeInput:
        """Create the system prompt parameter input configuration."""
        return NodeInput(
            name="system_prompt",
            type="str",
            default="You are an expert AI assistant specialized in providing detailed, step-by-step guidance and comprehensive answers. You excel at breaking down complex topics into clear, actionable instructions.",
            description="The system prompt for the agent."
        )

    def _create_prompt_instructions_input(self) -> NodeInput:
        """Create the custom prompt instructions parameter input configuration."""
        return NodeInput(
            name="prompt_instructions",
            type="str",
            required=False,
            description="Custom prompt instructions for the agent. If not provided, uses smart orchestration defaults.",
            default=""
        )

    def _create_output_node(self) -> NodeOutput:
        """Create the main output node configuration."""
        return NodeOutput(
            name="output",
            displayName="Output",
            type="str",
            description="The final output from the agent.",
            is_connection=True,
        )
    
    def get_required_packages(self) -> list[str]:
        """
        DYNAMIC METHOD: Returns the Python packages required by ReactAgentNode.
        
        This method is critical for the dynamic export system to work.
        Returns LangGraph and agent dependencies required for ReactAgent.
        """
        return [
            "langgraph>=0.2.0",            # LangGraph for new agent orchestration
            "langchain>=0.1.0",            # LangChain core framework
            "langchain-core>=0.1.0",       # LangChain core components
            "langchain-community>=0.0.10", # Community tools and agents
            "pydantic>=2.5.0",             # Data validation
            "typing-extensions>=4.8.0"     # Advanced typing support
        ]

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Runnable]) -> Runnable:
        """
        Sets up and returns a RunnableLambda that executes the agent with dynamic language detection.
        """
        def agent_executor_lambda(runtime_inputs: dict) -> dict:
            # Setup encoding and validate connections
            self._setup_encoding()
            llm, tools, memory = self._validate_and_extract_connections(connected_nodes)

            # Prepare tools and detect language
            tools_list = self._prepare_tools(tools)
            # Trace prepared tools for visibility
            try:
                tool_names = [getattr(t, "name", type(t).__name__) for t in (tools_list or [])]
                print(f"[TRACE][AGENT.TOOLS] prepared={len(tools_list)} tools={tool_names}")
            except Exception as e:
                print(f"[TRACE][AGENT.TOOLS] error listing tools: {e}")

            # CRITICAL FIX: Use templated inputs instead of extracting separately
            # The templating has already been applied to the 'inputs' parameter by node_executor.py
            user_input = self._extract_user_input_from_templated_inputs(runtime_inputs, inputs)
            detected_language = self._detect_user_language(user_input)

            # Create agent graph using new API (now with user_input for system prompt templating)
            agent_graph = self._create_agent(llm, tools_list, detected_language, memory, inputs)

            # Prepare final input and execute
            final_input = self._prepare_final_input_for_graph(user_input, memory)
            return self._execute_graph_with_error_handling(agent_graph, final_input, memory)

        return RunnableLambda(agent_executor_lambda)

    def _setup_encoding(self) -> None:
        """Setup UTF-8 encoding for Turkish character support."""
        try:
            # Force UTF-8 encoding for all string operations
            if hasattr(sys.stdout, 'reconfigure'):
                sys.stdout.reconfigure(encoding='utf-8')
            if hasattr(sys.stderr, 'reconfigure'):
                sys.stderr.reconfigure(encoding='utf-8')

            # Set environment variables for UTF-8 (Docker-compatible)
            os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
            os.environ.setdefault('LANG', 'C.UTF-8')
            os.environ.setdefault('LC_ALL', 'C.UTF-8')

            print(f"[DEBUG] Encoding setup completed - Default: {sys.getdefaultencoding()}")

        except Exception as encoding_error:
            print(f"[WARNING] Encoding setup failed: {encoding_error}")

    def _validate_and_extract_connections(self, connected_nodes: Dict[str, Runnable]) -> tuple:
        """Validate connections and extract LLM, tools, and memory components."""
        print(f"[DEBUG] Agent connected_nodes keys: {list(connected_nodes.keys())}")
        print(f"[DEBUG] Agent connected_nodes types: {[(k, type(v)) for k, v in connected_nodes.items()]}")

        llm = connected_nodes.get("llm")
        tools = connected_nodes.get("tools")
        memory = connected_nodes.get("memory")

        # Enhanced LLM validation
        self._validate_llm_connection(llm, connected_nodes)

        return llm, tools, memory

    def _validate_llm_connection(self, llm: Any, connected_nodes: Dict[str, Runnable]) -> None:
        """Validate that LLM connection is properly configured."""
        print(f"[DEBUG] LLM received: {type(llm)}")
        if llm is None:
            available_connections = list(connected_nodes.keys())
            raise ValueError(
                f"A valid LLM connection is required. "
                f"Available connections: {available_connections}. "
                f"Make sure to connect an OpenAI Chat node to the 'llm' input of this Agent."
            )

        if not isinstance(llm, BaseLanguageModel):
            raise ValueError(
                f"Connected LLM must be a BaseLanguageModel instance, got {type(llm)}. "
                f"Ensure the OpenAI Chat node is properly configured and connected."
            )

    def _extract_user_input(self, runtime_inputs: Any, inputs: Dict[str, Any]) -> str:
        """Extract user input from various input formats."""
        if isinstance(runtime_inputs, str):
            return runtime_inputs
        elif isinstance(runtime_inputs, dict):
            return runtime_inputs.get("input", inputs.get("input", ""))
        else:
            return inputs.get("input", "")

    def _extract_user_input_from_templated_inputs(self, runtime_inputs: Any, templated_inputs: Dict[str, Any]) -> str:
        """
        Extract user input from templated input fields.

        Logic:
        - Chat mode: user_prompt_template contains {{input}} which gets templated to actual user message
          -> Use templated user_prompt_template as the user input
        - StartNode mode: user_prompt_template is empty or not used
          -> Use the connected 'input' field directly

        This method ensures both modes work correctly.
        """
        # Get the templated user_prompt_template (this is where {{input}} becomes "actual message")
        templated_user_prompt = ""
        if isinstance(templated_inputs, dict):
            templated_user_prompt = templated_inputs.get("user_prompt_template", "").strip()

        # Get raw user_prompt_template from user_data
        raw_template = self.user_data.get("user_prompt_template", "").strip()

        # CHAT MODE: If user_prompt_template was successfully templated (contains actual content)
        # Use the templated value as user input
        if templated_user_prompt and raw_template:
            # Check if templating actually happened (value changed from raw template)
            if templated_user_prompt != raw_template and "{{" not in templated_user_prompt:
                print(f"[TEMPLATE] ReactAgent using templated user_prompt_template (Chat mode): '{templated_user_prompt[:50]}...'")
                return templated_user_prompt

        # STARTNODE MODE or FALLBACK: Use the connected 'input' field
        # Priority 1: templated 'input' field from connections
        if isinstance(templated_inputs, dict) and "input" in templated_inputs:
            templated_input = templated_inputs["input"]
            if isinstance(templated_input, str) and templated_input.strip():
                print(f"[TEMPLATE] ReactAgent using connected input (StartNode mode): '{templated_input[:50]}...'")
                return templated_input

        # Priority 2: runtime_inputs string
        if isinstance(runtime_inputs, str) and runtime_inputs.strip():
            print(f"[TEMPLATE] ReactAgent using runtime input: '{runtime_inputs[:50]}...'")
            return runtime_inputs

        # Priority 3: runtime_inputs dict
        if isinstance(runtime_inputs, dict):
            runtime_input = runtime_inputs.get("input", "")
            if runtime_input and isinstance(runtime_input, str):
                print(f"[TEMPLATE] ReactAgent using runtime dict input: '{runtime_input[:50]}...'")
                return runtime_input

        # Fallback: empty string (should not happen in normal flow)
        print(f"[TEMPLATE] ReactAgent: No user input found, using empty string")
        return ""

    def _detect_user_language(self, user_input: str) -> str:
        """Detect user's language with Turkish character safety."""
        try:
            detected_language = detect_language(user_input)
            return detected_language
        except UnicodeEncodeError as lang_error:
            print(f"[WARNING] Language detection encoding error: {lang_error}")
            print(f"[LANGUAGE DETECTION] Defaulting to Turkish due to encoding error")
            return 'tr'  # Default to Turkish for Turkish characters

    def _create_agent(self, llm: BaseLanguageModel, tools_list: list, detected_language: str, memory: Any = None, user_inputs: Dict[str, Any] = None) -> CompiledStateGraph:
        """Create the React agent with language-specific prompt using new LangGraph API."""
        # Create language-specific prompt
        agent_prompt = self._create_language_specific_prompt(tools_list, detected_language, user_inputs)
        
        # Create checkpointer for memory if memory is provided
        checkpointer = None
        if memory is not None:
            try:
                checkpointer = MemorySaver()
                print("   [MEMORY] Using MemorySaver checkpointer")
            except Exception as e:
                print(f"   [MEMORY] Failed to create checkpointer ({str(e)}), proceeding without memory")
        
        # Create the agent using new API
        agent_graph = create_react_agent(
            model=llm,
            tools=tools_list,
            prompt=agent_prompt,
            checkpointer=checkpointer,
            version="v2"
        )
        
        return agent_graph

    def _validate_memory(self, memory: Any) -> bool:
        """Validate memory component for graph-based execution."""
        try:
            if hasattr(memory, 'load_memory_variables'):
                test_vars = memory.load_memory_variables({})
                print("   [MEMORY] Valid memory object found")
                return True
            else:
                print("   [MEMORY] Invalid memory object, proceeding without memory")
                return False
        except Exception as e:
            print(f"   [MEMORY] Failed to validate ({str(e)}), proceeding without memory")
            return False

    def _prepare_final_input_for_graph(self, user_input: str, memory: Any) -> Dict[str, Any]:
        """Prepare the final input dictionary for graph execution using new state format."""
        # Load conversation history from memory
        conversation_history = self._load_conversation_history(memory)

        # Create messages list in the format expected by the new API
        messages = []

        # Add conversation history if available
        if conversation_history:
            # Parse conversation history and add to messages
            for line in conversation_history.split('\n'):
                if line.strip():
                    if line.startswith('Human:'):
                        messages.append(HumanMessage(content=line.replace('Human:', '').strip()))
                    elif line.startswith('Assistant:'):
                        # Skip assistant messages as they'll be regenerated
                        pass

        # Always add user input as HumanMessage
        # The _extract_user_input_from_templated_inputs method now correctly returns:
        # - For Chat mode: the templated user_prompt_template (e.g., "bana baklava tarifi")
        # - For StartNode mode: the connected input value
        if user_input and user_input.strip():
            print(f"[AGENT] Adding HumanMessage: '{user_input[:50]}...'")
            messages.append(HumanMessage(content=user_input))
        else:
            print(f"[AGENT] Warning: No user input to add as HumanMessage")

        return {
            "messages": messages
        }

    def _load_conversation_history(self, memory: Any) -> str:
        """Load and format conversation history from memory."""
        print(f"[AGENT MEMORY DEBUG] Starting memory history load")
        
        if memory is None:
            print("   [MEMORY] None")
            print("[AGENT MEMORY DEBUG] Memory object is None")
            return ""

        print(f"[AGENT MEMORY DEBUG] Memory object type: {type(memory)}")
        print(f"[AGENT MEMORY DEBUG] Memory object attributes: {dir(memory)}")

        try:
            # Check if memory has chat_memory attribute
            if hasattr(memory, 'chat_memory') and hasattr(memory.chat_memory, 'messages'):
                messages = memory.chat_memory.messages
                print(f"[AGENT MEMORY DEBUG] Direct access: {len(messages)} messages in chat_memory")
                
                if messages:
                    for i, msg in enumerate(messages[:3]):
                        msg_type = getattr(msg, 'type', 'unknown')
                        msg_content = getattr(msg, 'content', '')
                        print(f"[AGENT MEMORY DEBUG] Direct message {i+1}: type={msg_type}, content='{msg_content[:50]}...'")

            # Try to load memory variables
            print(f"[AGENT MEMORY DEBUG] Attempting to load memory variables...")
            memory_vars = memory.load_memory_variables({})
            print(f"[AGENT MEMORY DEBUG] Memory variables loaded: {list(memory_vars.keys()) if memory_vars else 'None'}")
            
            if not memory_vars:
                print("   [MEMORY] None")
                print("[AGENT MEMORY DEBUG] Memory variables are empty or None")
                return ""

            memory_key = getattr(memory, 'memory_key', 'memory')
            print(f"[AGENT MEMORY DEBUG] Using memory key: {memory_key}")
            
            if memory_key not in memory_vars:
                print("   [MEMORY] None")
                print(f"[AGENT MEMORY DEBUG] Memory key '{memory_key}' not found in variables: {list(memory_vars.keys())}")
                return ""

            history_content = memory_vars[memory_key]
            print(f"[AGENT MEMORY DEBUG] History content type: {type(history_content)}")
            print(f"[AGENT MEMORY DEBUG] History content length: {len(history_content) if hasattr(history_content, '__len__') else 'no length'}")
            
            formatted_history = self._format_conversation_history(history_content)
            print(f"[AGENT MEMORY DEBUG] Formatted history length: {len(formatted_history)} chars")
            
            return formatted_history

        except Exception as memory_error:
            print(f"   [WARNING] Failed to load memory variables: {memory_error}")
            import traceback
            print(f"[AGENT MEMORY DEBUG] Memory load error traceback: {traceback.format_exc()}")
            return ""

    def _format_conversation_history(self, history_content: Any) -> str:
        """Format conversation history into readable string."""
        if isinstance(history_content, list):
            formatted_history = []
            for msg in history_content:
                if hasattr(msg, 'type') and hasattr(msg, 'content'):
                    role = "Human" if msg.type == "human" else "Assistant"
                    formatted_history.append(f"{role}: {msg.content}")
                elif isinstance(msg, dict):
                    role = "Human" if msg.get('type') == 'human' else "Assistant"
                    formatted_history.append(f"{role}: {msg.get('content', '')}")

            if formatted_history:
                conversation_history = "\n".join(formatted_history[-10:])  # Last 10 messages
                print(f"   [MEMORY] Loaded conversation history: {len(formatted_history)} messages")
                return conversation_history

        elif isinstance(history_content, str) and history_content.strip():
            print(f"   [MEMORY] Loaded conversation history: {len(history_content)} chars")
            return history_content

        return ""

    def _execute_graph_with_error_handling(self, agent_graph: CompiledStateGraph, final_input: Dict[str, Any], memory: Any) -> Dict[str, Any]:
        """Execute the agent graph with comprehensive error handling."""
        try:

            result = agent_graph.invoke(final_input)
            
            # Extract the final message content from the result
            if 'messages' in result and result['messages']:
                last_ai_message = result['messages'][-1]
                output_content = last_ai_message.content if hasattr(last_ai_message, 'content') else str(last_ai_message)
                print(f"[AGENT OUTPUT] {output_content}")
                # Debug: Check memory after execution and save to database
                if memory:
                    try:
                        print("   [PERSIST] Persisting conversation to database via memory node...")
                        session_id = memory.memory_key

                        BufferMemoryNode().save_messages(session_id=session_id, messages=[last_ai_message])
                        print(f"   [SUCCESS] Conversation persisted for session {session_id[:8]}...")
                    except Exception as e:
                        print(f"   [ERROR] Failed to persist memory via _persist_to_database: {e}")


                return {"output": output_content}
            else:
                fallback_output = str(result)
                print(f"[AGENT OUTPUT] {fallback_output}")
                return {"output": fallback_output}

        except UnicodeEncodeError as unicode_error:
            print(f"[ERROR] Unicode encoding error: {unicode_error}")
            return self._handle_unicode_error(unicode_error)

        except Exception as e:
            error_msg = f"Agent graph execution failed: {str(e)}"
            print(f"[ERROR] {error_msg}")
            return {"error": error_msg}

    def _handle_unicode_error(self, unicode_error: UnicodeEncodeError) -> Dict[str, Any]:
        """Handle Unicode encoding errors with locale-specific fallback."""
        try:
            return {
                "error": f"Character encoding error: {str(unicode_error)}",
                "suggestion": "Please ensure characters are properly encoded or check system language settings."
            }
        except:
            return {"error": "Unicode encoding error occurred"}

    def _prepare_tools(self, tools_to_process: Any) -> list[BaseTool]:
        """Universal tool preparation using auto-discovery."""
        if not tools_to_process:
            return []
        
        tools_list = []
        tools_dict=tools_to_process
        if not isinstance(tools_to_process, dict):
            tools_dict=dict((key,d[key]) for d in tools_to_process for key in d)

        for tool_input in tools_dict:
            if isinstance(tools_dict[tool_input]['tool'], BaseTool):
                tools_list.append(tools_dict[tool_input]['tool'])
            else:
                # Use auto-discovery system
                converted_tool = self.auto_tool_manager.converter.convert_to_tool(tool_input)
                if converted_tool:
                    tools_list.append(converted_tool)
                    print(f"[TOOL] Auto-converted {type(tool_input).__name__} to tool: {converted_tool.name}")
        
        return tools_list

    def _create_prompt(self, tools: list[BaseTool]) -> ChatPromptTemplate:
        """
        Legacy method for backward compatibility. Creates a unified ReAct-compatible prompt.
        """
        return self._create_language_specific_prompt(tools, 'en')  # Default to English

    def _create_language_specific_prompt(self, tools: list[BaseTool], language_code: str, user_inputs: Dict[str, Any] = None) -> ChatPromptTemplate:
        """
        Creates a language-specific ChatPromptTemplate compatible with the new API.
        Uses custom prompt_instructions if provided, otherwise falls back to smart orchestration.
        Now supports user prompt templating within system prompt.
        """
        # Get system_prompt from user_inputs (which has been templated) instead of self.user_data
        custom_instructions = ""
        if user_inputs and isinstance(user_inputs, dict):
            custom_instructions = user_inputs.get("system_prompt", "").strip()
        if not custom_instructions:
            # Fallback to self.user_data if not in user_inputs
            custom_instructions = self.user_data.get("system_prompt", "").strip()

        # Get user_prompt_template from user_inputs (which has been templated) instead of self.user_data
        user_prompt_template = ""
        if user_inputs and isinstance(user_inputs, dict):
            user_prompt_template = user_inputs.get("user_prompt_template", "").strip()
        if not user_prompt_template:
            # Fallback to self.user_data if not in user_inputs
            user_prompt_template = self.user_data.get("user_prompt_template", "").strip()

        # If user_prompt_template is provided, integrate it into system prompt
        # Note: user_prompt_template has already been templated by node_executor.py
        if user_prompt_template:
            print(f"[TEMPLATE] Using templated user prompt: '{user_prompt_template[:50]}...'")
            # Add templated user prompt to system instructions
            custom_instructions += f"\n\nUser Input: {user_prompt_template}"
        # Get language-specific system context
        language_specific_context = get_language_specific_prompt(language_code)

        # Build dynamic, intelligent prompt based on available components
        system_content = self._build_intelligent_system_prompt(custom_instructions, language_specific_context, language_code)

        # Create a ChatPromptTemplate that works with the new API
        return ChatPromptTemplate.from_messages([
            ("system", system_content),
            ("placeholder", "{messages}")
        ])

    def _build_intelligent_system_prompt(self, custom_instructions: str, base_system_context: str, language_code: str = 'en') -> str:
        """
        Builds an intelligent, dynamic system prompt that adapts to available tools, memory, and custom instructions.
        This creates a context-aware agent that understands its capabilities and constraints with mandatory language enforcement.
        The new API handles ReAct formatting automatically, so we focus on system instructions.
        """

        # === SIMPLE IDENTITY SECTION ===
        if custom_instructions:
            identity_section = f"{custom_instructions}\n\n{base_system_context}"
        else:
            identity_section = base_system_context

        # Language-specific guidelines - SIMPLIFIED FOR NEW API
        language_guidelines = {
            'tr': "Kullanıcıya DETAYLI, ADIM ADIM ve AÇIKLAYICI cevaplar ver! Mevcut araçları kullanarak bulunan bilgileri kapsamlı şekilde sun. Her zaman kullanıcının dilinde, anlaşılır ve yardımcı ol!",
            'en': "Provide DETAILED, STEP-BY-STEP and COMPREHENSIVE answers to users! Use available tools to gather information and present findings thoroughly. Always respond in user's language, clearly and helpfully!",
            'de': "Geben Sie DETAILLIERTE, SCHRITTWEISE und UMFASSENDE Antworten! Verwenden Sie verfügbare Tools zur Informationsbeschaffung und präsentieren Sie Ergebnisse gründlich. Antworten Sie immer in der Sprache des Benutzers, klar und hilfreich!",
            'fr': "Fournissez des réponses DÉTAILLÉES, ÉTAPE PAR ÉTAPE et COMPLÈTES! Utilisez les outils disponibles pour collecter des informations et présentez les résultats de manière approfondie. Répondez toujours dans la langue de l'utilisateur, clairement et utilement!",
            'es': "¡Proporciona respuestas DETALLADAS, PASO A PASO y COMPLETAS! ¡Usa herramientas disponibles para recopilar información y presenta los hallazgos exhaustivamente! ¡Responde siempre en el idioma del usuario, claramente y de manera útil!",
            'it': "Fornisci risposte DETTAGLIATE, PASSO DOPO PASSO e COMPLETE! Usa strumenti disponibili per raccogliere informazioni e presenta i risultati in modo approfondito! Rispondi sempre nella lingua dell'utente, chiaramente e in modo utile!",
            'pt': "Forneça respostas DETALHADAS, PASSO A PASSO e COMPLETAS! Use ferramentas disponíveis para coletar informações e apresente os achados exaustivamente! Responda sempre no idioma do usuário, claramente e de maneira útil!",
            'ru': "Предоставляйте ПОДРОБНЫЕ, ПОШАГОВЫЕ и КОМПЛЕКСНЫЕ ответы! Используйте доступные инструменты для сбора информации и представляйте результаты исчерпывающе! Всегда отвечайте на языке пользователя, ясно и полезно!",
            'ar': "قدم إجابات مفصلة وشاملة وخطوة بخطوة! استخدم الأدوات المتاحة لجمع المعلومات وقدم النتائج بشكل شامل! أجب دائماً بلغة المستخدم بوضوح ومساعدة!",
            'zh': "提供详细、逐步和全面的回答！使用可用工具收集信息并全面展示发现！始终用用户的语言清晰有帮助地回答！",
            'ja': "詳細で段階的かつ包括的な回答を提供してください！利用可能なツールを使用して情報を収集し、発見を徹底的に提示してください！常にユーザーの言語で明確かつ有用に回答してください！",
            'ko': "상세하고 단계별이며 포괄적인 답변을 제공하십시오! 사용 가능한 도구를 사용하여 정보를 수집하고 발견사항을 철저히 제시하십시오! 항상 사용자의 언어로 명확하고 도움이 되게 답변하십시오!",
            'hi': "विस्तृत, चरणबद्ध और व्यापक उत्तर प्रदान करें! जानकारी एकत्र करने के लिए उपलब्ध उपकरणों का उपयोग करें और निष्कर्षों को पूरी तरह से प्रस्तुत करें! हमेशा उपयोगकर्ता की भाषा में स्पष्ट और सहायक रूप से उत्तर दें!",
            'fa': "پاسخ‌های مفصل، گام به گام و جامع ارائه دهید! از ابزارهای موجود برای جمع‌آوری اطلاعات استفاده کنید و یافته‌ها را به طور کامل ارائه دهید! همیشه به زبان کاربر، واضح و مفید پاسخ دهید!"
        }

        simplified_guidelines = language_guidelines.get(language_code, language_guidelines['en'])

        # === COMBINE SECTIONS FOR NEW API ===
        full_prompt = f"""
{identity_section}

{simplified_guidelines}

When using tools, always provide comprehensive explanations of what you found and how it relates to the user's question.
"""

        return full_prompt.strip()

    def _save_conversation_to_database(self, session_id: str, user_content: str, ai_content: str, user_id: str):
        """Save conversation to database through memory service"""
        try:
            # Import database service
            from app.services.memory import db_memory_store
            
            if db_memory_store:
                result = db_memory_store.save_session_memory(
                    session_id=session_id,
                    user_input=user_content,
                    ai_response=ai_content,
                    user_id=user_id,
                    metadata={
                        'source': 'react_agent',
                        'agent_type': 'react_agent_node',
                        'timestamp': str(__import__('datetime').datetime.now())
                    }
                )
                if result:
                    print(f"   [SUCCESS] Database save successful: {result[:8]}...")
                else:
                    print(f"   [ERROR] Database save failed: empty result")
            else:
                print(f"   [WARNING] Database store not available")
                
        except Exception as e:
            print(f"   [WARNING] Database save exception: {e}")

# Alias for frontend compatibility
ToolAgentNode = ReactAgentNode
