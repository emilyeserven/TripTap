import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { useCreateTrip } from "../hooks/useTrips";

const tripSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    destination: z.string().min(1, "Destination is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    notes: z.string(),
  })
  .refine(value => value.endDate >= value.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

const fieldClass
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

/** Create-trip form. Owns its own mutation so the page stays focused on the list. */
export function TripForm() {
  const createTrip = useCreateTrip();

  const form = useForm({
    defaultValues: {
      name: "",
      destination: "",
      startDate: "",
      endDate: "",
      notes: "",
    },
    validators: {
      onChange: tripSchema,
    },
    onSubmit: async ({
      value,
    }) => {
      await createTrip.mutateAsync({
        ...value,
        notes: value.notes || null,
      });
      form.reset();
    },
  });

  return (
    <form
      className="
        grid gap-4 rounded-lg border border-slate-200 bg-white p-4
        sm:grid-cols-2
      "
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {field => (
          <TextField
            label="Name"
            value={field.state.value}
            errors={field.state.meta.errors}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <form.Field name="destination">
        {field => (
          <TextField
            label="Destination"
            value={field.state.value}
            errors={field.state.meta.errors}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <form.Field name="startDate">
        {field => (
          <TextField
            label="Start date"
            type="date"
            value={field.state.value}
            errors={field.state.meta.errors}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <form.Field name="endDate">
        {field => (
          <TextField
            label="End date"
            type="date"
            value={field.state.value}
            errors={field.state.meta.errors}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <form.Field name="notes">
        {field => (
          <label
            className="
              block text-sm font-medium text-slate-700
              sm:col-span-2
            "
          >
            Notes
            <textarea
              className={fieldClass}
              rows={2}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={event => field.handleChange(event.target.value)}
            />
          </label>
        )}
      </form.Field>

      <div className="sm:col-span-2">
        <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              disabled={!canSubmit}
              className="
                rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white
                hover:bg-blue-700
                disabled:opacity-50
              "
            >
              {isSubmitting ? "Saving…" : "Add trip"}
            </button>
          )}
        </form.Subscribe>
        {createTrip.isError ? <p className="mt-2 text-sm text-red-600">{createTrip.error?.message}</p> : null}
      </div>
    </form>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  errors: unknown[];
  type?: string;
  onBlur: () => void;
  onChange: (value: string) => void;
}

function TextField({
  label, value, errors, type = "text", onBlur, onChange,
}: TextFieldProps) {
  const messages = errors
    .map(error => (typeof error === "string" ? error : (error as { message?: string })?.message))
    .filter(Boolean);

  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        className={fieldClass}
        value={value}
        onBlur={onBlur}
        onChange={event => onChange(event.target.value)}
      />
      {messages.length > 0 ? <span className="mt-1 block text-xs text-red-600">{messages.join(", ")}</span> : null}
    </label>
  );
}
