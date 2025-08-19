export interface WebScraperNodeProps {
  data: WebScraperData;
  id: string;
}

export interface WebScraperData {
  urls?: string;
  input_urls?: string[];
  user_agent?: string;
  remove_selectors?: string;
  min_content_length?: number;
  max_concurrent?: number;
  timeout_seconds?: number;
  retry_attempts?: number;
  tavily_api_key?: string;
  credential_id?: string;
  validationStatus?: "success" | "error" | "warning" | "pending";
  displayName?: string;
  name?: string;
}

export interface ScrapedDocument {
  url: string;
  title?: string;
  content: string;
  contentLength: number;
  domain: string;
  scrapedAt: string;
  status: "success" | "failed" | "processing";
}

export interface ScrapingProgress {
  totalUrls: number;
  completedUrls: number;
  failedUrls: number;
  currentUrl?: string;
  startTime: Date;
  estimatedTimeRemaining: number;
  avgProcessingTime: number;
  totalContentExtracted: number;
}

export interface WebScraperConfig {
  urls: string;
  tavily_api_key: string;
  credential_id?: string;
  remove_selectors: string;
  min_content_length: number;
  user_agent: string;
  max_concurrent: number;
  timeout_seconds: number;
  retry_attempts: number;
} 