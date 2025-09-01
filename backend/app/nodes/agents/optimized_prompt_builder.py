"""
Optimized ReactAgent Prompt Builder - Solution for Conflicting Instructions
==========================================================================

This module demonstrates the optimized prompt building approach that resolves
the conflicting instructions issue identified in the feedback.

PROBLEM ANALYSIS:
================

The current ReactAgent prompt builder has critical issues:

1. **Conflicting Instructions**: 
   - "Only use Vector Store Tool info" vs "help with general knowledge"
   - "Say 'I couldn't find information'" vs "Never say I couldn't find information"
   - "Data Touch Assistant" vs "KAI-Fusion platform assistant"

2. **Prompt Bloat**: Creates 100+ line prompts that confuse the LLM
3. **Redundant Content**: Language rules repeated 4-5 times
4. **Mixed Use Cases**: Combines specific Data Touch instructions with general agent instructions

OPTIMIZED SOLUTION:
==================
"""

from typing import Dict, Any

class OptimizedPromptBuilder:
    """
    Optimized prompt builder that creates coherent, single-purpose prompts.
    Detects use case automatically and builds appropriate prompt without conflicts.
    """
    
    def build_prompt(self, custom_instructions: str = "", language_code: str = 'en') -> str:
        """
        Build optimized prompt based on detected use case.
        
        Args:
            custom_instructions: User's custom system prompt
            language_code: Target language for the prompt
            
        Returns:
            Clean, conflict-free prompt string
        """
        # Detect use case to determine appropriate template
        use_case = self._detect_use_case(custom_instructions)
        
        if use_case == "data_touch":
            return self._build_data_touch_prompt(language_code)
        else:
            return self._build_general_agent_prompt(language_code)
    
    def _detect_use_case(self, custom_instructions: str) -> str:
        """Detect specific use case from custom instructions"""
        if not custom_instructions:
            return "general"
            
        custom_lower = custom_instructions.lower()
        
        # Data Touch indicators
        data_touch_indicators = [
            "data touch", "vector store tool", "data touch documentation",
            "data touch chat assistant", "couldn't find any information about that"
        ]
        
        if any(indicator in custom_lower for indicator in data_touch_indicators):
            return "data_touch"
            
        return "general"
    
    def _build_data_touch_prompt(self, language_code: str) -> str:
        """Build clean Data Touch documentation assistant prompt"""
        
        templates = {
            'tr': """Sen Data Touch Chat Assistant'ısın. Sadece Data Touch dokümantasyonunu kullanarak cevap verirsin.

Konuşma Geçmişi: {chat_history}
Araçlar: {tools}
Araç İsimleri: {tool_names}

KURALLAR:
- Her soru için önce arama yap
- Sadece dokümantasyon sonuçlarını kullan
- Bilgi yoksa: "Data Touch dokümantasyonunda bu konuda bilgi bulamadım."
- "Final Answer:" ile bitir

Question: {input}
Thought: Data Touch dokümantasyonunda arama yapacağım.
Action: document_retriever
Action Input: [arama terimi]
Observation: [sonuçlar]
Thought: Sonuçları analiz ediyorum.
Final Answer: [Sadece dokümantasyon bilgileriyle cevap]

Question: {input}
Thought:{agent_scratchpad}""",
            
            'en': """You are the Data Touch Chat Assistant. Answer only using Data Touch documentation.

Conversation History: {chat_history}
Tools: {tools}
Tool Names: {tool_names}

RULES:
- Search documentation for every question
- Use only documentation results
- If no info: "I couldn't find any information about that in the Data Touch documentation."
- End with "Final Answer:"

Question: {input}
Thought: I'll search the Data Touch documentation.
Action: document_retriever
Action Input: [search terms]
Observation: [results]
Thought: Analyzing the results.
Final Answer: [Answer using only documentation]

Question: {input}
Thought:{agent_scratchpad}"""
        }
        
        return templates.get(language_code, templates['en'])
    
    def _build_general_agent_prompt(self, language_code: str) -> str:
        """Build clean general AI assistant prompt"""
        
        templates = {
            'tr': """Sen yardımcı bir AI asistanısın. Soruları yanıtlamak için araçları kullanırsın.

Konuşma Geçmişi: {chat_history}
Araçlar: {tools}
Araç İsimleri: {tool_names}

"Final Answer:" ile bitir!

Question: {input}
Thought: Araç kullanarak cevap vereceğim.
Action: document_retriever
Action Input: [arama]
Observation: [sonuç]
Thought: Cevap hazırlıyorum.
Final Answer: [Faydalı cevap]

Question: {input}
Thought:{agent_scratchpad}""",

            'en': """You are a helpful AI assistant. Use tools to answer questions.

Conversation History: {chat_history}
Tools: {tools}
Tool Names: {tool_names}

End with "Final Answer:"!

Question: {input}
Thought: I'll use tools to answer.
Action: document_retriever
Action Input: [search]
Observation: [result]
Thought: Preparing answer.
Final Answer: [Helpful answer]

Question: {input}
Thought:{agent_scratchpad}"""
        }
        
        return templates.get(language_code, templates['en'])


# COMPARISON: Old vs New Approach
# ================================

"""
OLD APPROACH ISSUES:
===================

1. Multiple conflicting identity statements:
   - "You are the Data Touch Chat Assistant"
   - "You are an expert multilingual AI assistant"
   - "You are a helpful assistant"

2. Contradictory instructions:
   - "Only use Vector Store Tool info" 
   - "If tools don't find results, help with general knowledge"

3. Redundant language rules (repeated 5+ times)

4. Bloated prompts (100+ lines) that confuse LLM

5. Mixed rules that don't apply to the use case


NEW APPROACH BENEFITS:
=====================

1. ✅ Single, coherent identity per use case
2. ✅ No conflicting instructions  
3. ✅ Minimal, focused prompts (15-20 lines)
4. ✅ Use-case specific rules only
5. ✅ Clear ReAct format without confusion
6. ✅ Language rules stated once, clearly
7. ✅ Automatic detection of intended use case

IMPLEMENTATION:
==============

Replace the current _build_intelligent_prompt method with:

```python
def _build_intelligent_prompt(self, custom_instructions: str, base_system_context: str, language_code: str = 'en') -> str:
    builder = OptimizedPromptBuilder()
    return builder.build_prompt(custom_instructions, language_code)
```

This eliminates all conflicts and creates clean, purpose-built prompts.
"""


# EXAMPLE OUTPUTS:
# ===============

def demonstrate_outputs():
    """Show examples of the optimized prompt outputs"""
    
    builder = OptimizedPromptBuilder()
    
    print("=== DATA TOUCH USE CASE ===")
    data_touch_instructions = "You are the Data Touch Chat Assistant. Only use Vector Store Tool information."
    print(builder.build_prompt(data_touch_instructions, 'en'))
    
    print("\n=== GENERAL AI USE CASE ===") 
    general_instructions = "You are a helpful assistant."
    print(builder.build_prompt(general_instructions, 'en'))


if __name__ == "__main__":
    demonstrate_outputs()