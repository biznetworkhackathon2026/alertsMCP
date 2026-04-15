import { QueryPrometheusMetricsSchema } from '../types/schemas.js';
import { generateMetrics } from '../generators/metric-generator.js';
import { parseTimeRange } from '../generators/time-utils.js';
import { MetricPoint } from '../types/index.js';

export const queryPrometheusMetricsTool = {
  name: 'query_prometheus_metrics',
  description: 'Query Prometheus metrics in native Prometheus exposition format. Returns time-series data for gauges (memory, CPU, connections), counters (requests, errors), and histograms (latency). Useful for detecting performance degradation, resource exhaustion, and error rate spikes.',
  inputSchema: {
    type: 'object',
    properties: {
      metric_name: {
        type: 'string',
        description: 'Prometheus metric name (e.g., "memory_usage_bytes", "errors_total", "http_requests_total", "connection_pool_active", "cpu_usage_percent")',
      },
      service_name: { type: 'string', description: 'Filter by service name (e.g., "auth-service")' },
      start_time: { type: 'string', description: 'Start time (ISO 8601 or relative like "-6h")' },
      end_time: { type: 'string', description: 'End time (ISO 8601 or relative)' },
    },
    required: ['metric_name'],
  },
};

export async function handleQueryPrometheusMetrics(args: unknown) {
  const params = QueryPrometheusMetricsSchema.parse(args);
  const { start, end } = parseTimeRange(params.start_time, params.end_time, '1h');

  const metrics = generateMetrics({
    metricName: params.metric_name,
    service: params.service_name,
    startTime: start,
    endTime: end,
  });

  // Format as Prometheus exposition format (full)
  const prometheusText = formatPrometheusExposition(metrics);

  // Also provide structured data for analysis
  const analysis = analyzeMetricTrend(metrics);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'success',
          data: {
            resultType: 'matrix',
            result: [
              {
                metric: {
                  __name__: params.metric_name,
                  service: params.service_name || 'all',
                },
                values: metrics.map(m => [m.timestamp / 1000, m.value.toString()]),
              },
            ],
          },
          prometheus_format: prometheusText,
          analysis: {
            metric_name: params.metric_name,
            service: params.service_name || 'all',
            data_points: metrics.length,
            time_range: {
              start: start.toISOString(),
              end: end.toISOString(),
            },
            trend: analysis.trend,
            min_value: analysis.min,
            max_value: analysis.max,
            avg_value: analysis.avg,
            current_value: metrics.length > 0 ? metrics[metrics.length - 1].value : 0,
            anomaly_detected: analysis.anomalyDetected,
          },
        }, null, 2),
      },
    ],
  };
}

function formatPrometheusExposition(metrics: MetricPoint[]): string {
  if (metrics.length === 0) return '';

  const type = metrics[0].type;
  const name = metrics[0].metric_name;

  let result = `# HELP ${name} ${getMetricHelp(name)}\n`;
  result += `# TYPE ${name} ${type}\n`;

  // Show sample of data points
  for (const m of metrics.slice(0, 50)) {
    const labels = Object.entries(m.labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    result += `${name}{${labels}} ${m.value.toFixed(2)} ${m.timestamp}\n`;
  }

  if (metrics.length > 50) {
    result += `# ... ${metrics.length - 50} more data points\n`;
  }

  return result;
}

function getMetricHelp(metricName: string): string {
  const helps: Record<string, string> = {
    'memory_usage_bytes': 'Current memory usage in bytes',
    'cpu_usage_percent': 'CPU usage percentage',
    'errors_total': 'Total number of errors',
    'http_requests_total': 'Total number of HTTP requests',
    'connection_pool_active': 'Number of active database connections',
    'http_request_duration_seconds': 'HTTP request latency in seconds',
  };
  return helps[metricName] || 'Metric value';
}

function analyzeMetricTrend(metrics: MetricPoint[]): {
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  min: number;
  max: number;
  avg: number;
  anomalyDetected: boolean;
} {
  if (metrics.length === 0) {
    return { trend: 'stable', min: 0, max: 0, avg: 0, anomalyDetected: false };
  }

  const values = metrics.map(m => m.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Calculate trend
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (Math.abs(changePercent) < 5) {
    trend = 'stable';
  } else if (changePercent > 5) {
    trend = 'increasing';
  } else {
    trend = 'decreasing';
  }

  // Check for volatility (large swings)
  const stdDev = Math.sqrt(
    values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
  );
  if (stdDev > avg * 0.5) {
    trend = 'volatile';
  }

  // Detect anomalies (values > 2x avg or sudden spikes)
  const anomalyDetected = values.some(v => v > avg * 2) || trend === 'volatile';

  return { trend, min, max, avg, anomalyDetected };
}
