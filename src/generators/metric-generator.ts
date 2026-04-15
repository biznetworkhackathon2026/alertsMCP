import { MetricPoint, BugScenario } from '../types/index.js';
import { SCENARIOS } from '../data/scenarios.js';
import { parseRelativeTime } from './time-utils.js';

export function generateMetrics(params: {
  metricName: string;
  service?: string;
  startTime: Date;
  endTime: Date;
}): MetricPoint[] {
  const points: MetricPoint[] = [];
  const durationMs = params.endTime.getTime() - params.startTime.getTime();
  const numPoints = Math.min(Math.floor(durationMs / (60 * 1000)), 1000); // 1 point per minute, max 1000

  for (let i = 0; i < numPoints; i++) {
    const timestamp = params.startTime.getTime() + (i * (durationMs / numPoints));
    const value = generateMetricValue(
      params.metricName,
      params.service,
      new Date(timestamp),
      params.endTime
    );

    points.push({
      timestamp,
      metric_name: params.metricName,
      value,
      labels: { service: params.service || 'all' },
      type: getMetricType(params.metricName),
    });
  }

  return points;
}

function generateMetricValue(
  metricName: string,
  service: string | undefined,
  timestamp: Date,
  now: Date
): number {
  // Check if any scenario affects this metric
  const scenario = SCENARIOS.find(
    s => s.symptoms.metricName === metricName && (!service || s.service === service)
  );

  if (scenario) {
    const scenarioStart = parseRelativeTime(scenario.startTime, now);
    if (timestamp >= scenarioStart) {
      return generateScenarioMetricValue(scenario, timestamp, scenarioStart);
    }
  }

  // Baseline values
  return generateBaselineMetricValue(metricName);
}

function generateScenarioMetricValue(
  scenario: BugScenario,
  timestamp: Date,
  scenarioStart: Date
): number {
  const baseline = generateBaselineMetricValue(scenario.symptoms.metricName);
  const elapsedMs = timestamp.getTime() - scenarioStart.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  switch (scenario.symptoms.metricTrend) {
    case 'increasing':
      // Linear increase over time
      return baseline * (1 + elapsedHours * 0.1); // 10% increase per hour
    case 'spiking':
      // Random spikes
      return Math.random() > 0.7 ? baseline * 5 : baseline;
    case 'constant_high':
      // Constantly high
      return baseline * 3;
    default:
      return baseline;
  }
}

function generateBaselineMetricValue(metricName: string): number {
  const baselines: Record<string, number> = {
    'memory_usage_bytes': 500_000_000, // 500MB
    'cpu_usage_percent': 30,
    'errors_total': 2,
    'http_requests_total': 100,
    'connection_pool_active': 10,
    'http_request_duration_seconds': 0.15,
  };
  return baselines[metricName] || 0;
}

function getMetricType(metricName: string): 'counter' | 'gauge' | 'histogram' {
  if (metricName.includes('total')) return 'counter';
  if (metricName.includes('duration')) return 'histogram';
  return 'gauge';
}
