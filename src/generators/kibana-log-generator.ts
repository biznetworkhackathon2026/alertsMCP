import { KibanaLogEntry } from '../types/kibana-types.js';
import { SERVICES } from '../data/services.js';
import { SCENARIOS } from '../data/scenarios.js';
import { parseRelativeTime } from './time-utils.js';

export function generateKibanaLogs(params: {
  startTime: Date;
  endTime: Date;
  services?: string[];
  exceptionType?: string;
  limit: number;
}): KibanaLogEntry[] {
  const logs: KibanaLogEntry[] = [];
  const servicesFilter = params.services || SERVICES.map(s => s.name);

  // Generate scenario-based error logs only
  for (const scenario of SCENARIOS) {
    if (servicesFilter.includes(scenario.service)) {
      logs.push(...generateKibanaScenarioLogs(scenario, params.startTime, params.endTime));
    }
  }

  // Add some baseline errors too
  for (const serviceName of servicesFilter) {
    logs.push(...generateKibanaBaselineErrors(serviceName, params.startTime, params.endTime));
  }

  // Sort by timestamp
  logs.sort((a, b) => new Date(a['@timestamp']).getTime() - new Date(b['@timestamp']).getTime());

  // Apply exception type filter
  let filtered = logs;
  if (params.exceptionType) {
    filtered = filtered.filter(log =>
      log.exception?.exception_class.toLowerCase().includes(params.exceptionType!.toLowerCase())
    );
  }

  // Apply limit
  return filtered.slice(0, params.limit);
}

function generateKibanaScenarioLogs(scenario: any, start: Date, end: Date): KibanaLogEntry[] {
  const logs: KibanaLogEntry[] = [];
  const scenarioStart = parseRelativeTime(scenario.startTime, end);

  if (scenarioStart < start || scenarioStart > end) {
    return [];
  }

  const durationMs = end.getTime() - scenarioStart.getTime();
  const errorCount = getErrorCount(scenario.symptoms.metricTrend, durationMs);

  for (let i = 0; i < errorCount; i++) {
    const timestamp = new Date(
      scenarioStart.getTime() +
      (i / errorCount) * durationMs +
      Math.random() * (durationMs / errorCount)
    );

    const service = SERVICES.find(s => s.name === scenario.service)!;
    const exceptionDetails = generateExceptionForScenario(scenario);

    logs.push({
      '@timestamp': timestamp.toISOString(),
      '@version': '1',
      message: exceptionDetails.message,
      level: 'ERROR',
      level_value: 40000,
      logger_name: `com.example.${scenario.service.replace(/-/g, '.')}.${exceptionDetails.className}`,
      thread_name: `http-nio-${8080 + Math.floor(Math.random() * 3)}-exec-${Math.floor(Math.random() * 50)}`,
      application: {
        name: scenario.service,
        version: service.version,
      },
      host: {
        name: `${scenario.service}-${Math.floor(Math.random() * 5)}`,
        ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      },
      exception: {
        exception_class: exceptionDetails.exceptionClass,
        exception_message: exceptionDetails.message,
        stacktrace: exceptionDetails.stacktrace,
      },
      context: {
        trace_id: generateTraceId(),
        span_id: generateSpanId(),
        request_id: `req-${Math.random().toString(36).substr(2, 12)}`,
        user_id: `user-${Math.floor(Math.random() * 10000)}`,
        endpoint: pickRandomEndpoint(scenario.service),
      },
      tags: ['error', 'production', scenario.id],
      fields: {
        environment: 'production',
        datacenter: 'us-east-1',
        pod_name: `${scenario.service}-${Math.random().toString(36).substr(2, 8)}`,
      },
    });
  }

  return logs;
}

