export async function handleLogSchema() {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'LogEntry',
    type: 'object',
    properties: {
      timestamp: { type: 'string', format: 'date-time', description: 'ISO 8601 timestamp' },
      level: { type: 'string', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR'] },
      service: { type: 'string', description: 'Service name that generated the log' },
      message: { type: 'string', description: 'Log message' },
      traceId: { type: 'string', description: 'Distributed trace ID' },
      context: {
        type: 'object',
        properties: {
          requestId: { type: 'string' },
          userId: { type: 'string' },
          endpoint: { type: 'string' },
          method: { type: 'string' },
        },
      },
      metadata: {
        type: 'object',
        properties: {
          stackTrace: { type: 'string' },
          thread: { type: 'string' },
          logger: { type: 'string' },
        },
      },
    },
    required: ['timestamp', 'level', 'service', 'message', 'traceId'],
  };

  return {
    contents: [
      {
        uri: 'logs://schemas/log-entry',
        mimeType: 'application/json',
        text: JSON.stringify(schema, null, 2),
      },
    ],
  };
}
