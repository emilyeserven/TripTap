import { createFileRoute, Link } from "@tanstack/react-router";

import { BackIcon, EditIcon, EntityDetailPage } from "@/components/EntityPage";
import { TutorView } from "@/components/TutorView";
import { useTutor } from "@/hooks/useTutors";

export const Route = createFileRoute("/tutors/$id/")({
  component: ViewTutorPage,
});

function ViewTutorPage() {
  const {
    id,
  } = Route.useParams();

  return (
    <EntityDetailPage
      query={useTutor(id)}
      noun="Tutor"
      backLink={(
        <Link to="/tutors">
          <BackIcon className="size-4" />
          All tutors
        </Link>
      )}
      editLink={(
        <Link
          to="/tutors/$id/edit"
          params={{
            id,
          }}
        >
          <EditIcon className="size-4" />
          Edit
        </Link>
      )}
    >
      {tutor => <TutorView tutor={tutor} />}
    </EntityDetailPage>
  );
}
