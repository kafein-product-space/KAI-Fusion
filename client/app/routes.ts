import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Home
  index("routes/home.tsx"),

  // Auth
  route("signin", "routes/signin.tsx"),
  route("register", "routes/register.tsx"),

  // Workflows
  route("workflows", "routes/workflows.tsx"),

  // Pinned Items
  route("pinned", "routes/pinned.tsx"),

    // Settings
    route("settings", "routes/settings.tsx"),

  // Canvas
  route("canvas", "routes/canvas.tsx"),

  // Others
  route("executions", "routes/executions.tsx"),
  route("credentials", "routes/credentials.tsx"),
  route("variables", "routes/variables.tsx"),
  route("marketplace", "routes/marketplace.tsx")
] satisfies RouteConfig;
