import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { TutorForm } from "@/components/TutorForm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteTutor, useTutor } from "@/hooks/useTutors";

export const Route = createFileRoute("/tutors/$id/edit")({
  component: EditTutorPage,
});

function EditTutorPage() {
  usePageTitle("Edit tutor");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteTutor = useDeleteTutor();

  return (
    <EntityEditPage
      query={useTutor(id)}
      noun="Tutor"
      backLink={(
        <Link
          to="/tutors/$id"
          params={{
            id,
          }}
        >
          <BackIcon className="size-4" />
          Back to tutor
        </Link>
      )}
      deletePending={deleteTutor.isPending}
      onDelete={() =>
        deleteTutor.mutate(id, {
          onSuccess: () => navigate({
            to: "/tutors",
          }),
        })}
    >
      {tutor => (
        <TutorForm
          tutor={tutor}
          onSuccess={() =>
            navigate({
              to: "/tutors/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
