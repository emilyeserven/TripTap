import type { CreateTripInput } from "@triptap/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { tripsApi } from "../lib/api";

const TRIPS_KEY = ["trips"] as const;

export function useTrips() {
  return useQuery({
    queryKey: TRIPS_KEY,
    queryFn: tripsApi.list,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripInput) => tripsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: TRIPS_KEY,
    }),
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tripsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: TRIPS_KEY,
    }),
  });
}
