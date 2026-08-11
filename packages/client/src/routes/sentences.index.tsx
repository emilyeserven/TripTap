import { createFileRoute } from "@tanstack/react-router";

import { AllSentencesView } from "@/components/sentence-views/AllSentencesView";
import { BankSentencesView } from "@/components/sentence-views/BankSentencesView";
import { MineSentencesView } from "@/components/sentence-views/MineSentencesView";
import { PracticeSentencesView } from "@/components/sentence-views/PracticeSentencesView";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageTitle } from "@/hooks/usePageTitle";

/** The page's view: one kind's dedicated surface, or the cross-kind "all" list. */
type SentencesView = "bank" | "mine" | "practice" | "all";

const VIEWS: { value: SentencesView;
  label: string; }[] = [
  {
    value: "bank",
    label: "Bank",
  },
  {
    value: "mine",
    label: "My Sentences",
  },
  {
    value: "practice",
    label: "Study",
  },
  {
    value: "all",
    label: "All",
  },
];

const PAGE_TITLES: Record<SentencesView, string> = {
  bank: "Sentences",
  mine: "My Sentences",
  practice: "Study Sentences",
  all: "All Sentences",
};

function parseView(value: unknown): SentencesView | undefined {
  return value === "bank" || value === "mine" || value === "practice" || value === "all"
    ? value
    : undefined;
}

export const Route = createFileRoute("/sentences/")({
  component: SentencesPage,
  validateSearch: (search: Record<string, unknown>): {
    view?: SentencesView;
    /** Deep link from the attention inbox: open the mine view pre-filtered to needs-correction. */
    needsCorrection?: boolean;
    /** Deep link from a source page: open the bank view pre-filtered to that source. */
    source?: string;
  } => ({
    view: parseView(search.view),
    ...(search.needsCorrection === true || search.needsCorrection === "true"
      ? {
        needsCorrection: true,
      }
      : {}),
    ...(typeof search.source === "string"
      ? {
        source: search.source,
      }
      : {}),
  }),
});

/**
 * The one Sentences page. What used to be three top-level features — the bank, My Sentences, and
 * Study (practice) Sentences — are views over the unified sentences store, switched by the `view`
 * search param so each is deep-linkable (the old routes redirect here).
 */
function SentencesPage() {
  const {
    view: viewParam, needsCorrection, source,
  } = Route.useSearch();
  const navigate = Route.useNavigate();
  const view = viewParam ?? "bank";
  usePageTitle(PAGE_TITLES[view]);

  return (
    <div className="space-y-6">
      <Tabs
        value={view}
        onValueChange={v => void navigate({
          search: {
            view: v as SentencesView,
          },
        })}
      >
        <TabsList>
          {VIEWS.map(v => (
            <TabsTrigger
              key={v.value}
              value={v.value}
            >
              {v.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {view === "bank" ? <BankSentencesView sourceParam={source} /> : null}
      {view === "mine"
        ? (
          <MineSentencesView
            // Remount when the deep link changes so the pre-filter re-seeds.
            key={needsCorrection ? "nc" : "all"}
            needsCorrectionParam={needsCorrection}
          />
        )
        : null}
      {view === "practice" ? <PracticeSentencesView /> : null}
      {view === "all" ? <AllSentencesView /> : null}
    </div>
  );
}
