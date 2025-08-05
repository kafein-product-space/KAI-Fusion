import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSnackbar } from "notistack";
import WebScraperVisual from "./WebScraperVisual";
import WebScraperConfigForm from "./WebScraperConfigForm";
import { WebScraperNodeProps, ScrapedDocument, ScrapingProgress, WebScraperConfig } from "./types";

export default function WebScraperNode({ data, id }: WebScraperNodeProps) {
  const { setNodes, getEdges, getNodes } = useReactFlow();
  const { enqueueSnackbar } = useSnackbar();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedDocuments, setScrapedDocuments] = useState<ScrapedDocument[]>([]);
  const [progress, setProgress] = useState<ScrapingProgress | null>(null);
  const [previewContent, setPreviewContent] = useState<any>(null);
  const [configData, setConfigData] = useState<WebScraperConfig>(data as WebScraperConfig);

  const handleSaveConfig = useCallback(
    (values: Partial<WebScraperConfig>) => {
      console.log("handleSaveConfig called with values:", values);
      try {
        // Update the node data
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...values } }
              : node
          )
        );

        // Update local config data for persistence
        setConfigData((prev) => ({ ...prev, ...values }));

        // Close config mode
        setIsConfigMode(false);

        // Show success notification
        enqueueSnackbar(
          "Web Scraper configuration saved successfully!",
          {
            variant: "success",
            autoHideDuration: 3000,
          }
        );
      } catch (error) {
        console.error("Error saving configuration:", error);
        enqueueSnackbar("Failed to save configuration. Please try again.", {
          variant: "error",
          autoHideDuration: 4000,
        });
      }
    },
    [setNodes, id, enqueueSnackbar]
  );

  const handleCancel = useCallback(() => {
    setIsConfigMode(false);
    enqueueSnackbar("Configuration cancelled", {
      variant: "info",
      autoHideDuration: 2000,
    });
  }, [enqueueSnackbar]);

  const handleOpenConfig = () => {
    setIsConfigMode(true);
  };

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  // Input edge'lerinden gelen verileri al
  const getInputData = () => {
    const nodes = getNodes();
    const edges = getEdges();
    const inputEdges = edges.filter((edge) => edge.target === id);
    const inputData: any = {};

    inputEdges.forEach((edge) => {
      const sourceNode = nodes.find((node) => node.id === edge.source);
      if (sourceNode && sourceNode.data) {
        if (edge.targetHandle === "urls") {
          inputData.urls =
            sourceNode.data.output ||
            sourceNode.data.urls ||
            sourceNode.data.content;
        } else if (edge.targetHandle === "config") {
          inputData.config =
            sourceNode.data.output || sourceNode.data.config || sourceNode.data;
        }
      }
    });

    return inputData;
  };

  const scrapeUrls = async () => {
    const inputData = getInputData();
    const urlsToScrape = inputData.urls || data?.urls || data?.input_urls;

    if (!urlsToScrape) {
      console.error("No URLs to scrape");
      return;
    }

    setIsScraping(true);
    setScrapedDocuments([]);
    setProgress(null);

    try {
      const response = await fetch(`/api/web-scraper/${id}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls:
            typeof urlsToScrape === "string"
              ? urlsToScrape
              : urlsToScrape.join("\n"),
          input_urls: Array.isArray(urlsToScrape) ? urlsToScrape : [],
          user_agent:
            inputData.config?.user_agent ||
            data?.user_agent ||
            "Default KAI-Fusion",
          remove_selectors:
            inputData.config?.remove_selectors || data?.remove_selectors || "",
          min_content_length:
            inputData.config?.min_content_length ||
            data?.min_content_length ||
            100,
          max_concurrent:
            inputData.config?.max_concurrent || data?.max_concurrent || 5,
          timeout_seconds:
            inputData.config?.timeout_seconds || data?.timeout_seconds || 30,
          retry_attempts:
            inputData.config?.retry_attempts || data?.retry_attempts || 3,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setScrapedDocuments(result.documents || []);
        setProgress(result.progress);
      } else {
        const errorData = await response.json();
        console.error("Scraping failed:", errorData.error);
      }
    } catch (err) {
      console.error("Network error during scraping:", err);
    } finally {
      setIsScraping(false);
    }
  };

  const previewUrl = async (url: string) => {
    try {
      const response = await fetch(`/api/web-scraper/${id}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          remove_selectors: data.remove_selectors || "",
          min_content_length: data.min_content_length || 100,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewContent(result);
      }
    } catch (err) {
      console.error("Preview failed:", err);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`${type} copied to clipboard`);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Enhanced validation function
  const validate = (values: Partial<WebScraperConfig>) => {
    console.log("Validating values:", values);
    const errors: any = {};

    // Required validations
    if (!values.urls || values.urls.trim() === "") {
      errors.urls = "URLs are required";
    }

    return errors;
  };

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  return (
    <>
      {isConfigMode ? (
        <WebScraperConfigForm
          initialValues={configData}
          validate={validate}
          onSubmit={handleSaveConfig}
          onCancel={handleCancel}
          onScrapeUrls={scrapeUrls}
          onPreviewUrl={previewUrl}
          onCopyToClipboard={copyToClipboard}
          isScraping={isScraping}
          scrapedDocuments={scrapedDocuments}
          progress={progress}
        />
      ) : (
        <WebScraperVisual
          data={data}
          id={id}
          isHovered={isHovered}
          isScraping={isScraping}
          scrapedDocuments={scrapedDocuments}
          progress={progress}
          onOpenConfig={handleOpenConfig}
          onDeleteNode={handleDeleteNode}
          onScrapeUrls={scrapeUrls}
          onPreviewUrl={previewUrl}
          onCopyToClipboard={copyToClipboard}
          getEdges={getEdges}
        />
      )}
    </>
  );
} 