#!/bin/bash
# Test script for MCP server

echo "Testing fetch_logs tool..."
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"fetch_logs","arguments":{"service_name":"auth-service","log_level":"ERROR","limit":5}}}' | node dist/index.js 2>/dev/null | jq '.result.content[0].text' | jq '.' | head -50

echo ""
echo "Testing query_metrics tool..."
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"query_metrics","arguments":{"metric_name":"memory_usage_bytes","service_name":"auth-service"}}}' | node dist/index.js 2>/dev/null | jq '.result.content[0].text' | jq '.metric_name, .data_points' | head -20

echo ""
echo "Testing get_log_summary tool..."
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_log_summary","arguments":{"time_window":"1h"}}}' | node dist/index.js 2>/dev/null | jq '.result.content[0].text' | jq '.total_logs, .error_rate, .by_level' | head -20
