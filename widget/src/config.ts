// Widget-specific configuration
// This is a standalone config for the widget package to avoid
// dependencies on the client package during Docker builds

export interface WidgetConfig {
    API_START: string;
    API_VERSION_ONLY: string;
}

// Default values that can be overridden via props or window globals
const getWidgetConfig = (): WidgetConfig => {
    // Check for window globals (for runtime configuration)
    if (typeof window !== 'undefined') {
        return {
            API_START: (window as any).VITE_API_START || 'api',
            API_VERSION_ONLY: (window as any).VITE_API_VERSION_ONLY || 'v1',
        };
    }

    // Fallback defaults
    return {
        API_START: 'api',
        API_VERSION_ONLY: 'v1',
    };
};

export const config = getWidgetConfig();
