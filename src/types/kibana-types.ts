export interface KibanaLogEntry {
  '@timestamp': string; // ISO 8601
  '@version': string;
  message: string;
  level: 'ERROR' | 'FATAL';
  level_value: number;
  logger_name: string;
  thread_name: string;
  application: {
    name: string;
    version: string;
  };
  host: {
    name: string;
    ip: string;
  };
  exception?: {
    exception_class: string;
    exception_message: string;
    stacktrace: string;
  };
  context: {
    trace_id: string;
    span_id: string;
    user_id?: string;
    request_id?: string;
    endpoint?: string;
  };
  tags: string[];
  fields: Record<string, any>;
}
