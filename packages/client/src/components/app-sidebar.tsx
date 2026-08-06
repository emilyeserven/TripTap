import type { NavDestination, NavParent } from "@/lib/nav";
import type * as React from "react";

import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDownIcon, ChevronRightIcon, LibraryIcon } from "lucide-react";

import { PwaUpdateItem } from "@/components/PwaUpdateItem";
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
import { useLearnerProfile } from "@/hooks/useSettings";
import { useXpSummary } from "@/hooks/useXp";
import { navFooterItems, navSections, startSomething } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isItemActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  // `/ai-lessons` shouldn't stay active on `/ai-lessons/new` sub-navigation beyond its own prefix.
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavItem({
  item,
  pathname,
}: {
  item: NavDestination;
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
  item: NavParent;
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

  // Drive the Start Something button as a daily-XP progress meter: fill = today's XP toward the goal,
  // and a glow once the goal is met. Shares the Start page's cached queries, so no extra request.
  const summary = useXpSummary();
  const profile = useLearnerProfile();
  const todayXp = summary.data?.today.totalXp ?? 0;
  const dailyGoal = profile.data?.dailyXpGoal ?? null;
  const hasGoal = dailyGoal !== null && dailyGoal > 0;
  const fillPercent = hasGoal ? Math.min(100, (todayXp / dailyGoal) * 100) : 100;
  const goalMet = hasGoal && todayXp >= dailyGoal;

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
        {/* Primary action — the Start Something page is its own top-level link. */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isItemActive(pathname, startSomething.to)}
                tooltip={startSomething.title}
                className={cn(
                  // Solid primary with its own foreground — the readable pairing in both themes.
                  // Progress rides as a slim bar along the bottom edge, clear of the label so the
                  // text contrast never depends on the fill width.
                  `
                    relative h-10 overflow-hidden border border-primary/60
                    bg-primary font-medium text-primary-foreground
                    hover:bg-primary hover:text-primary-foreground
                  `,
                  goalMet && `
                    animate-pulse border-primary shadow-[0_0_12px_2px] ring-1
                    shadow-primary/50 ring-primary
                  `,
                )}
              >
                <Link to={startSomething.to}>
                  <startSomething.icon className="relative z-10" />
                  <span className="relative z-10">{startSomething.title}</span>
                  {/* Progress bar: today's XP toward the daily goal, along the bottom edge. */}
                  <span
                    aria-hidden
                    className="
                      absolute inset-x-0 bottom-0 z-0 h-1.5
                      bg-primary-foreground/25
                    "
                  />
                  <span
                    aria-hidden
                    className="
                      absolute bottom-0 left-0 z-0 h-1.5 bg-primary-foreground
                      transition-[width] duration-500
                    "
                    style={{
                      width: `${fillPercent}%`,
                    }}
                  />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Action first — the "start a task" entry points sit directly below Start Something. */}
        {navSections.map(section => (
          <NavSection
            key={section.label}
            label={section.label}
          >
            <SidebarMenu>
              {section.items.map(item =>
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
          </NavSection>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <PwaUpdateItem />
          {navFooterItems.map(item => (
            <NavItem
              key={item.to}
              item={item}
              pathname={pathname}
            />
          ))}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
