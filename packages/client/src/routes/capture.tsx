import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CaptureOcrWorkbench } from "@/components/CaptureOcrWorkbench";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/capture")({
  component: CapturePage,
});

function CapturePage() {
  usePageTitle("Capture text");
  const navigate = useNavigate();

  return (
    <section className="space-y-6">
      <div>
        <Link
          to="/captures"
          className="
            mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground
            hover:underline
          "
        >
          <ArrowLeft className="size-3.5" />
          Captures
        </Link>
        <p className="text-sm text-muted-foreground">
          Take a photo or choose an image, and extract its Japanese and English text.
        </p>
      </div>

      <CaptureOcrWorkbench
        onSaved={id => void navigate({
          to: "/captures/$id",
          params: {
            id,
          },
        })}
      />
    </section>
  );
}
