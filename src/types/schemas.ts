import { z } from 'zod';

export const FetchKibanaLogsSchema = z.object({
  service_name: z.string().optional(),
  log_level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional(),
  start_time: z.string().optional(), // ISO timestamp or relative like "-1h"
  end_time: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  search_query: z.string().optional(),
});

export const QueryPrometheusMetricsSchema = z.object({
  metric_name: z.string(),
  service_name: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
});
