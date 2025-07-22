# Design Document

## Overview

The ReactAgent node failure is caused by a mismatch between the custom prompt template format and LangChain's `create_react_agent` function requirements. The solution involves restructuring the prompt template to be compatible with LangChain's ReAct agent format while maintaining the existing functionality and customization capabilities.

## Architecture

### Current Problem Analysis

The current implementation creates a custom prompt template that doesn't align with LangChain's expected format:

1. **Missing Required Variables**: The `create_react_agent` function expects specific variables (`tool_names`, `tools`, `agent_scratchpad`) to be present in the prompt template
2. **Incorrect Template Structure**: The custom template format doesn't follow LangChain's ReAct agent conventions
3. **Variable Population Issues**: The system isn't properly populating the required variables before passing them to the agent

### Solution Architecture

The fix involves three main components:

1. **Prompt Template Restructuring**: Modify the `_create_prompt` method to generate LangChain-compatible templates
2. **Variable Preparation**: Ensure all required variables are properly prepared and passed to the agent
3. **Input Processing**: Improve input handling to work seamlessly with the ReAct format

## Components and Interfaces

### 1. ReactAgentNode Class

**Modified Methods:**
- `_create_prompt()`: Generate LangChain-compatible ReAct prompt templates
- `execute()`: Properly prepare variables for the agent executor
- `_prepare_agent_inputs()`: New method to format inputs correctly

**Key Changes:**
```python
def _create_prompt(self, tools: list[BaseTool]) -> PromptTemplate:
    # Use LangChain's standard ReAct format
    # Include all required variables: {tools}, {tool_names}, {agent_scratchpad}
    # Maintain custom instruction support
```

### 2. Prompt Template Structure

**Standard LangChain ReAct Format:**
```
Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}
```

### 3. Variable Preparation System

**Required Variables:**
- `tools`: Formatted string of available tools with descriptions
- `tool_names`: Comma-separated list of tool names
- `agent_scratchpad`: Placeholder for agent's reasoning steps
- `input`: User's input question/request

## Data Models

### Input Processing Model

```python
@dataclass
class AgentInputs:
    input: str
    tools: List[BaseTool]
    tool_names: List[str]
    memory_context: str
    custom_instructions: Optional[str] = None
```

### Prompt Template Model

```python
@dataclass
class ReActPromptTemplate:
    system_context: str
    tool_format: str
    instruction_format: str
    required_variables: List[str] = field(default_factory=lambda: ["tools", "tool_names", "agent_scratchpad", "input"])
```

## Error Handling

### 1. Template Validation

- Validate that all required variables are present in the template
- Check template format compatibility with LangChain
- Provide clear error messages for missing variables

### 2. Input Validation

- Ensure tools are properly formatted as BaseTool instances
- Validate that tool names are extracted correctly
- Handle cases where no tools are provided

### 3. Execution Error Handling

- Catch and handle LangChain-specific errors
- Provide fallback behavior for agent execution failures
- Log detailed error information for debugging

## Testing Strategy

### 1. Unit Tests

**Template Generation Tests:**
- Test prompt template creation with various tool configurations
- Verify all required variables are included
- Test custom instruction integration

**Input Processing Tests:**
- Test different input formats (string, dict)
- Verify tool preparation and formatting
- Test memory context integration

### 2. Integration Tests

**Agent Execution Tests:**
- Test full agent execution with different tool combinations
- Verify ReAct reasoning cycle works correctly
- Test memory persistence across interactions

**Error Handling Tests:**
- Test behavior with missing tools
- Test invalid input handling
- Test prompt template validation

### 3. Compatibility Tests

**LangChain Compatibility:**
- Test with different LangChain versions
- Verify create_react_agent function compatibility
- Test with various tool types

## Implementation Plan

### Phase 1: Core Template Fix
1. Modify `_create_prompt` method to use LangChain standard format
2. Ensure all required variables are included
3. Test basic agent execution

### Phase 2: Enhanced Input Processing
1. Improve input handling and validation
2. Add proper error handling and logging
3. Test with various input scenarios

### Phase 3: Custom Instruction Support
1. Integrate custom instructions into standard format
2. Maintain backward compatibility
3. Add comprehensive testing

### Phase 4: Memory and Tool Integration
1. Enhance memory context formatting
2. Improve tool description generation
3. Test full workflow integration

## Performance Considerations

- **Template Caching**: Cache generated templates to avoid regeneration
- **Input Validation**: Minimize validation overhead during execution
- **Error Recovery**: Quick fallback mechanisms for common errors
- **Memory Usage**: Efficient memory context formatting

## Security Considerations

- **Input Sanitization**: Sanitize user inputs to prevent prompt injection
- **Tool Access Control**: Ensure tools are properly validated before use
- **Memory Privacy**: Protect sensitive information in memory context
- **Error Information**: Avoid exposing sensitive data in error messages