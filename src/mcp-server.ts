import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { z } from 'zod';
import { toolHandlers } from './tools/index.js';
import { resourceHandlers } from './resources/index.js';

const PORT = process.env.PORT || 4004;

// Function to create and configure server for each request (stateless mode)
function createServer() {
  const server = new McpServer({
    name: 'alerts-mcp',
    version: '0.1.0',
  });

  // Register fetch_kibana_logs tool
  server.registerTool(
    'fetch_kibana_logs',
    {
      description: 'Fetch application logs in Kibana/Elasticsearch format with full exception stack traces',
      inputSchema: {
        service_name: z.string().optional().describe('Filter by service name'),
        log_level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional().describe('Filter by log level'),
        start_time: z.string().optional().describe('Start time (ISO 8601 or relative like "-2h")'),
        end_time: z.string().optional().describe('End time (ISO 8601 or relative)'),
        limit: z.number().optional().describe('Max logs to return (1-1000, default: 100)'),
        search_query: z.string().optional().describe('Search in log messages and stack traces'),
      },
    },
    async (args) => {
      const result = await toolHandlers.fetch_kibana_logs(args);
      return result;
    }
  );

  // Register query_prometheus_metrics tool
  server.registerTool(
    'query_prometheus_metrics',
    {
      description: 'Query Prometheus-style metrics with trend analysis and anomaly detection',
      inputSchema: {
        metric_name: z.string().describe('Metric name (e.g., "memory_usage_bytes", "errors_total")'),
        service_name: z.string().optional().describe('Filter by service name'),
        start_time: z.string().optional().describe('Start time (ISO 8601 or relative)'),
        end_time: z.string().optional().describe('End time (ISO 8601 or relative)'),
      },
    },
    async (args) => {
      const result = await toolHandlers.query_prometheus_metrics(args);
      return result;
    }
  );

  // Register resources
  server.registerResource(
    'services-catalog',
    'logs://services/catalog',
    { mimeType: 'application/json' },
    async () => {
      const result = await resourceHandlers['logs://services/catalog']();
      return result;
    }
  );

  server.registerResource(
    'log-entry-schema',
    'logs://schemas/log-entry',
    { mimeType: 'application/json' },
    async () => {
      const result = await resourceHandlers['logs://schemas/log-entry']();
      return result;
    }
  );

  return server;
}

// Create Express app with MCP configuration (binds to all interfaces for CF)
const app = createMcpExpressApp({ host: '0.0.0.0' });

// Health check endpoint
app.get('/', (req: any, res: any) => {
  res.json({
    name: 'alerts-mcp',
    version: '0.1.0',
    status: 'running',
    protocol: 'MCP Streamable HTTP (stateless)',
    endpoint: 'POST /mcp',
  });
});

// MCP endpoint - creates new server and transport per request (stateless)
app.post('/mcp', async (req: any, res: any) => {
  const server = createServer();

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Handle other methods
app.get('/mcp', (req: any, res: any) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed' },
    id: null,
  });
});

app.delete('/mcp', (req: any, res: any) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed' },
    id: null,
  });
});

app.listen(PORT, () => {
  console.log(`Alerts MCP Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});
