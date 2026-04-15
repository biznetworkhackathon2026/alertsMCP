# Alerts MCP Server

MCP server that simulates logs and metrics endpoints for hackathon AI agents. This server generates realistic application logs in Kibana format and Prometheus-style metrics with intentional bugs that AI agents can detect and fix.

## Features

### Tools

1. **fetch_kibana_logs** - Query logs in Kibana format with full exception stack traces
   - Filter by service, log level, time range
   - Search within log messages and stack traces
   - Returns Kibana-formatted documents with:
     - Full exception details (type, message, stack_trace)
     - Thread information
     - Trace IDs for correlation
     - Complete context (requestId, endpoint, etc.)

2. **query_prometheus_metrics** - Query Prometheus metrics with analysis
   - Memory usage, CPU, error rates, connection pools
   - Returns Prometheus exposition format
   - Includes trend analysis (increasing, decreasing, stable, volatile)
   - Detects anomalies automatically
   - Time-series data with customizable ranges

### Resources

1. **logs://services/catalog** - Microservices catalog with metadata
2. **logs://schemas/log-entry** - JSON schema for log entry format

### Bug Scenario

The server simulates 1 realistic bug scenario:

**Memory Leak in Employee Service** (employee-service-srv)
- **Root Cause:** Unbounded search cache in `srv/employee-service.js:56`
- **Error:** `FATAL ERROR: JavaScript heap out of memory - searchCache Map has grown to 15.2 GB with 8472 cached search queries`
- **Metrics:** Memory increases from 500MB → 800MB over 7 hours
- **Stack Trace:** Points to `/app/srv/employee-service.js:56` in the cache logic
- **Repository:** https://github.com/biznetworkhackathon2026/employee-service
- **Commit:** `implement employee search caching` (2b74373)

## Quick Start

### Installation

```bash
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### Integration with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "alerts": {
      "command": "node",
      "args": ["/absolute/path/to/alerts-mcp/dist/index.js"]
    }
  }
}
```

## Usage Examples

### Query Kibana Logs with Full Stack Traces

```
fetch_kibana_logs with:
- service_name: "payment-service"
- log_level: "ERROR"
- search_query: "NullPointer"
- start_time: "-3h"
```

**Returns Kibana format:**
```json
{
  "hits": {
    "hits": [{
      "_source": {
        "@timestamp": "2026-04-15T15:59:42.313Z",
        "service.name": "payment-service",
        "message": "java.lang.NullPointerException at PaymentProcessor.validateAmount",
        "error": {
          "type": "java.lang.NullPointerException",
          "message": "...",
          "stack_trace": "at com.example.payment-service.Controller.process..."
        },
        "exception": {
          "type": "java.lang.NullPointerException",
          "stacktrace": [
            "at com.example.payment-service.Controller.process(Controller.java:169)",
            "at com.example.payment-service.Service.handle(Service.java:19)",
            "..."
          ]
        },
        "thread": {
          "name": "http-nio-8080-exec-4"
        }
      }
    }]
  }
}
```

### Query Prometheus Metrics with Trend Analysis

```
query_prometheus_metrics with:
- metric_name: "memory_usage_bytes"
- service_name: "auth-service"
- start_time: "-7h"
```

**Returns Prometheus format + analysis:**
```json
{
  "status": "success",
  "prometheus_format": "# HELP memory_usage_bytes Current memory usage in bytes\n# TYPE memory_usage_bytes gauge\nmemory_usage_bytes{service=\"auth-service\"} 500000000.00 ...",
  "analysis": {
    "trend": "increasing",
    "min_value": 500000000,
    "max_value": 799166666,
    "avg_value": 628214285,
    "current_value": 799166666,
    "anomaly_detected": false
  }
}
```

## Architecture

- **Dynamic Generation**: Logs and metrics are generated on-demand based on current time
- **Realistic Patterns**: Includes normal operations plus injected bug scenarios
- **Time-based Filtering**: Supports relative times ("-1h") and ISO timestamps
- **Full Stack Traces**: Complete exception information for debugging
- **Trend Analysis**: Automatic detection of increasing, decreasing, or volatile metrics

## Development

### Project Structure

```
src/
├── types/          # TypeScript types and Zod schemas
├── data/           # Service catalog and bug scenario definitions
├── generators/     # Log and metric generation logic
├── tools/          # MCP tool implementations
│   ├── fetch-kibana-logs.ts
│   └── query-prometheus-metrics.ts
├── resources/      # MCP resource providers
└── server.ts       # Main MCP server setup
```

### Adding New Bug Scenarios

Edit `src/data/scenarios.ts` to add more scenarios with:
- Service name
- Start time (relative like "-2h")
- Log patterns (error messages)
- Metric name and trend type

## License

MIT
