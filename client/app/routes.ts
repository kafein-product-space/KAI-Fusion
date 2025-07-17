import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Home
  index("routes/home.tsx"),

  // Auth
  route("signin", "routes/signin.tsx"),
  route("register", "routes/register.tsx"),

  // Workflows
  route("workflows", "routes/workflows.tsx"),
  

  // Canvas 
 
  route("canvas", "routes/canvas.tsx"),
  route("canvas/:id", "routes/canvas.tsx"),
  
  

  // Others
  route("executions", "routes/executions.tsx"),
  route("credentials", "routes/credentials.tsx"),
  route("variables", "routes/variables.tsx"),
  route("templates", "routes/templates.tsx")
] satisfies RouteConfig;
