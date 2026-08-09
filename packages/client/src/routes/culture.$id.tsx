import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/culture/$id")({
  component: Outlet,
});
