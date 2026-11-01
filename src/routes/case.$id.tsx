import { createFileRoute } from "@tanstack/react-router";
import { CaseWorkspace } from "@/components/CaseWorkspace";

const title = "Docket — Case";
const description =
  "A case file for contested claims: the source, commentary, rebuttals, citations, and status on the record.";

export const Route = createFileRoute("/case/$id")({
  head: ({ params }) => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `/case/${params.id}` },
      { property: "og:image", content: "/og-docket.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/og-docket.png" },
    ],
    links: [{ rel: "canonical", href: `/case/${params.id}` }],
  }),
  component: CaseRoute,
});

function CaseRoute() {
  const { id } = Route.useParams();
  return <CaseWorkspace initialEntryId={id} />;
}
