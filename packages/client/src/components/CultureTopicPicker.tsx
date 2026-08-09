import { MultiSelect } from "@/components/ui/multi-select";
import { useCreateCultureTopic, useCultureTopics } from "@/hooks/useCultureTopics";

/**
 * Multi-select over the culture-topic taxonomy, with inline "Create …" for a topic that doesn't
 * exist yet (the TermPicker pattern). Selected ids that no longer resolve to a topic simply don't
 * render — deleting a topic degrades gracefully.
 */
export function CultureTopicPicker({
  value,
  onChange,
  ariaLabel = "Topics",
}: {
  value: string[];
  onChange: (topicIds: string[]) => void;
  ariaLabel?: string;
}) {
  const {
    data: topics, isLoading,
  } = useCultureTopics();
  const createTopic = useCreateCultureTopic();

  const options = (topics ?? []).map(t => ({
    value: t.id,
    label: t.name,
  }));

  async function handleCreate(name: string) {
    try {
      const created = await createTopic.mutateAsync({
        name,
      });
      onChange([...value, created.id]);
    }
    catch {
      // The hook already toasts; the typed name is preserved for a retry.
    }
  }

  return (
    <MultiSelect
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
      placeholder="Add topics…"
      searchPlaceholder="Search or create a topic…"
      creatable
      onCreate={name => void handleCreate(name)}
      creating={createTopic.isPending}
      emptyText={isLoading ? "Loading topics…" : "No topics yet — type to create one."}
    />
  );
}
