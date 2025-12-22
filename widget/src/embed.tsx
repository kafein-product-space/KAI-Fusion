import React from "react";
import ReactDOM from "react-dom/client";
import KaiChatWidget, { KaiChatWidgetProps } from "./KaiChatWidget";
// @ts-ignore
import styles from "./index.css?inline";

declare global {
  interface Window {
    KaiChat: {
      init: (config: KaiChatWidgetProps) => void;
    };
  }
}

const KAI_CHAT_HOST_ID = "kai-chat-widget-host";

function init(config: KaiChatWidgetProps) {
  if (document.getElementById(KAI_CHAT_HOST_ID)) {
    return;
  }

  const host = document.createElement("div");
  host.id = KAI_CHAT_HOST_ID;
  
  host.style.position = "fixed";
  host.style.zIndex = "2147483647";
  host.style.bottom = "0";
  host.style.right = "0"; 
  host.style.width = "0";
  host.style.height = "0";
  host.style.overflow = "visible";

  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const styleTag = document.createElement("style");
  styleTag.textContent = styles;
  shadow.appendChild(styleTag);

  const mountPoint = document.createElement("div");
  mountPoint.id = "kai-chat-root";
  shadow.appendChild(mountPoint);

  const root = ReactDOM.createRoot(mountPoint);
  root.render(
    <React.StrictMode>
      <KaiChatWidget {...config} />
    </React.StrictMode>
  );
}

// Global scope'a bağla
window.KaiChat = { init };

// OTOMATİK BAŞLATMA MANTIĞI
// Mevcut çalışan scripti bul (genellikle son eklenen scripttir veya src ile aranabilir)
// document.currentScript modern tarayıcılarda çalışır.
const currentScript = document.currentScript as HTMLScriptElement;

if (currentScript) {
  const title = currentScript.getAttribute("data-title");
  const authToken = currentScript.getAttribute("data-auth-token");
  const workflowId = currentScript.getAttribute("data-workflow-id");
  const targetUrl = currentScript.getAttribute("data-target-url");
  const position = currentScript.getAttribute("data-position") as "left" | "right" | null;
  const color = currentScript.getAttribute("data-color");

  // Eğer gerekli parametreler varsa otomatik başlat
  if (workflowId && targetUrl) {
    // DOM hazır olana kadar bekle
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        init({
          title: title || "ChatBot",
          authToken: authToken || "",
          workflowId,
          targetUrl,
          position: position || "right",
          color: color || "#526cfe",
        });
      });
    } else {
      init({
        title: title || "ChatBot",
        authToken: authToken || "",
        workflowId,
        targetUrl,
        position: position || "right",
        color: color || "#526cfe",
      });
    }
  }
}
