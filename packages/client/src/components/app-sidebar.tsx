import type * as React from "react";

import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookAIcon,
  BookMarkedIcon,
  BookOpenIcon,
  CameraIcon,
  ChevronRightIcon,
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
  LibraryIcon,
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

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

/** { Lessons, AI Lessons, Captures, … } — source material to mine from. */
const collectionsItems = [
  {
    title: "Lessons",
    to: "/lessons",
    icon: BookAIcon,
  },
  {
    title: "Tutors",
    to: "/tutors",
    icon: UserRoundIcon,
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
    title: "Study Sentences",
    to: "/practice",
    icon: NotebookPenIcon,
  },
  {
    title: "My Writing",
    to: "/my-writing",
    icon: PenLineIcon,
    children: [
      {
        title: "My Sentences",
        to: "/my-sentences",
        icon: PencilRulerIcon,
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
    title: "Reading Session",
    to: "/reading-sessions",
    icon: BookOpenIcon,
  },
  {
    title: "Drills",
    icon: DrillIcon,
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
        {/* Primary action — capture new text. */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Capture"
                isActive={isItemActive(pathname, "/capture")}
                className="
                  bg-primary text-primary-foreground
                  hover:bg-primary/90 hover:text-primary-foreground
                  active:bg-primary/90 active:text-primary-foreground
                  data-[active=true]:bg-primary
                  data-[active=true]:text-primary-foreground
                "
              >
                <Link to="/capture">
                  <CameraIcon />
                  <span>Capture</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Start Lesson"
                isActive={isItemActive(pathname, "/lessons/new")}
              >
                <Link to="/lessons/new">
                  <BookAIcon />
                  <span>Start Lesson</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Action</SidebarGroupLabel>
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
                    key={item.to}
                    item={item}
                    pathname={pathname}
                  />
                ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Collections</SidebarGroupLabel>
          <SidebarMenu>
            {collectionsItems.map(item => (
              <NavItem
                key={item.to}
                item={item}
                pathname={pathname}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarMenu>
            {libraryItems.map(item => (
              <NavItem
                key={item.to}
                item={item}
                pathname={pathname}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
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
