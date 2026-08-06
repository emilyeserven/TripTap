import { SkillCard } from "@/components/SkillCard";
// The skill's markdown, imported raw so the textarea can never drift from the file.
import skillMd from "@/content/practice-breakdown-skill.md?raw";

/** Shows the sentence-breakdown skill in a copyable textarea, with its install path. */
export function PracticeBreakdownSkillCard() {
  return (
    <SkillCard
      title="Sentence-breakdown skill"
      markdown={skillMd}
      ariaLabel="Sentence-breakdown skill (SKILL.md)"
      description={(
        <>
          Copy or download this into Claude so it can break a single sentence down into valid practice
          JSON — reading, translation, target, word/grammar notes. Save it as
          {" "}
          <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">
            ~/.claude/skills/sentence-bank-breakdown/SKILL.md
          </code>
          .
        </>
      )}
    />
  );
}
