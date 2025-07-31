# KAI-Fusion End-to-End Test Scenarios

This document describes the end-to-end test scenarios for validating the two main workflows in the KAI-Fusion platform.

## Workflow 1: Document Ingestion Pipeline

### Overview
This workflow handles the complete document ingestion process from web scraping to vector storage:

```
TimerStartNode → StartNode → WebScraperNode → ChunkSplitterNode → 
OpenAIEmbedderNode → PGVectorStoreNode → EndNode
```

With `OpenAIEmbedderNode` connected to `PGVectorStoreNode` for embeddings.

### Test Scenarios

#### 1. Workflow Validation
- **Objective**: Ensure the workflow template is structurally valid
- **Pass Criteria**: 
  - All required nodes are present
  - All connections are valid
  - No circular dependencies
  - Workflow can be parsed by the engine

#### 2. Data Flow Validation
- **Objective**: Verify data flows correctly between nodes
- **Pass Criteria**:
  - WebScraperNode produces valid Document objects
  - ChunkSplitterNode creates appropriate chunks
  - OpenAIEmbedderNode generates embeddings successfully
  - PGVectorStoreNode stores vectors correctly
  - EndNode receives final output

#### 3. Performance Testing
- **Objective**: Ensure workflow meets performance requirements
- **Pass Criteria**:
  - Total execution time < 60 seconds for typical documents
  - Memory usage stays within limits
  - No resource leaks during execution

#### 4. Error Handling
- **Objective**: Verify graceful error handling
- **Pass Criteria**:
  - Invalid URLs are handled gracefully
  - Network errors are retried appropriately
  - Invalid document formats are skipped
  - Workflow terminates cleanly on errors

### Validation Functions
The following validation functions are used to check data flow integrity:

1. `validate_ingestion_data_flow()` - Validates data flow between ingestion nodes
2. `validate_workflow_integrity()` - Validates overall workflow structure

## Workflow 2: Document Query Pipeline

### Overview
This workflow handles document querying using a retrieval-augmented generation approach:

```
StartNode → ReactAgentNode → EndNode
```

With `OpenAINode`, `EnhancedBufferMemoryNode`, and `RetrieverNode` connected to `ReactAgentNode`.

### Test Scenarios

#### 1. Workflow Validation
- **Objective**: Ensure the workflow template is structurally valid
- **Pass Criteria**: 
  - All required nodes are present
  - Agent has connections to LLM, memory, and tools
  - All connections are valid
  - No circular dependencies

#### 2. Agent Integration Testing
- **Objective**: Verify agent works with all connected components
- **Pass Criteria**:
  - Agent can access LLM for generation
  - Agent can use memory for context
  - Agent can use retriever for document search
  - Agent produces coherent responses

#### 3. Retrieval-Augmented Generation (RAG)
- **Objective**: Ensure RAG functionality works correctly
- **Pass Criteria**:
  - Retriever finds relevant documents
  - Agent incorporates retrieved information
  - Responses are factually accurate
  - Citations are properly formatted

#### 4. Conversation Memory
- **Objective**: Verify conversation context is maintained
- **Pass Criteria**:
  - Previous messages are stored in memory
  - Context is used in subsequent queries
  - Memory is cleared appropriately
  - No memory leaks between sessions

### Validation Functions
The following validation functions are used to check data flow integrity:

1. `validate_query_data_flow()` - Validates data flow between query nodes
2. `validate_workflow_integrity()` - Validates overall workflow structure

## Pass/Fail Criteria

### Overall Success Criteria
A test scenario is considered successful if:
1. All validation functions return `valid: true`
2. No critical errors are reported
3. All required nodes execute successfully
4. Data flows correctly between all connected nodes
5. Performance metrics are within acceptable ranges

### Failure Conditions
A test scenario is considered failed if:
1. Any validation function returns `valid: false`
2. Critical errors prevent workflow execution
3. Required nodes fail to execute
4. Data flow is broken between nodes
5. Performance degrades beyond acceptable limits

### Warning Conditions
Warnings do not fail tests but indicate potential issues:
1. Suboptimal performance metrics
2. Missing optional components
3. Non-critical validation issues
4. Unexpected but non-breaking behavior

## Test Execution

### Running the Tests
```bash
# Run all workflow tests
python -m pytest backend/tests/test_workflow_1.py -v
python -m pytest backend/tests/test_workflow_2.py -v

# Run specific test scenarios
python -m pytest backend/tests/test_workflow_1.py::TestWorkflow1Ingestion::test_data_flow_validation -v
python -m pytest backend/tests/test_workflow_2.py::TestWorkflow2Query::test_agent_integration -v
```

### Test Results Analysis
Test results are automatically analyzed by the test framework and stored in:
- `backend/tests/test_results/` - Individual test run results
- `backend/tests/test_results/analysis.json` - Aggregated analysis

### Performance Metrics
Key performance metrics tracked:
1. **Execution Time**: Total time for workflow completion
2. **Memory Usage**: Peak memory consumption during execution
3. **Throughput**: Documents processed per second
4. **Success Rate**: Percentage of successful executions
5. **Error Rate**: Percentage of failed executions

## Integration with Existing Test Framework

These test scenarios integrate with the existing KAI-Fusion testing framework:
- Compatible with `test_runner.py` for workflow execution
- Compatible with `test_analyzer.py` for result analysis
- Follows existing naming conventions and structure
- Uses existing mock and validation patterns

## Future Enhancements

Planned improvements to the test scenarios:
1. Add stress testing with large document sets
2. Add integration testing with real PostgreSQL databases
3. Add performance regression testing
4. Add security testing for API key handling
5. Add cross-platform compatibility testing