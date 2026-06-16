import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Track your trips</h1>
      <p className="text-slate-600">
        TripTap is a self-deployable app for keeping tabs on your trips. Head to the
        {" "}
        <Link
          to="/trips"
          className="
            font-medium text-blue-600
            hover:underline
          "
        >
          Trips
        </Link>
        {" "}
        page to add your first one.
      </p>
    </section>
  );
}
