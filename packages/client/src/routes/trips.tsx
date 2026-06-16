import { createFileRoute } from "@tanstack/react-router";

import { TripCard } from "../components/TripCard";
import { TripForm } from "../components/TripForm";
import { useDeleteTrip, useTrips } from "../hooks/useTrips";
import { useUiStore } from "../stores/uiStore";

export const Route = createFileRoute("/trips")({
  component: TripsPage,
});

function TripsPage() {
  const {
    data: trips, isLoading, error,
  } = useTrips();
  const deleteTrip = useDeleteTrip();
  const showPastTrips = useUiStore(state => state.showPastTrips);
  const toggleShowPastTrips = useUiStore(state => state.toggleShowPastTrips);

  const today = new Date().toISOString().slice(0, 10);
  const visibleTrips = (trips ?? []).filter(trip => showPastTrips || trip.endDate >= today);

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trips</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showPastTrips}
            onChange={toggleShowPastTrips}
          />
          Show past trips
        </label>
      </div>

      <TripForm />

      <div className="space-y-3">
        {isLoading ? <p className="text-slate-500">Loading trips…</p> : null}
        {error ? <p className="text-red-600">{error.message}</p> : null}
        {!isLoading && visibleTrips.length === 0 ? <p className="text-slate-500">No trips yet. Add one above.</p> : null}
        {visibleTrips.map(trip => (
          <TripCard
            key={trip.id}
            trip={trip}
            onDelete={id => deleteTrip.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}
