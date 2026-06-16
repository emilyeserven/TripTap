import type { Trip } from "@triptap/types";

interface TripCardProps {
  trip: Trip;
  onDelete?: (id: string) => void;
}

export function TripCard({
  trip, onDelete,
}: TripCardProps) {
  return (
    <article
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{trip.name}</h3>
          <p className="text-sm text-slate-600">{trip.destination}</p>
        </div>
        {onDelete
          ? (
            <button
              type="button"
              onClick={() => onDelete(trip.id)}
              className="
                text-sm text-red-600
                hover:underline
              "
            >
              Delete
            </button>
          )
          : null}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {trip.startDate} → {trip.endDate}
      </p>
      {trip.notes ? <p className="mt-2 text-sm text-slate-700">{trip.notes}</p> : null}
    </article>
  );
}
