import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { AdminAuthError, requireAdmin } from "@/server/auth";
import * as scripture from "@/server/scripture";

const guard = () => {
  try {
    requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) {
      setResponseStatus(error.status);
      throw new Error("Unauthorized");
    }
    throw error;
  }
};

export const listScriptureTranslations = createServerFn({ method: "POST" }).handler(() => {
  guard();
  return scripture.listTranslations();
});

export const fetchScripture = createServerFn({ method: "POST" })
  .validator((input: scripture.ScriptureFetchInput) => input)
  .handler(({ data }) => {
    guard();
    return scripture.fetchPassage(data);
  });
