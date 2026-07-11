import type * as React from "react";

import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpenIcon,
  CameraIcon,
  GraduationCapIcon,
  HomeIcon,
  ImagesIcon,
  LandmarkIcon,
  LanguagesIcon,
  LibraryIcon,
  ScrollTextIcon,
  SettingsIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

/** { Captures, Lessons } — source material to mine from. */
const libraryItems = [
  {
    title: "Home",
    to: "/",
    icon: HomeIcon,
  },
  {
    title: "Lessons",
    to: "/lessons",
    icon: GraduationCapIcon,
  },
  {
    title: "Captures",
    to: "/captures",
    icon: ImagesIcon,
  },
] as const;

/** The study bank itself. */
const studyItems = [
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
    title: "Vocab",
    to: "/vocab",
    icon: LibraryIcon,
  },
] as const;

function isItemActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  // `/lessons` shouldn't stay active on `/lessons/new` sub-navigation beyond its own prefix.
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

        <SidebarGroup>
          <SidebarGroupLabel>Study</SidebarGroupLabel>
          <SidebarMenu>
            {studyItems.map(item => (
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
