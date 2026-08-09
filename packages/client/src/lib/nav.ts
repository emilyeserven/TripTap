import type { LucideIcon } from "lucide-react";

import {
  ArrowDownUpIcon,
  BookAIcon,
  BookMarkedIcon,
  BookOpenIcon,
  BookOpenTextIcon,
  BrainIcon,
  CameraIcon,
  ChartColumnIcon,
  DatabaseIcon,
  DrillIcon,
  FolderTreeIcon,
  GraduationCapIcon,
  HeadphonesIcon,
  ImagesIcon,
  InboxIcon,
  LandmarkIcon,
  LanguagesIcon,
  LayersIcon,
  LightbulbIcon,
  ListChecksIcon,
  ListMusicIcon,
  MessagesSquareIcon,
  MicIcon,
  NotebookPenIcon,
  PencilRulerIcon,
  PenLineIcon,
  Repeat2Icon,
  ScrollTextIcon,
  SendIcon,
  SettingsIcon,
  SparklesIcon,
  SpellCheckIcon,
  TargetIcon,
  TelescopeIcon,
  UserRoundIcon,
} from "lucide-react";

/**
 * The single source of truth for app navigation: the sidebar and the homepage tile grid are both
 * derived from the sections below, so a new feature is added in exactly one place.
 *
 * Grouping follows the sidebar. The homepage renders the same sections as tile grids, flattening
 * nested children into tiles alongside their parent.
 */

/** A place you can navigate to — a sidebar link and a homepage tile. */
export interface NavDestination {
  /** Sidebar label and tile title. */
  title: string;
  to: string;
  icon: LucideIcon;
  /** One-line, second-person blurb shown on the homepage tile. */
  description: string;
}

/** A destination that also nests children under it in the sidebar. */
export interface NavParent {
  title: string;
  icon: LucideIcon;
  /** Omitted for grouping-only entries (e.g. Import & Export) that exist only to hold children. */
  to?: string;
  /** Omitted alongside `to` — a grouping-only entry gets no tile of its own. */
  description?: string;
  children: readonly NavDestination[];
}

export type NavEntry = NavDestination | NavParent;

export interface NavSection {
  label: string;
  /** Shown under the section heading on the homepage; the sidebar renders the label only. */
  description: string;
  items: readonly NavEntry[];
}

/** The primary call to action. The sidebar renders it as its own button with an XP progress bar. */
export const startSomething: NavDestination = {
  title: "Start Something",
  to: "/start",
  icon: SparklesIcon,
  description:
    "See your XP per learning area and get a recommendation for what to practice next.",
};

const startSomethingSection: NavSection = {
  label: "Start Something",
  description: "Get a quick, contained task picked from your XP and goals.",
  items: [
    startSomething,
    {
      title: "Attention",
      to: "/attention",
      icon: InboxIcon,
      description: "Everything you flagged for later — corrections, grading, words, flashcards.",
    },
  ],
};

/** Quick starts for the handful of things you do most often. */
const actionSection: NavSection = {
  label: "Action",
  description: "Jump straight into the task you sat down to do.",
  items: [
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
      description: "Write up a tutoring lesson while it's still fresh.",
    },
    {
      title: "Start Drills",
      to: "/drill-sessions/new",
      icon: DrillIcon,
      description: "Run a timed drill and log the mistakes you make.",
    },
  ],
};

