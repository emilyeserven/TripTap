import type { FastifyInstance } from "fastify";
import type { CreateTripInput, UpdateTripInput } from "@triptap/types";
import { createTrip, deleteTrip, getTrip, listTrips, updateTrip } from "@/services/trips";
import { isValidDateRange } from "@/utils/dates";

const tripParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const createTripBody = {
  type: "object",
  required: ["name", "destination", "startDate", "endDate"],
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      minLength: 1,
    },
    destination: {
      type: "string",
      minLength: 1,
    },
    startDate: {
      type: "string",
    },
    endDate: {
      type: "string",
    },
    notes: {
      type: ["string", "null"],
    },
  },
} as const;

const updateTripBody = {
  type: "object",
  additionalProperties: false,
  properties: createTripBody.properties,
} as const;

/** CRUD routes for trips, mounted under `/api/trips`. */
export async function tripRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/trips", {
    schema: {
      tags: ["trips"],
    },
  }, async () => listTrips());

  app.get("/api/trips/:id", {
    schema: {
      tags: ["trips"],
      params: tripParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const trip = await getTrip(id);
    if (!trip) return reply.code(404).send({
      message: "Trip not found",
    });
    return trip;
  });

  app.post("/api/trips", {
    schema: {
      tags: ["trips"],
      body: createTripBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateTripInput;
    if (!isValidDateRange(input.startDate, input.endDate)) {
      return reply.code(400).send({
        message: "endDate must be a valid date on or after startDate",
      });
    }
    const trip = await createTrip(input);
    return reply.code(201).send(trip);
  });

  app.patch(
    "/api/trips/:id",
    {
      schema: {
        tags: ["trips"],
        params: tripParams,
        body: updateTripBody,
      },
    },
    async (req, reply) => {
      const {
        id,
      } = req.params as { id: string };
      const trip = await updateTrip(id, req.body as UpdateTripInput);
      if (!trip) return reply.code(404).send({
        message: "Trip not found",
      });
      return trip;
    },
  );

  app.delete("/api/trips/:id", {
    schema: {
      tags: ["trips"],
      params: tripParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteTrip(id);
    if (!deleted) return reply.code(404).send({
      message: "Trip not found",
    });
    return reply.code(204).send();
  });
}
