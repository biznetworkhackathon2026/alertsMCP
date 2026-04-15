import { LogEntry, LogLevel, BugScenario } from '../types/index.js';
import { SERVICES } from '../data/services.js';
import { SCENARIOS } from '../data/scenarios.js';
import { parseRelativeTime } from './time-utils.js';

export function generateLogs(params: {
  startTime: Date;
  endTime: Date;
  services?: string[];
  level?: LogLevel;
  searchQuery?: string;
  limit: number;
}): LogEntry[] {
  const logs: LogEntry[] = [];
  const servicesFilter = params.services || SERVICES.map(s => s.name);

  // Generate baseline logs for each service
  for (const serviceName of servicesFilter) {
    logs.push(...generateBaselineLogs(serviceName, params.startTime, params.endTime));
  }

  // Inject bug scenario logs
  for (const scenario of SCENARIOS) {
    if (servicesFilter.includes(scenario.service)) {
      logs.push(...generateScenarioLogs(scenario, params.startTime, params.endTime));
    }
  }

  // Sort by timestamp
  logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Apply filters
  let filtered = logs;
  if (params.level) {
    filtered = filtered.filter(log => log.level === params.level);
  }
  if (params.searchQuery) {
    filtered = filtered.filter(log =>
      log.message.toLowerCase().includes(params.searchQuery!.toLowerCase())
    );
  }

  // Apply limit
  return filtered.slice(0, params.limit);
}

function generateBaselineLogs(service: string, start: Date, end: Date): LogEntry[] {
  const logs: LogEntry[] = [];
  const durationMs = end.getTime() - start.getTime();
  const numLogs = Math.floor(durationMs / (5 * 1000)); // Log every 5 seconds

  for (let i = 0; i < numLogs; i++) {
    const timestamp = new Date(start.getTime() + (i * 5 * 1000));
    const level = pickRandomLevel([0.7, 0.2, 0.08, 0.02]); // 70% INFO, 20% DEBUG, 8% WARN, 2% ERROR

    logs.push({
      timestamp: timestamp.toISOString(),
      level,
      service,
      message: generateBaselineMessage(service, level),
      traceId: generateTraceId(),
      context: {
        requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
        endpoint: pickRandomEndpoint(service),
      },
    });
  }

  return logs;
}

function generateScenarioLogs(scenario: BugScenario, start: Date, end: Date): LogEntry[] {
  const logs: LogEntry[] = [];
  const scenarioStart = parseRelativeTime(scenario.startTime, end); // Relative to "now" (end)

  if (scenarioStart < start || scenarioStart > end) {
    return []; // Scenario not in time range
  }

  // Generate error logs from scenario start to end
  const durationMs = end.getTime() - scenarioStart.getTime();
  const errorCount = getErrorCount(scenario.symptoms.metricTrend, durationMs);

  for (let i = 0; i < errorCount; i++) {
    const timestamp = new Date(
      scenarioStart.getTime() +
      (i / errorCount) * durationMs +
      Math.random() * (durationMs / errorCount)
    );

    logs.push({
      timestamp: timestamp.toISOString(),
      level: 'ERROR',
      service: scenario.service,
      message: pickRandom(scenario.symptoms.logPatterns),
      traceId: generateTraceId(),
      context: {
        requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
      },
      metadata: {
        stackTrace: generateStackTrace(scenario.service),
        thread: `http-nio-8080-exec-${Math.floor(Math.random() * 20)}`,
      },
    });
  }

  return logs;
}

function getErrorCount(trend: string, durationMs: number): number {
  const hours = durationMs / (1000 * 60 * 60);
  switch (trend) {
    case 'increasing': return Math.floor(hours * 5); // 5 errors per hour, increasing
    case 'spiking': return Math.floor(hours * 20); // 20 errors per hour
    case 'constant_high': return Math.floor(hours * 10); // 10 errors per hour
    default: return 0;
  }
}

// Helper functions
function pickRandomLevel(probabilities: number[]): LogLevel {
  const levels: LogLevel[] = ['INFO', 'DEBUG', 'WARN', 'ERROR'];
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (rand < cumulative) return levels[i];
  }
  return 'INFO';
}

function generateTraceId(): string {
  return `trace-${Math.random().toString(36).substr(2, 16)}`;
}

function generateBaselineMessage(service: string, level: LogLevel): string {
  const messages = {
    INFO: [
      `Request processed successfully`,
      `Cache hit for user data`,
      `Database query completed in 45ms`,
      `Successfully validated token`,
      `Processing request from user`,
    ],
    DEBUG: [
      `Entering method validateRequest()`,
      `Query parameters: {userId: 123}`,
      `Cache lookup: key=user:456`,
      `Loading configuration from config service`,
      `Serializing response payload`,
    ],
    WARN: [
      `Slow query detected (>1s)`,
      `Retry attempt 2/3 for external API`,
      `Connection pool at 80% capacity`,
      `High memory usage: 85% of heap`,
      `API rate limit approaching threshold`,
    ],
    ERROR: [
      `Request validation failed`,
      `External API returned 500`,
      `Database connection timeout`,
      `Authentication token expired`,
      `Failed to deserialize request body`,
    ],
  };
  return pickRandom(messages[level]);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomEndpoint(service: string): string {
  const svc = SERVICES.find(s => s.name === service);
  return svc ? pickRandom(svc.endpoints).path : '/api/unknown';
}

function generateStackTrace(service: string): string {
  // For employee-service-srv, generate Node.js stack traces
  if (service === 'employee-service-srv') {
    return `    at Object.srv.before (/app/srv/employee-service.js:${Math.floor(Math.random() * 30) + 56})
    at processTicksAndRejections (node:internal/process/task_queues:${Math.floor(Math.random() * 50) + 95})
    at async /app/node_modules/@sap/cds/lib/srv/Service.js:${Math.floor(Math.random() * 100) + 400}`;
  }

  // For other services, generate Java stack traces
  return `at com.example.${service}.Controller.process(Controller.java:${Math.floor(Math.random() * 200) + 1})
  at com.example.${service}.Service.handle(Service.java:${Math.floor(Math.random() * 100) + 1})
  at javax.servlet.http.HttpServlet.service(HttpServlet.java:731)`;
}