function generateKibanaBaselineErrors(service: string, start: Date, end: Date): KibanaLogEntry[] {
  const logs: KibanaLogEntry[] = [];
  const durationMs = end.getTime() - start.getTime();
  const hours = durationMs / (1000 * 60 * 60);
  const errorCount = Math.floor(hours * 2); // 2 baseline errors per hour

  const baselineExceptions = [
    {
      class: 'java.net.SocketTimeoutException',
      message: 'Read timed out',
      stackPrefix: 'SocketInputStream.socketRead0',
    },
    {
      class: 'com.fasterxml.jackson.databind.JsonMappingException',
      message: 'Cannot deserialize value of type `java.lang.String` from Object value',
      stackPrefix: 'JsonMappingException.from',
    },
    {
      class: 'org.springframework.web.client.HttpClientErrorException$BadRequest',
      message: '400 Bad Request: Invalid request parameters',
      stackPrefix: 'HttpClientErrorException.create',
    },
  ];

  for (let i = 0; i < errorCount; i++) {
    const timestamp = new Date(start.getTime() + Math.random() * durationMs);
    const exc = pickRandom(baselineExceptions);
    const svc = SERVICES.find(s => s.name === service)!;

    logs.push({
      '@timestamp': timestamp.toISOString(),
      '@version': '1',
      message: exc.message,
      level: 'ERROR',
      level_value: 40000,
      logger_name: `com.example.${service.replace(/-/g, '.')}.Controller`,
      thread_name: `http-nio-8080-exec-${Math.floor(Math.random() * 50)}`,
      application: {
        name: service,
        version: svc.version,
      },
      host: {
        name: `${service}-${Math.floor(Math.random() * 5)}`,
        ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      },
      exception: {
        exception_class: exc.class,
        exception_message: exc.message,
        stacktrace: generateGenericStackTrace(service, exc.class, exc.stackPrefix),
      },
      context: {
        trace_id: generateTraceId(),
        span_id: generateSpanId(),
        request_id: `req-${Math.random().toString(36).substr(2, 12)}`,
        endpoint: pickRandomEndpoint(service),
      },
      tags: ['error', 'production'],
      fields: {
        environment: 'production',
        datacenter: 'us-east-1',
      },
    });
  }

  return logs;
}

