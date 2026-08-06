import { SkillCard } from "@/components/SkillCard";
// The skill's markdown, imported raw so the textarea can never drift from the file.
import skillMd from "@/content/ai-lesson-skill.md?raw";

/** Shows the AI-Lesson-authoring skill in a copyable textarea, with its install path. */
export function SkillInstallCard() {
  return (
    <SkillCard
      title="AI-Lesson-authoring skill"
      markdown={skillMd}
      ariaLabel="AI Lesson skill (SKILL.md)"
      description={(
        <>
          Copy or download this into Claude so it can generate valid AI Lesson JSON — including
          dual-level N4/native content, and converting an existing JSX lesson artifact into the JSON.
          Save it as
          {" "}
          <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">
            ~/.claude/skills/sentence-bank-lesson/SKILL.md
          </code>
          .
        </>
      )}
    />
  );
}
