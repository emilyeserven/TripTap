import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Build your sentence bank</h1>
      <p className="text-slate-600">
        sentence-bank is a self-deployable app for building your personal bank of example sentences.
        Head to the
        {" "}
        <Link
          to="/sentences"
          className="
            font-medium text-blue-600
            hover:underline
          "
        >
          Sentences
        </Link>
        {" "}
        page to add your first one.
      </p>
    </section>
  );
}
