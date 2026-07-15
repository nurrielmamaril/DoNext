import { z } from "zod";

export const listSchema = z.object({
  name: z.string().trim().min(1, "List name is required").max(80),
  color: z.string().nullable().optional(),
});
export type ListInput = z.infer<typeof listSchema>;
