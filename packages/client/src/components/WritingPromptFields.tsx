import type { WritingPromptDifficulty } from "@sentence-bank/types";

import { DifficultySelect } from "@/components/DifficultySelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * The five labeled writing-prompt fields (titles, Japanese/English text, difficulty), shared by the
 * New-prompt dialog and the Edit-prompt page. The parent owns the field state.
 */
export function WritingPromptFields({
  title,
  titleEn,
  text,
  textEn,
  difficulty,
  onTitleChange,
  onTitleEnChange,
  onTextChange,
  onTextEnChange,
  onDifficultyChange,
}: {
  title: string;
  titleEn: string;
  text: string;
  textEn: string;
  difficulty: WritingPromptDifficulty;
  onTitleChange: (value: string) => void;
  onTitleEnChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onTextEnChange: (value: string) => void;
  onDifficultyChange: (value: WritingPromptDifficulty) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm">Japanese title</Label>
        <Input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="日本語のタイトル（任意）…"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">English title</Label>
        <Input
          value={titleEn}
          onChange={e => onTitleEnChange(e.target.value)}
          placeholder="English title (optional)…"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Japanese</Label>
        <Textarea
          value={text}
          onChange={e => onTextChange(e.target.value)}
          placeholder="日本語のプロンプト…"
          rows={3}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">English</Label>
        <Textarea
          value={textEn}
          onChange={e => onTextEnChange(e.target.value)}
          placeholder="English version (optional)…"
          rows={3}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Difficulty</Label>
        <DifficultySelect
          value={difficulty}
          onChange={onDifficultyChange}
        />
      </div>
    </div>
  );
}
