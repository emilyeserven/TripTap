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
  PackageOpenIcon,
  PenLineIcon,
  Repeat2Icon,
  ScrollTextIcon,
  SendIcon,
  SettingsIcon,
  SparklesIcon,
  SpellCheckIcon,
  TagsIcon,
  TargetIcon,
  TelescopeIcon,
  UserRoundIcon,
} from "lucide-react";

/**
 * The single source of truth for app navigation: the sidebar and the homepage tile grid are both
 * derived from the sections below, so a new feature is added in exactly one place.
 *
 * The sections answer "what am I doing?", not "what table is this?":
 *   Today     — the queue waiting on you right now.
 *   Practice  — sitting down and doing the work (everything that earns XP).
 *   Knowledge — the reference bank the practice builds up.
 *   Material  — where the study material comes from.
 *   Setup     — moving data in and out, and how the app is wired up.
 *
 * **A parent that has its own page must list its children on that page, because the sidebar will
 * not.** The sidebar renders a page-backed parent as a single plain link and only expands
 * grouping-only parents (the ones with no `to`), so a hub page is the way in to its children. The
 * homepage is the exhaustive index and still tiles every child alongside its parent.
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

/** A destination that also nests children under it. */
export interface NavParent {
  title: string;
  icon: LucideIcon;
  /**
   * Omitted for grouping-only entries (e.g. Import & Export) that exist only to hold children —
   * those are the only parents the sidebar expands. A parent that sets `to` renders as a plain
   * sidebar link, so its page has to link to each child itself.
   */
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

/** The backlogs that are waiting on you — the first thing to look at when you sit down. */
const todaySection: NavSection = {
  label: "Today",
  description: "What's waiting on you right now.",
  items: [
    startSomething,
    {
      title: "Attention",
      to: "/attention",
      icon: InboxIcon,
      description: "Everything you flagged for later — corrections, grading, words, flashcards.",
    },
    {
      title: "Corrections",
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
  ],
};

/** Sitting down and doing the work — every activity that earns XP, grouped by skill. */
const practiceSection: NavSection = {
  label: "Practice",
  description: "Sit down and do the work.",
  items: [
    {
      title: "Capture",
      to: "/capture",
      icon: CameraIcon,
      description: "Snap or paste text and run it through OCR to mine sentences.",
    },
    {
      title: "Reading & Writing",
      to: "/reading-writing",
      icon: BookOpenTextIcon,
      description: "Pick a reading or writing task to sit down with.",
      children: [
        {
          title: "My Writing",
          to: "/my-writing",
          icon: PenLineIcon,
          description: "Compose and track your own writing.",
        },
        {
          title: "Reading Sessions",
          to: "/reading-sessions",
          icon: BookOpenIcon,
          description: "Track what you read and what you pull from it.",
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
      title: "Exercises",
      to: "/exercises",
      icon: BookMarkedIcon,
      description: "Work through textbook and worksheet exercises, questions and answers in one place.",
    },
    {
      title: "Drills",
      to: "/drill-sessions",
      icon: TargetIcon,
      description: "Review your timed drills and what they turned up.",
      children: [
        {
          title: "Start Drills",
          to: "/drill-sessions/new",
          icon: DrillIcon,
          description: "Run a timed drill and log the mistakes you make.",
        },
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
      title: "Theory Study",
      to: "/theory-sessions",
      icon: BrainIcon,
      description: "Sit down with a grammar or theory topic and take notes.",
    },
  ],
};

/** The reference bank the practice builds up — one entry per thing you accumulate. */
const knowledgeSection: NavSection = {
  label: "Knowledge",
  description: "Everything you've learned, in one bank.",
  items: [
    {
      // One entry for the whole unified page — bank / mine / study / all are its `?view=` tabs, so
      // extra sidebar shortcuts would only light up together (the active check ignores search).
      title: "Sentences",
      to: "/sentences",
      icon: ScrollTextIcon,
      description: "Every sentence you've banked, written, or set aside to study.",
    },
    {
      title: "Vocabulary",
      to: "/vocabulary",
      icon: BookOpenIcon,
      description: "Words you're building fluency with.",
    },
    {
      title: "Kanji",
      to: "/kanji",
      icon: LanguagesIcon,
      description: "Every character you've met, how often, and where.",
    },
    {
      title: "Grammar",
      to: "/grammar-notes",
      icon: SpellCheckIcon,
      description: "Your own notes on grammar points, with the sheets that practise them.",
    },
    {
      title: "Culture",
      to: "/culture",
      icon: LandmarkIcon,
      description: "Cultural notes worth remembering — your own and from AI Lessons.",
      children: [
        {
          title: "Culture Topics",
          to: "/culture/topics",
          icon: TagsIcon,
          description: "Manage the topics your culture notes are filed under.",
        },
      ],
    },
  ],
};

/** Where the material comes from: the shelves you mine, and the people and captures behind them. */
const materialSection: NavSection = {
  label: "Material",
  description: "Where your study material comes from.",
  items: [
    {
      title: "Resources",
      to: "/collections",
      icon: TelescopeIcon,
      description: "The books, shows, and articles you're working through.",
    },
    {
      // The local free-text provenance table for sentences, kept a sibling of Resources rather than
      // nested under it: /collections is the bookmarks-backed browser and never links here, and a
      // hub may only own children it actually surfaces. The rename off "Sources" separates the two.
      title: "Sentence Origins",
      to: "/sources",
      icon: DatabaseIcon,
      description: "Where your sentences come from — books, shows, articles.",
    },
    {
      title: "Lessons",
      to: "/lessons",
      icon: BookAIcon,
      description: "Records of your tutoring lessons.",
      children: [
        {
          title: "Start Lesson",
          to: "/lessons/new",
          icon: NotebookPenIcon,
          description: "Write up a tutoring lesson while it's still fresh.",
        },
      ],
    },
    {
      title: "AI Lessons",
      to: "/ai-lessons",
      icon: GraduationCapIcon,
      description: "AI Lesson notes and material to draw from.",
    },
    {
      title: "Tutors",
      to: "/tutors",
      icon: UserRoundIcon,
      description: "The tutors you take lessons with.",
    },
    {
      title: "Captures",
      to: "/captures",
      icon: ImagesIcon,
      description: "Everything you've captured, ready to process.",
    },
  ],
};

/** Moving the bank in and out, plus the two footer items the sidebar pins to the bottom. */
const setupSection: NavSection = {
  label: "Setup",
  description: "Import, export, and how the app is wired up.",
  items: [
    {
      title: "Import & Export",
      icon: ArrowDownUpIcon,
      children: [
        {
          title: "Migaku import",
          to: "/migaku-import",
          icon: PackageOpenIcon,
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

/** The sections the sidebar lists below its Start Something button, in order. */
export const navSections: readonly NavSection[] = [
  todaySection,
  practiceSection,
  knowledgeSection,
  materialSection,
  setupSection,
];

/**
 * Every section as the homepage renders them. The footer items join Setup there, so the homepage
 * stays the exhaustive index while the sidebar keeps them pinned to its bottom edge.
 */
export const allNavSections: readonly NavSection[] = [
  ...navSections.slice(0, -1),
  {
    ...setupSection,
    items: [...setupSection.items, ...navFooterItems],
  },
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
