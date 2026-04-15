import { FetchKibanaLogsSchema } from '../types/schemas.js';
import { generateLogs } from '../generators/log-generator.js';
import { parseTimeRange } from '../generators/time-utils.js';
import { LogEntry } from '../types/index.js';

export const fetchKibanaLogsTool = {
  name: 'fetch_kibana_logs',
  description: 'Fetch application logs in Kibana format with full exception stack traces. Returns logs with detailed error information, trace context, and complete stack traces for debugging.',
  inputSchema: {
    type: 'object',
    properties: {
      service_name: { type: 'string', description: 'Filter by service name (e.g., "auth-service", "payment-service")' },
      log_level: { type: 'string', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR'], description: 'Filter by log level' },
      start_time: { type: 'string', description: 'Start time (ISO 8601 or relative like "-2h", "-30m")' },
      end_time: { type: 'string', description: 'End time (ISO 8601 or relative like "-30m")' },
      limit: { type: 'number', description: 'Max logs to return (1-1000, default: 100)', default: 100 },
      search_query: { type: 'string', description: 'Search text within log messages and stack traces' },
    },
  },
};

export async function handleFetchKibanaLogs(args: unknown) {
  const params = FetchKibanaLogsSchema.parse(args);
  const { start, end } = parseTimeRange(params.start_time, params.end_time, '1h');

  const logs = generateLogs({
    startTime: start,
    endTime: end,
    services: params.service_name ? [params.service_name] : undefined,
    level: params.log_level,
    searchQuery: params.search_query,
    limit: params.limit,
  });

  // Convert to Kibana format
  const kibanaLogs = logs.map(log => formatKibanaLog(log));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          took: 23,
          timed_out: false,
          _shards: { total: 5, successful: 5, skipped: 0, failed: 0 },
          hits: {
            total: { value: kibanaLogs.length, relation: 'eq' },
            max_score: 1.0,
            hits: kibanaLogs,
          },
          time_range: { start: start.toISOString(), end: end.toISOString() },
        }, null, 2),
      },
    ],
  };
}

function formatKibanaLog(log: LogEntry) {
  const baseSource: any = {
    '@timestamp': log.timestamp,
    'log.level': log.level,
    'service.name': log.service,
    message: log.message,
    labels: {
      service: log.service,
      level: log.level,
    },
    trace: {
      id: log.traceId,
    },
    ...log.context,
  };

  // Add full exception details for ERROR logs
  if (log.level === 'ERROR' && log.metadata?.stackTrace) {
    baseSource.error = {
      type: extractErrorType(log.message),
      message: log.message,
      stack_trace: log.metadata.stackTrace,
    };
    baseSource.exception = {
      type: extractErrorType(log.message),
      message: log.message,
      stacktrace: log.metadata.stackTrace.split('\n').map(line => line.trim()),
    };
    baseSource.log = {
      level: log.level,
      logger: log.metadata.logger || `${log.service}.Controller`,
    };
    baseSource.thread = {
      name: log.metadata.thread,
    };
  }

  return {
    _index: `logs-${log.service}-${new Date(log.timestamp).toISOString().split('T')[0]}`,
    _type: '_doc',
    _id: `${log.traceId}-${Date.now()}`,
    _score: 1.0,
    _source: baseSource,
  };
}

function extractErrorType(message: string): string {
  // Extract error class from message
  if (message.includes('JavaScript heap out of memory')) return 'Error [ERR_HEAP_OUT_OF_MEMORY]';
  if (message.includes('FATAL ERROR')) return 'FatalError';
  if (message.includes('Allocation failed')) return 'Error [ERR_MEMORY_ALLOCATION_FAILED]';
  if (message.includes('Search cache size exceeded')) return 'Error';
  if (message.includes('NullPointerException')) return 'java.lang.NullPointerException';
  if (message.includes('OutOfMemoryError')) return 'java.lang.OutOfMemoryError';
  if (message.includes('SQLException')) return 'java.sql.SQLException';
  if (message.includes('timeout')) return 'java.util.concurrent.TimeoutException';
  if (message.includes('Connection pool')) return 'org.apache.commons.dbcp2.PoolExhaustedException';
  return 'Error';
}
