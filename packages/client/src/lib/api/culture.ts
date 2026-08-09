/** Culture APIs: user-authored culture notes and the culture-topic taxonomy. */
import type {
  CreateCultureNoteInput,
  CreateCultureTopicInput,
  CultureNote,
  CultureTopic,
  UpdateCultureNoteInput,
  UpdateCultureTopicInput,
} from "@sentence-bank/types";

import { crudApi } from "./crud";

export const cultureNotesApi = crudApi<
  CultureNote,
  CreateCultureNoteInput,
  UpdateCultureNoteInput
>("/culture-notes");

export const cultureTopicsApi = crudApi<
  CultureTopic,
  CreateCultureTopicInput,
  UpdateCultureTopicInput
>("/culture-topics");
