// KAI-Fusion Docs Chat Widget
// Lightweight embeddable widget that injects a floating button and a toggleable chat panel.
// Usage (on your docs site):
// <script src="https://your-runtime-host/static/widget.js"
//         data-chat-url="https://your-runtime-host/chat"
//         data-label="💬" data-color="#2563eb"
//         data-width="380px" data-height="560px"
//         data-position="right" data-open="false"></script>

(function () {
  try {
    var currentScript =
      document.currentScript ||
      (function () {
        var scripts = document.getElementsByTagName("script");
        return scripts[scripts.length - 1];
      })();

    // Read configuration from data-* attributes
    var ds =
      currentScript && currentScript.dataset ? currentScript.dataset : {};

    // Get current domain for cache key
    var currentDomain = window.location.hostname;

    // API Configuration
    var apiUrl = ds.apiUrl || ds.chatUrl;
    var apiKey = ds.apiKey || "";

    // If no API URL provided, use script src origin
    if (!apiUrl) {
      try {
        var srcUrl = new URL(currentScript.src);
        apiUrl = srcUrl.origin;
      } catch (e) {
        apiUrl = window.location.origin;
      }
    }

    // Create chat URL - point to the main app root for iframe
    var chatUrl = apiUrl;

    var widgetId = ds.id || "kai-docs-chat-widget";
    var buttonId = widgetId + "-button";
    var panelId = widgetId + "-panel";
    var headerId = widgetId + "-header";
    var iframeId = widgetId + "-iframe";

    var label = ds.label || "💬";
    var color = ds.color || "#2563eb";
    var width = ds.width || "500px";
    var height = ds.height || "650px";
    var position = (ds.position || "right").toLowerCase(); // 'right' or 'left'
    var startOpen = String(ds.open || "").toLowerCase() === "true";
    var zIndex = ds.zIndex || "9999";

    if (document.getElementById(buttonId) || document.getElementById(panelId)) {
      console.log("Widget already exists, skipping injection");
      return; // Already injected
    }

    console.log("Creating widget with ID:", widgetId, "Button ID:", buttonId);

    // Styles (scoped via element IDs and inline styles to avoid conflicts)
    function applyStyles(el, styles) {
      for (var k in styles) {
        if (Object.prototype.hasOwnProperty.call(styles, k)) {
          el.style[k] = styles[k];
        }
      }
    }

    // Create button
    var button = document.createElement("button");
    button.id = buttonId;
    button.type = "button";
    button.setAttribute("aria-label", "Open Docs Chat");
    button.setAttribute("title", "Docs Chat");
    button.textContent = label;
    applyStyles(button, {
      position: "fixed",
      bottom: "20px",
      right: position === "right" ? "20px" : "auto",
      left: position === "left" ? "20px" : "auto",
      zIndex: String(zIndex),
      background: color,
      color: "#ffffff",
      border: "none",
      width: "56px",
      height: "56px",
      borderRadius: "50%",
    });
    button.style.boxShadow = "0 10px 25px rgba(0,0,0,.15)";
    button.style.cursor = "pointer";
    button.style.fontSize = "22px";
    button.style.lineHeight = "1";

    console.log("Button created with styles:", {
      position: button.style.position,
      bottom: button.style.bottom,
      right: button.style.right,
      zIndex: button.style.zIndex,
    });

    // Create backdrop
    var backdrop = document.createElement("div");
    backdrop.id = widgetId + "-backdrop";
    applyStyles(backdrop, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(4px)",
      zIndex: String(parseInt(zIndex) - 1),
      display: startOpen ? "block" : "none",
    });

    // Create panel container
    var panel = document.createElement("div");
    panel.id = panelId;
    applyStyles(panel, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: width,
      height: height,
      border: "1px solid #e5e7eb",
      borderRadius: "16px",
      overflow: "hidden",
      background: "#ffffff",
      zIndex: String(zIndex),
      display: startOpen ? "block" : "none",
    });
    // Add relative positioning for close button
    panel.style.position = "fixed";
    panel.style.boxShadow = "0 15px 35px rgba(0,0,0,.2)";

    // Close button positioned absolutely
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    applyStyles(closeBtn, {
      position: "absolute",
      top: "12px",
      right: "12px",
      background: "rgba(0, 0, 0, 0.5)",
      border: "none",
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      fontSize: "18px",
      lineHeight: "1",
      color: "#ffffff",
      cursor: "pointer",
      zIndex: "10001",
    });

    // Iframe for chat UI
    var iframe = document.createElement("iframe");
    iframe.id = iframeId;

    // Add API configuration to iframe URL
    var iframeSrc = new URL(chatUrl);
    iframeSrc.searchParams.set("domain", currentDomain);
    iframeSrc.searchParams.set("api_url", apiUrl);
    if (apiKey) {
      iframeSrc.searchParams.set("api_key", apiKey);
    }

    iframe.src = iframeSrc.toString();
    iframe.title = "Chat";
    applyStyles(iframe, {
      width: "100%",
      height: "100%",
      border: "0",
    });

    panel.appendChild(iframe);
    panel.appendChild(closeBtn);

    // Toggle logic
    function togglePanel() {
      var isVisible = panel.style.display !== "none";
      panel.style.display = isVisible ? "none" : "block";
      backdrop.style.display = isVisible ? "none" : "block";
    }
    button.addEventListener("click", togglePanel);
    closeBtn.addEventListener("click", function () {
      panel.style.display = "none";
      backdrop.style.display = "none";
    });
    backdrop.addEventListener("click", function () {
      panel.style.display = "none";
      backdrop.style.display = "none";
    });

    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        panel.style.display = "none";
        backdrop.style.display = "none";
      }
    });

    // Append to DOM
    console.log("Appending button, backdrop and panel to DOM");
    document.body.appendChild(button);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    console.log("Widget elements added to DOM successfully");
  } catch (err) {
    // Fail silently to avoid breaking host page
    console &&
      console.warn &&
      console.warn("[KAI-Fusion Widget] init failed:", err);
  }
})();
