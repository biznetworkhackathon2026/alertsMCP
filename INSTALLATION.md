# Installation & Testing Guide

## Installation

1. **Clone or navigate to the repository**
   ```bash
   cd /path/to/alerts-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

## Testing

### Quick CLI Test

Test the server directly:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js 2>&1 | grep -o '"name":"[^"]*"'
```

Expected output should show: `fetch_logs`, `query_metrics`, `get_log_summary`

### Test Fetch Logs (Memory Leak Scenario)

```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"fetch_logs","arguments":{"service_name":"auth-service","log_level":"ERROR","search_query":"OutOfMemory","start_time":"-7h","limit":3}}}' | node dist/index.js 2>/dev/null | jq -r '.result.content[0].text' | jq '.logs[].message'
```

Expected: Should show "OutOfMemoryError" messages

### Test Metrics (Memory Trend)

```bash
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"query_metrics","arguments":{"metric_name":"memory_usage_bytes","service_name":"auth-service","start_time":"-7h"}}}' | node dist/index.js 2>/dev/null | jq -r '.result.content[0].text' | jq '.data_points'
```

Expected: Should show increasing memory values over time

### Test Log Summary

```bash
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_log_summary","arguments":{"time_window":"1h"}}}' | node dist/index.js 2>/dev/null | jq -r '.result.content[0].text' | jq '{total_logs, error_rate, by_level}'
```

Expected: Statistics showing logs grouped by level

## Integration with Claude Desktop

### Mac/Linux

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json` with the same configuration.

### After Configuration

1. Restart Claude Desktop
2. You should see the alerts server connected
3. Try queries like:
   - "Show me recent errors from the payment service"
   - "What's the memory usage for auth-service over the last 6 hours?"
   - "Summarize all logs from the last hour"

## Using MCP Inspector

For interactive testing:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a web UI where you can:
- Browse available tools and resources
- Test tool calls with custom parameters
- View responses in real-time
- Debug parameter validation

## Verifying Bug Scenarios

### 1. Memory Leak (auth-service)
```bash
# Check logs
fetch_logs: service_name="auth-service", log_level="ERROR", search_query="OutOfMemory", start_time="-7h"

# Check metrics
query_metrics: metric_name="memory_usage_bytes", service_name="auth-service", start_time="-7h"
```

Expected: Memory increases from ~500MB to ~560MB over 7 hours

### 2. Null Pointer Exception (payment-service)
```bash
# Check logs
fetch_logs: service_name="payment-service", log_level="ERROR", search_query="NullPointer", start_time="-3h"

# Check metrics
query_metrics: metric_name="errors_total", service_name="payment-service", start_time="-3h"
```

Expected: Random NPE errors, spiking error count

### 3. Database Pool Exhaustion (order-service)
```bash
# Check logs
fetch_logs: service_name="order-service", log_level="ERROR", search_query="Connection pool", start_time="-2h"

# Check metrics
query_metrics: metric_name="connection_pool_active", service_name="order-service", start_time="-2h"
```

Expected: Connection timeout errors, constantly high pool usage

## Troubleshooting

### Server won't start
- Ensure Node.js 18+ is installed
- Check that TypeScript compiled successfully: `ls -la dist/`
- Look for errors in: `npm run build`

### No tools showing in Claude Desktop
- Verify path in config is absolute, not relative
- Restart Claude Desktop after config changes
- Check Claude Desktop logs for MCP errors

### Tools return empty results
- Time ranges might be outside scenario windows
- Try "-7h" for memory leak, "-2h" for NPE, "-1h" for DB pool
- Check that filters match scenario definitions

## Development

To make changes:

1. Edit source files in `src/`
2. Rebuild: `npm run build`
3. Test with Inspector or CLI
4. Restart Claude Desktop to pick up changes
