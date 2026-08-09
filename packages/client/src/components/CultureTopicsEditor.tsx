import { CultureTopicPicker } from "./CultureTopicPicker";

import { useUpdateAiLessonCultureTopics } from "@/hooks/useAiLessons";

/**
 * The topic tagger slotted into an AI-lesson culture card's footer on the unified Culture page.
 * Each change PATCHes the card's `topicIds` directly — AI-lesson culture joins the taxonomy
 * without being copied into a note.
 */
export function CultureTopicsEditor({
  cultureId,
  topicIds,
}: {
  cultureId: string;
  topicIds: string[] | null;
}) {
  const update = useUpdateAiLessonCultureTopics();
  return (
    <CultureTopicPicker
      value={topicIds ?? []}
      ariaLabel="Culture topics"
      onChange={ids => update.mutate({
        id: cultureId,
        topicIds: ids,
      })}
    />
  );
}
