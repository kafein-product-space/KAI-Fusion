import { type RouteConfig, index, route } from "@react-router/dev/routes";


export default [
  index("routes/home.tsx"),
  route("workflows", "routes/workflows.tsx"),
  route("workflows/:id", "routes/canvas.tsx"),
  route("canvas", "routes/canvas.tsx"),
  route("executions", "routes/executions.tsx"),
  route("credentials", "routes/credentials.tsx"),
  route("variables", "routes/variables.tsx"),
  route("templates", "routes/templates.tsx"),
  route("signin", "routes/signin.tsx"),
  route("register", "routes/register.tsx")
] satisfies RouteConfig;
