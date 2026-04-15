import { fetchKibanaLogsTool, handleFetchKibanaLogs } from './fetch-kibana-logs.js';
import { queryPrometheusMetricsTool, handleQueryPrometheusMetrics } from './query-prometheus-metrics.js';

export const tools = [
  fetchKibanaLogsTool,
  queryPrometheusMetricsTool,
];

export const toolHandlers: Record<string, (args: unknown) => Promise<any>> = {
  fetch_kibana_logs: handleFetchKibanaLogs,
  query_prometheus_metrics: handleQueryPrometheusMetrics,
};
