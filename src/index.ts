import http from 'http';
import { createServer, runServer } from './server.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;

if (PORT) {
  // CF / HTTP mode — expose MCP over SSE
  const transports: Record<string, SSEServerTransport> = {};

  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/sse') {
      // Client opens SSE stream
      const transport = new SSEServerTransport('/message', res);
      const sessionId = transport.sessionId;
      transports[sessionId] = transport;

      res.on('close', () => {
        delete transports[sessionId];
      });

      const server = await createServer();
      await server.connect(transport);
      console.error(`[alerts-mcp] SSE session opened: ${sessionId}`);

    } else if (req.method === 'POST' && url.pathname === '/message') {
      // Client posts a message to an existing session
      const sessionId = url.searchParams.get('sessionId') ?? '';
      const transport = transports[sessionId];

      if (!transport) {
        res.writeHead(404).end('Session not found');
        return;
      }

      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        await transport.handlePostMessage(req, res);
      });

    } else if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', server: 'alerts-mcp' }));

    } else {
      res.writeHead(404).end('Not found');
    }
  });

  httpServer.listen(PORT, () => {
    console.error(`[alerts-mcp] HTTP/SSE server listening on port ${PORT}`);
    console.error(`[alerts-mcp] SSE endpoint: http://localhost:${PORT}/sse`);
    console.error(`[alerts-mcp] Health check: http://localhost:${PORT}/health`);
  });

} else {
  // Local / stdio mode
  runServer().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
