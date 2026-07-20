import type * as React from "react";

import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookAIcon,
  BookMarkedIcon,
  BookOpenIcon,
  CameraIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  DatabaseIcon,
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
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";

import { DueSoonCard } from "@/components/DueSoonCard";
import { usePageTitle } from "@/hooks/usePageTitle";

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
    description: "Get a quick, contained task picked from your XP and goals.",
    tiles: [
      {
        title: "Start Something",
        to: "/start",
        icon: SparklesIcon,
        description:
          "See your XP per learning area and get a recommendation for what to practice next.",
      },
      {
        title: "Capture",
        to: "/capture",
        icon: CameraIcon,
        description: "Snap or paste text and run it through OCR to mine sentences.",
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
