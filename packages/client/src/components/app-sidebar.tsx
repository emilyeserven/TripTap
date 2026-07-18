import type * as React from "react";

import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookAIcon,
  BookMarkedIcon,
  BookOpenIcon,
  BookOpenTextIcon,
  CameraIcon,
  ChartColumnIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  DatabaseIcon,
  DownloadIcon,
  DrillIcon,
  FolderTreeIcon,
  GraduationCapIcon,
  HeadphonesIcon,
  ImagesIcon,
  LandmarkIcon,
  LanguagesIcon,
  LayersIcon,
  LibraryIcon,
  LightbulbIcon,
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
  UploadIcon,
  UserRoundIcon,
} from "lucide-react";

import { PwaUpdateItem } from "@/components/PwaUpdateItem";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/** { Lessons, AI Lessons, Captures, … } — source material to mine from. */
const collectionsItems = [
  {
    title: "Lessons",
    to: "/lessons",
    icon: BookAIcon,
  },
  {
    title: "AI Lessons",
    to: "/ai-lessons",
    icon: GraduationCapIcon,
  },
  {
    title: "Captures",
    to: "/captures",
    icon: ImagesIcon,
  },
  {
    title: "Sources",
    to: "/sources",
    icon: DatabaseIcon,
  },
] as const;

/** The study bank itself. */
const libraryItems = [
  {
    title: "Tutors",
    to: "/tutors",
    icon: UserRoundIcon,
  },
  {
    title: "Culture",
    to: "/culture",
    icon: LandmarkIcon,
  },
  {
    title: "Vocabulary",
    to: "/vocabulary",
    icon: BookOpenIcon,
  },
  {
    title: "Grammar",
    to: "/grammar",
    icon: LanguagesIcon,
  },
  {
    title: "Sentences",
    to: "/sentences",
    icon: ScrollTextIcon,
  },
  {
    title: "Writing Prompts",
    to: "/writing-prompts",
    icon: LightbulbIcon,
  },
] as const;

/** Tools that act on the bank (exports, etc.). */
const actionItems = [
  {
    title: "Grammar",
    to: "/grammar-notes",
    icon: SpellCheckIcon,
  },
  {
    title: "Reading & Writing",
    icon: BookOpenTextIcon,
    children: [
      {
        title: "Study Sentences",
        to: "/practice",
        icon: NotebookPenIcon,
      },
      {
        title: "My Writing",
        to: "/my-writing",
        icon: PenLineIcon,
      },
      {
        title: "My Sentences",
        to: "/my-sentences",
        icon: PencilRulerIcon,
      },
      {
        title: "Reading Session",
        to: "/reading-sessions",
        icon: BookOpenIcon,
      },
    ],
  },
  {
    title: "Book Exercises",
    to: "/book-exercises",
    icon: BookMarkedIcon,
    children: [
      {
        title: "Question Sheets",
        to: "/question-sheets",
        icon: ClipboardListIcon,
      },
      {
        title: "Answer Sheets",
        to: "/answer-sheets",
        icon: ClipboardCheckIcon,
      },
    ],
  },
  {
    title: "Speaking & Listening",
    icon: MicIcon,
    children: [
      {
        title: "Listening Sessions",
        to: "/listening-sessions",
        icon: HeadphonesIcon,
      },
      {
        title: "Shadowing Practice",
        to: "/shadowing",
        icon: Repeat2Icon,
      },
      {
        title: "Find a Resource",
        to: "/find-resource",
        icon: TelescopeIcon,
      },
    ],
  },
  {
    title: "Drill Sessions",
    to: "/drill-sessions",
    icon: TargetIcon,
    children: [
      {
        title: "Mistake Reasons",
        to: "/drill-sessions/reasons",
        icon: FolderTreeIcon,
      },
      {
        title: "Statistics",
        to: "/drill-sessions/stats",
        icon: ChartColumnIcon,
      },
    ],
  },
  {
    title: "Import",
    icon: DownloadIcon,
    children: [
      {
        title: "Migaku import",
        to: "/migaku-import",
        icon: LayersIcon,
      },
    ],
  },
  {
    title: "Export",
    icon: UploadIcon,
    children: [
      {
        title: "Renshuu export",
        to: "/renshuu",
        icon: SendIcon,
      },
      {
        title: "Anki export",
        to: "/anki",
        icon: LayersIcon,
      },
    ],
  },
] as const;

/** Primary "start a task" entry points, revealed on hover under the "Start Something" trigger. */
const startItems = [
  {
    title: "Capture",
    to: "/capture",
    icon: CameraIcon,
    emphasis: true,
  },
  {
    title: "Start Lesson",
    to: "/lessons/new",
    icon: BookAIcon,
  },
  {
    title: "Start Drills",
    to: "/drill-sessions/new",
    icon: DrillIcon,
  },
] as const;

function isItemActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  // `/ai-lessons` shouldn't stay active on `/ai-lessons/new` sub-navigation beyond its own prefix.
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavItem({
  item,
  pathname,
}: {
  item: { title: string;
    to: string;
    icon: React.ComponentType; };
  pathname: string;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isItemActive(pathname, item.to)}
        tooltip={item.title}
      >
        <Link to={item.to}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavNestedItem({
  item,
  pathname,
}: {
  item: {
    title: string;
    to?: string;
    icon: React.ComponentType;
    children: readonly { title: string;
      to: string;
      icon: React.ComponentType; }[];
  };
  pathname: string;
}) {
  const isChildActive = item.children.some(child => isItemActive(pathname, child.to));

  return (
    <Collapsible
      defaultOpen={isChildActive}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        {item.to
          ? (
            <>
              <SidebarMenuButton
                asChild
                isActive={isItemActive(pathname, item.to)}
                tooltip={item.title}
              >
                <Link to={item.to}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              <CollapsibleTrigger asChild>
                <SidebarMenuAction
                  className="
                    transition-transform
                    group-data-[state=open]/collapsible:rotate-90
                  "
                >
                  <ChevronRightIcon />
                  <span className="sr-only">
                    Toggle
                    {item.title}
                  </span>
                </SidebarMenuAction>
              </CollapsibleTrigger>
            </>
          )
          : (
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={item.title}>
                <item.icon />
                <span>{item.title}</span>
                <ChevronRightIcon
                  className="
                    ml-auto transition-transform
                    group-data-[state=open]/collapsible:rotate-90
                  "
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
          )}
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map(child => (
              <SidebarMenuSubItem key={child.to}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isItemActive(pathname, child.to)}
                >
                  <Link to={child.to}>
                    <child.icon />
                    <span>{child.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/** A labeled sidebar section whose contents collapse when its header is clicked. */
function NavSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen
      className="group/section"
    >
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="w-full">
            {label}
            <ChevronDownIcon
              className="
                ml-auto transition-transform
                group-data-[state=closed]/section:-rotate-90
              "
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          {children}
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = useRouterState({
    select: state => state.location.pathname,
  });

  return (
    <Sidebar
      collapsible="icon"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
            >
              <Link to="/">
                <div
                  className="
                    flex aspect-square size-8 items-center justify-center
                    rounded-lg bg-sidebar-primary
                    text-sidebar-primary-foreground
                  "
                >
                  <LibraryIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm/tight">
                  <span className="truncate font-semibold">sentence-bank</span>
                  <span className="truncate text-xs">Sentence bank</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Primary action — the "start a task" entry points reveal on hover. */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <HoverCard
                openDelay={100}
                closeDelay={150}
              >
                <HoverCardTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Start Something"
                    className="
                      bg-primary text-primary-foreground
                      hover:bg-primary/90 hover:text-primary-foreground
                      active:bg-primary/90 active:text-primary-foreground
                      data-[state=open]:bg-primary/90
                      data-[state=open]:text-primary-foreground
                    "
                  >
                    <SparklesIcon />
                    <span>Start Something</span>
                    <ChevronRightIcon className="ml-auto" />
                  </SidebarMenuButton>
                </HoverCardTrigger>
                <HoverCardContent
                  side="right"
                  align="start"
                  className="w-56 p-2"
                >
                  <div className="flex flex-col gap-1">
                    {startItems.map(item => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          `
                            flex items-center gap-2 rounded-md p-2 text-sm
                            outline-hidden transition-colors
                            [&>svg]:size-4 [&>svg]:shrink-0
                          `,
                          "emphasis" in item && item.emphasis
                            ? `
                              bg-primary text-primary-foreground
                              hover:bg-primary/90
                            `
                            : cn(
                              `
                                text-sidebar-foreground
                                hover:bg-sidebar-accent
                                hover:text-sidebar-accent-foreground
                              `,
                              isItemActive(pathname, item.to)
                              && `
                                bg-sidebar-accent font-medium
                                text-sidebar-accent-foreground
                              `,
                            ),
                        )}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    ))}
                  </div>
                </HoverCardContent>
              </HoverCard>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <NavSection label="Action">
          <SidebarMenu>
            {actionItems.map(item =>
              "children" in item
                ? (
                  <NavNestedItem
                    key={item.title}
                    item={item}
                    pathname={pathname}
                  />
                )
                : (
                  <NavItem
                    key={item.title}
                    item={item}
                    pathname={pathname}
                  />
                ))}
          </SidebarMenu>
        </NavSection>

        <NavSection label="Collections">
          <SidebarMenu>
            {collectionsItems.map(item => (
              <NavItem
                key={item.to}
                item={item}
                pathname={pathname}
              />
            ))}
          </SidebarMenu>
        </NavSection>

        <NavSection label="Library">
          <SidebarMenu>
            {libraryItems.map(item => (
              <NavItem
                key={item.to}
                item={item}
                pathname={pathname}
              />
            ))}
          </SidebarMenu>
        </NavSection>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <PwaUpdateItem />
          <NavItem
            item={{
              title: "Settings",
              to: "/settings",
              icon: SettingsIcon,
            }}
            pathname={pathname}
          />
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