function generateExceptionForScenario(scenario: any): {
  exceptionClass: string;
  className: string;
  message: string;
  stacktrace: string;
} {
  const scenarioExceptions: Record<string, any> = {
    'memory-leak-auth': {
      exceptionClass: 'java.lang.OutOfMemoryError',
      className: 'TokenCacheManager',
      message: 'Java heap space',
      stacktrace: `java.lang.OutOfMemoryError: Java heap space
\tat java.util.HashMap.resize(HashMap.java:704)
\tat java.util.HashMap.putVal(HashMap.java:663)
\tat java.util.HashMap.put(HashMap.java:612)
\tat com.example.auth.cache.TokenCacheManager.cacheToken(TokenCacheManager.java:89)
\tat com.example.auth.service.AuthenticationService.generateToken(AuthenticationService.java:156)
\tat com.example.auth.controller.AuthController.login(AuthController.java:67)
\tat jdk.internal.reflect.GeneratedMethodAccessor45.invoke(Unknown Source)
\tat java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
\tat java.base/java.lang.reflect.Method.invoke(Method.java:566)
\tat org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)
\tat org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:150)
\tat org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:117)
\tat org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod(RequestMappingHandlerAdapter.java:895)
\tat org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:808)
\tat org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:87)
\tat org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1067)
\tat org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:963)
\tat org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1006)
\tat org.springframework.web.servlet.FrameworkServlet.doPost(FrameworkServlet.java:909)
\tat javax.servlet.http.HttpServlet.service(HttpServlet.java:681)
\tat org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)
\tat javax.servlet.http.HttpServlet.service(HttpServlet.java:764)
\tat org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:227)
\tat org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)
\tat org.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:53)`,
    },
    'null-pointer-payment': {
      exceptionClass: 'java.lang.NullPointerException',
      className: 'PaymentProcessor',
      message: 'Cannot invoke "com.example.payment.model.Amount.getValue()" because "amount" is null',
      stacktrace: `java.lang.NullPointerException: Cannot invoke "com.example.payment.model.Amount.getValue()" because "amount" is null
\tat com.example.payment.processor.PaymentProcessor.validateAmount(PaymentProcessor.java:145)
\tat com.example.payment.processor.PaymentProcessor.processPayment(PaymentProcessor.java:89)
\tat com.example.payment.service.PaymentService.process(PaymentService.java:67)
\tat com.example.payment.controller.PaymentController.processPayment(PaymentController.java:112)
\tat jdk.internal.reflect.GeneratedMethodAccessor89.invoke(Unknown Source)
\tat java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
\tat java.base/java.lang.reflect.Method.invoke(Method.java:566)
\tat org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)
\tat org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:150)
\tat org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:117)
\tat org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod(RequestMappingHandlerAdapter.java:895)
\tat org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:808)
\tat org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:87)
\tat org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1067)
\tat org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:963)
\tat org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1006)`,
    },
    'db-pool-exhaustion-order': {
      exceptionClass: 'java.sql.SQLTransientConnectionException',
      className: 'OrderRepository',
      message: 'HikariPool-1 - Connection is not available, request timed out after 30000ms.',
      stacktrace: `java.sql.SQLTransientConnectionException: HikariPool-1 - Connection is not available, request timed out after 30000ms.
\tat com.zaxxer.hikari.pool.HikariPool.createTimeoutException(HikariPool.java:695)
\tat com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:197)
\tat com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:162)
\tat com.zaxxer.hikari.HikariDataSource.getConnection(HikariDataSource.java:128)
\tat org.springframework.jdbc.datasource.DataSourceUtils.fetchConnection(DataSourceUtils.java:159)
\tat org.springframework.jdbc.datasource.DataSourceUtils.doGetConnection(DataSourceUtils.java:117)
\tat org.springframework.jdbc.datasource.DataSourceUtils.getConnection(DataSourceUtils.java:80)
\tat org.springframework.jdbc.core.JdbcTemplate.execute(JdbcTemplate.java:330)
\tat org.springframework.jdbc.core.JdbcTemplate.query(JdbcTemplate.java:465)
\tat org.springframework.jdbc.core.JdbcTemplate.query(JdbcTemplate.java:475)
\tat com.example.order.repository.OrderRepository.findById(OrderRepository.java:78)
\tat com.example.order.service.OrderService.getOrder(OrderService.java:145)
\tat com.example.order.controller.OrderController.getOrderById(OrderController.java:92)
\tat jdk.internal.reflect.GeneratedMethodAccessor67.invoke(Unknown Source)
\tat java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
\tat java.base/java.lang.reflect.Method.invoke(Method.java:566)
Caused by: java.sql.SQLException: Timeout after 30000ms of waiting for a connection.
\tat com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:186)
\t... 13 more`,
    },
  };

  return scenarioExceptions[scenario.id];
}

function generateGenericStackTrace(service: string, exceptionClass: string, prefix: string): string {
  const className = service.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  return `${exceptionClass}: ${prefix}
\tat ${exceptionClass.split('.').slice(-1)[0]}.${prefix}(${exceptionClass.split('.').slice(-1)[0]}.java:${Math.floor(Math.random() * 200) + 1})
\tat com.example.${service.replace(/-/g, '.')}.service.${className}Service.process(${className}Service.java:${Math.floor(Math.random() * 150) + 1})
\tat com.example.${service.replace(/-/g, '.')}.controller.${className}Controller.handle(${className}Controller.java:${Math.floor(Math.random() * 100) + 1})
\tat jdk.internal.reflect.GeneratedMethodAccessor${Math.floor(Math.random() * 100)}.invoke(Unknown Source)
\tat java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
\tat java.base/java.lang.reflect.Method.invoke(Method.java:566)
\tat org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)
\tat org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:117)
\tat org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1067)
\tat javax.servlet.http.HttpServlet.service(HttpServlet.java:764)`;
}

function getErrorCount(trend: string, durationMs: number): number {
  const hours = durationMs / (1000 * 60 * 60);
  switch (trend) {
    case 'increasing': return Math.floor(hours * 5);
    case 'spiking': return Math.floor(hours * 20);
    case 'constant_high': return Math.floor(hours * 10);
    default: return 0;
  }
}

function generateTraceId(): string {
  return Math.random().toString(36).substr(2, 32);
}

function generateSpanId(): string {
  return Math.random().toString(36).substr(2, 16);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomEndpoint(service: string): string {
  const svc = SERVICES.find(s => s.name === service);
  return svc ? pickRandom(svc.endpoints).path : '/api/unknown';
}
