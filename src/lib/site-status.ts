import { createServerFn } from "@tanstack/react-start";
import { resolveDemoMode } from "@/server/site-config";

export const getDemoMode = createServerFn({ method: "GET" }).handler(() => ({
  demo: resolveDemoMode(),
}));