/** Everything you practise with, plus the import/export tools that act on the bank. */
const inputOutputSection: NavSection = {
  label: "Input & Output",
  description: "Study and work with the sentences you've collected.",
  items: [
    {
      title: "Grammar",
      to: "/grammar-notes",
      icon: SpellCheckIcon,
      description: "Your own notes on grammar points, with the sheets that practise them.",
    },
    {
      title: "Reading & Writing",
      to: "/reading-writing",
      icon: BookOpenTextIcon,
      description: "Pick a reading or writing task to sit down with.",
      children: [
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
          title: "Reading Session",
          to: "/reading-sessions",
          icon: BookOpenIcon,
          description: "Track what you read and what you pull from it.",
        },
      ],
    },
    {
      title: "Exercises",
      to: "/exercises",
      icon: BookMarkedIcon,
      description: "Work through textbook and worksheet exercises, questions and answers in one place.",
    },
    {
      title: "Speaking & Listening",
      to: "/speaking-listening",
      icon: MicIcon,
      description: "Pick something to listen to or say out loud.",
      children: [
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
          title: "Shadowing Lists",
          to: "/shadowing-lists",
          icon: ListMusicIcon,
          description: "Line up the clips you want to shadow in one sitting.",
        },
        {
          title: "Dialogues",
          to: "/dialogues",
          icon: MessagesSquareIcon,
          description: "Multi-speaker scripts as a chat transcript you can practise against.",
        },
      ],
    },
    {
      title: "Drill Sessions",
      to: "/drill-sessions",
      icon: TargetIcon,
      description: "Review your timed drills and what they turned up.",
      children: [
        {
          title: "Mistake Reasons",
          to: "/drill-sessions/reasons",
          icon: FolderTreeIcon,
          description: "The shared taxonomy you tag drill mistakes with.",
        },
        {
          title: "Statistics",
          to: "/drill-sessions/stats",
          icon: ChartColumnIcon,
          description: "See which mistakes keep coming back.",
        },
      ],
    },
    {
      title: "Correction Triage",
      to: "/corrections",
      icon: ListChecksIcon,
      description: "Work through the corrections you've been given.",
      children: [
        {
          title: "Triage",
          to: "/corrections/triage",
          icon: SpellCheckIcon,
          description: "Sort new corrections into the rules you want to fix.",
        },
        {
          title: "Error Log",
          to: "/corrections/log",
          icon: ScrollTextIcon,
          description: "Every correction you've logged, in one place.",
        },
        {
          title: "Rule Groups",
          to: "/corrections/groups",
          icon: LayersIcon,
          description: "Group related mistakes into rules to study.",
        },
      ],
    },
    {
      title: "Theory Study",
      to: "/theory-sessions",
      icon: BrainIcon,
      description: "Sit down with a grammar or theory topic and take notes.",
    },
    {
      title: "Import & Export",
      icon: ArrowDownUpIcon,
      children: [
        {
          title: "Migaku import",
          to: "/migaku-import",
          icon: LayersIcon,
          description: "Bring in a Migaku or Anki deck and pick what to keep.",
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
  ],
};

/** { Resources, Lessons, AI Lessons, Captures, … } — source material to mine from. */
const collectionsSection: NavSection = {
  label: "Collections",
  description: "The source material you mine sentences from.",
  items: [
    {
      title: "Resources",
      to: "/collections",
      icon: TelescopeIcon,
      description: "The books, shows, and articles you're working through.",
    },
    {
      title: "Lessons",
      to: "/lessons",
      icon: BookAIcon,
      description: "Records of your tutoring lessons.",
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
      // Renamed from "Sources" to stop colliding with the bookmarks "Resources" entry above — this
      // is the local free-text provenance table for sentences, not the remote study-material channel.
      title: "Sentence Origins",
      to: "/sources",
      icon: DatabaseIcon,
      description: "Where your sentences come from — books, shows, articles.",
    },
  ],
};

/** The study bank itself. */
const librarySection: NavSection = {
  label: "Library",
  description: "Your personal study bank.",
  items: [
    {
      title: "Tutors",
      to: "/tutors",
      icon: UserRoundIcon,
      description: "The tutors you take lessons with.",
    },
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
      title: "Sentences",
      to: "/sentences",
      icon: ScrollTextIcon,
      description: "Your bank of example sentences.",
    },
    {
      title: "Kanji",
      to: "/kanji",
      icon: LanguagesIcon,
      description: "Every character you've met, how often, and where.",
    },
    {
      title: "Writing Prompts",
      to: "/writing-prompts",
      icon: LightbulbIcon,
      description: "Prompts to spark your own writing.",
    },
  ],
};

/** Pinned to the bottom of the sidebar, below the scrolling sections. */
export const navFooterItems: readonly NavDestination[] = [
  {
    title: "Learner Profile",
    to: "/profile",
    icon: TargetIcon,
    description: "Set your daily XP goal and see how you're tracking against it.",
  },
  {
    title: "Settings",
    to: "/settings",
    icon: SettingsIcon,
    description: "OCR keys, bookmarks sources, and more.",
  },
];

/** The same footer items as a plain section at the end of the homepage. */
export const navFooterSection: NavSection = {
  label: "Profile & Settings",
  description: "Your goals, and how the app is wired up.",
  items: navFooterItems,
};

/** The sections the sidebar lists below its Start Something button, in order. */
export const navSections: readonly NavSection[] = [
  actionSection,
  inputOutputSection,
  collectionsSection,
  librarySection,
];

/** Every section, including the ones the sidebar renders specially. Drives the homepage tiles. */
export const allNavSections: readonly NavSection[] = [
  startSomethingSection,
  ...navSections,
  navFooterSection,
];

/** Flatten a section into homepage tiles: nested children sit alongside their parent. */
export function sectionTiles(section: NavSection): NavDestination[] {
  return section.items.flatMap((item) => {
    if (!("children" in item)) return [item];
    const parent: NavDestination[]
      = item.to && item.description
        ? [{
          title: item.title,
          to: item.to,
          icon: item.icon,
          description: item.description,
        }]
        : [];
    return [...parent, ...item.children];
  });
}
