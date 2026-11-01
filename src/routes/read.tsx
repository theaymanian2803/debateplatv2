import { createFileRoute } from "@tanstack/react-router";
import { CaseWorkspace } from "@/components/CaseWorkspace";

const title = "Docket — Cases";
const description =
  "A case file for contested claims: primary texts, exhibits, briefs, authorities, and the ruling on the record.";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaseWorkspace,
});
