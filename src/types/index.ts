export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string; // ISO 8601
  level: LogLevel;
  service: string;
  message: string;
  traceId: string;
  context: {
    requestId?: string;
    userId?: string;
    endpoint?: string;
    method?: string;
  };
  metadata?: {
    stackTrace?: string;
    thread?: string;
    logger?: string;
  };
}

export interface MetricPoint {
  timestamp: number; // Unix milliseconds
  metric_name: string;
  value: number;
  labels: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram';
}

export interface Service {
  name: string;
  version: string;
  type: 'backend' | 'frontend' | 'gateway';
  language: string;
  dependencies: string[];
  endpoints: Array<{
    path: string;
    method: string;
  }>;
}

export interface BugScenario {
  id: string;
  name: string;
  service: string;
  startTime: string; // Relative time like "-2h" (2 hours ago)
  symptoms: {
    logPatterns: string[]; // Error message templates
    metricName: string;
    metricTrend: 'increasing' | 'spiking' | 'constant_high';
  };
}
