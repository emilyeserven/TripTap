import type { CultureTopic } from "@sentence-bank/types";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useCreateCultureTopic,
  useCultureTopics,
  useDeleteCultureTopic,
  useUpdateCultureTopic,
} from "@/hooks/useCultureTopics";

/** One topic: rename in place or delete. Keyed on `updatedAt` upstream so it remounts after a save. */
function TopicRow({
  topic,
}: { topic: CultureTopic }) {
  const update = useUpdateCultureTopic();
  const remove = useDeleteCultureTopic();
  const [name, setName] = useState(topic.name);

  const dirty = name.trim().length > 0 && name.trim() !== topic.name;
  const pending = update.isPending || remove.isPending;

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        aria-label={`Rename ${topic.name}`}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={!dirty || pending}
        onClick={() => update.mutate({
          id: topic.id,
          input: {
            name: name.trim(),
          },
        })}
      >
        Save
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={pending}
        onClick={() => {
          if (globalThis.confirm(`Delete the topic “${topic.name}”? Notes keep working — they just lose this tag.`)) {
            remove.mutate(topic.id);
          }
        }}
      >
        Delete
      </Button>
    </div>
  );
}

/**
 * The culture-topic taxonomy manager: add, rename, delete. Deleting never touches the notes or
 * AI-lesson cards that reference the topic — their stored ids simply stop resolving.
 */
export function CultureTopicsManager() {
  const {
    data: topics, isLoading, error,
  } = useCultureTopics();
  const create = useCreateCultureTopic();
  const [newName, setNewName] = useState("");

  const canAdd = newName.trim().length > 0 && !create.isPending;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        The topics your culture notes and AI-Lesson culture cards are filed under.
      </p>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canAdd) return;
          create.mutate({
            name: newName.trim(),
          }, {
            onSuccess: () => setNewName(""),
          });
        }}
      >
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New topic, e.g. Food"
          aria-label="New topic name"
        />
        <Button
          type="submit"
          disabled={!canAdd}
        >
          <Plus className="size-4" />
          Add
        </Button>
      </form>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-destructive">{error.message}</p> : null}

      <Card>
        <CardContent className="space-y-2 p-4">
          {(topics ?? []).map(topic => (
            <TopicRow
              key={`${topic.id}:${topic.updatedAt}`}
              topic={topic}
            />
          ))}
          {!isLoading && (topics ?? []).length === 0
            ? <p className="text-sm text-muted-foreground">No topics yet.</p>
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
