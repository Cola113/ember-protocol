import { z } from "zod";

/** Public contract version shared by every P2 boundary. */
export const ContractVersionSchema = z.literal("v1");
export type ContractVersion = z.infer<typeof ContractVersionSchema>;

export const ContractErrorCodeSchema = z.enum([
  "validation_error",
  "canon_violation",
  "model_unavailable",
  "cache_hit"
]);
export type ContractErrorCode = z.infer<typeof ContractErrorCodeSchema>;

export const ContractErrorSchema = z.object({
  error: ContractErrorCodeSchema,
  message: z.string().min(1),
  retryable: z.boolean(),
  degraded: z.boolean(),
  fallback: z.string().min(1).optional()
}).strict();
export type ContractError = z.infer<typeof ContractErrorSchema>;

export function validationError(message: string): ContractError {
  return { error: "validation_error", message, retryable: false, degraded: false };
}

export function modelUnavailable(message: string, fallback: string): ContractError {
  return { error: "model_unavailable", message, retryable: true, degraded: true, fallback };
}
