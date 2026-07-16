import type { QuestionSheet } from "@sentence-bank/types";
import type * as React from "react";

import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookAIcon,
  BookMarkedIcon,
  BookOpenIcon,
  CalendarClockIcon,
  CameraIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  DatabaseIcon,
  DrillIcon,
  GraduationCapIcon,
  HeadphonesIcon,
  ImagesIcon,
  LandmarkIcon,
  LanguagesIcon,
  LayersIcon,
  LightbulbIcon,
  NotebookPenIcon,
  PencilRulerIcon,
  PenLineIcon,
  Repeat2Icon,
  ScrollTextIcon,
  SendIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { dueDateMet } from "@/lib/answer-sheets";
import { formatDueDate, isDueSoon, isOverdue } from "@/lib/due-date";

/** How far ahead (in days) a due question sheet counts as "due soon" on the homepage card. */
const DUE_SOON_DAYS = 7;
/** Cap on how many due sheets the homepage card shows at once. */
const DUE_SOON_LIMIT = 5;

function hasDueDate(sheet: QuestionSheet): sheet is QuestionSheet & { dueDate: string } {
  return sheet.dueDate !== null;
}

interface Tile {
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface TileSection {
  label: string;
  description: string;
  tiles: readonly Tile[];
}

const sections: readonly TileSection[] = [
  {
    label: "Start Something",
    description: "Jump straight into capturing text, a lesson, or a drill session.",
    tiles: [
      {
        title: "Capture",
        to: "/capture",
        icon: CameraIcon,
        description: "Snap or paste text and run it through OCR to mine sentences.",
      },
      {
        title: "Start Lesson",
        to: "/lessons/new",
        icon: BookAIcon,
        description: "Begin a new tutor-lesson record.",
      },
      {
        title: "Start Drills",
        to: "/drill-sessions/new",
        icon: DrillIcon,
        description: "Kick off a timed drill session.",
      },
    ],
  },
  {
    label: "Action",
    description: "Study and work with the sentences you've collected.",
    tiles: [
      {
        title: "Study Sentences",
        to: "/practice",
        icon: NotebookPenIcon,
        description: "Drill your saved sentences in focused practice sessions.",
      },
      {
        title: "My Writing",
        to: "/my-writing",
        icon: PenLineIcon,
        description: "Compose and track your own writing.",
      },
      {
        title: "My Sentences",
        to: "/my-sentences",
        icon: PencilRulerIcon,
        description: "The sentences you've written yourself.",
      },
      {
        title: "Book Exercises",
        to: "/book-exercises",
        icon: BookMarkedIcon,
        description: "Work through textbook and worksheet exercises.",
      },
      {
        title: "Question Sheets",
        to: "/question-sheets",
        icon: ClipboardListIcon,
        description: "Question sets to answer.",
      },
      {
        title: "Answer Sheets",
        to: "/answer-sheets",
        icon: ClipboardCheckIcon,
        description: "Your recorded answers.",
      },
      {
        title: "Listening Sessions",
        to: "/listening-sessions",
        icon: HeadphonesIcon,
        description: "Log and review focused listening practice.",
      },
      {
        title: "Shadowing Practice",
        to: "/shadowing",
        icon: Repeat2Icon,
        description: "Repeat audio to sharpen pronunciation and rhythm.",
      },
      {
        title: "Reading Session",
        to: "/reading-sessions",
        icon: BookOpenIcon,
        description: "Track what you read and what you pull from it.",
      },
      {
        title: "Renshuu export",
        to: "/renshuu",
        icon: SendIcon,
        description: "Export sentences to Renshuu for drilling.",
      },
      {
        title: "Anki export",
        to: "/anki",
        icon: LayersIcon,
        description: "Export sentences to Anki flashcards.",
      },
    ],
  },
  {
    label: "Collections",
    description: "The source material you mine sentences from.",
    tiles: [
      {
        title: "Lessons",
        to: "/lessons",
        icon: BookAIcon,
        description: "Records of your tutoring lessons.",
      },
      {
        title: "Tutors",
        to: "/tutors",
        icon: UserRoundIcon,
        description: "The tutors you take lessons with.",
      },
      {
        title: "AI Lessons",
        to: "/ai-lessons",
        icon: GraduationCapIcon,
        description: "AI Lesson notes and material to draw from.",
      },
      {
        title: "Captures",
        to: "/captures",
        icon: ImagesIcon,
        description: "Everything you've captured, ready to process.",
      },
      {
        title: "Sources",
        to: "/sources",
        icon: DatabaseIcon,
        description: "Where your material comes from.",
      },
    ],
  },
  {
    label: "Library",
    description: "Your personal study bank.",
    tiles: [
      {
        title: "Culture",
        to: "/culture",
        icon: LandmarkIcon,
        description: "Cultural notes worth remembering.",
      },
      {
        title: "Vocabulary",
        to: "/vocabulary",
        icon: BookOpenIcon,
        description: "Words you're building fluency with.",
      },
      {
        title: "Grammar",
        to: "/grammar",
        icon: LanguagesIcon,
        description: "Grammar points and patterns.",
      },
      {
        title: "Sentences",
        to: "/sentences",
        icon: ScrollTextIcon,
        description: "Your bank of example sentences.",
      },
      {
        title: "Writing Prompts",
        to: "/writing-prompts",
        icon: LightbulbIcon,
        description: "Prompts to spark your own writing.",
      },
    ],
  },
  {
    label: "Settings",
    description: "Configure the app to fit your workflow.",
    tiles: [
      {
        title: "Settings",
        to: "/settings",
        icon: SettingsIcon,
        description: "OCR keys, bookmarks sources, and more.",
      },
    ],
  },
];

export const Route = createFileRoute("/")({
  component: HomePage,
});

function TileCard({
  tile,
}: { tile: Tile }) {
  return (
    <Link
      to={tile.to}
      className="
        group flex flex-col gap-2 rounded-xl border bg-card p-4
        text-card-foreground shadow-sm transition-colors
        hover:border-primary/50 hover:bg-accent
      "
    >
      <div className="flex items-center gap-2">
        <span
          className="
            flex size-9 shrink-0 items-center justify-center rounded-lg
            bg-primary/10 text-primary
          "
        >
          <tile.icon className="size-5" />
        </span>
        <span
          className="
            font-semibold
            group-hover:text-primary
          "
        >{tile.title}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{tile.description}</p>
    </Link>
  );
}

/** Homepage card surfacing question sheets that are overdue or due within {@link DUE_SOON_DAYS} days. */
function DueSoonCard() {
  const {
    data: sheets,
  } = useQuestionSheets();
  const {
    data: answerSheets,
  } = useAnswerSheets();
  const now = new Date();
  const due = (sheets ?? [])
    .filter(hasDueDate)
    .filter(s => isDueSoon(s.dueDate, now, DUE_SOON_DAYS))
    // Drop sheets already met by a completed, in-window answer sheet — they no longer need attention.
    .filter(s => !dueDateMet(s, (answerSheets ?? []).filter(as => as.questionSheetId === s.id)))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, DUE_SOON_LIMIT);

  if (due.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClockIcon className="size-4" />
          Question sheets due soon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {due.map(sheet => (
          <Link
            key={sheet.id}
            to="/question-sheets/$id"
            params={{
              id: sheet.id,
            }}
            className="
              flex items-center justify-between gap-2 rounded-md border p-2
              text-sm transition-colors
              hover:bg-accent
            "
          >
            <span className="font-medium">{sheet.title}</span>
            <Badge variant={isOverdue(sheet.dueDate, now) ? "destructive" : "outline"}>
              Due {formatDueDate(sheet.dueDate)}
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function HomePage() {
  usePageTitle("Build your sentence bank");
  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        sentence-bank is a self-deployable app for building your personal bank of example
        sentences. Jump into any section below to get started.
      </p>

      <DueSoonCard />

      {sections.map(section => (
        <section
          key={section.label}
          className="space-y-3"
        >
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold">{section.label}</h2>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>
          <div
            className="
              grid grid-cols-1 gap-3
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >
            {section.tiles.map(tile => (
              <TileCard
                key={tile.to}
                tile={tile}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
