// OpenAIEmbeddingsNode/types.ts
export interface OpenAIEmbeddingsConfig {
    embed_model: string;
    openai_api_key: string;
    batch_size: number;
    max_retries: number;
  }
  