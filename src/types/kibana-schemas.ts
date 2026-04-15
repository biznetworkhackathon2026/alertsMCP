import { z } from 'zod';

export const FetchKibanaErrorsSchema = z.object({
  service_name: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  limit: z.number().min(1).max(500).default(50),
  exception_type: z.string().optional(), // Filter by exception class
});
