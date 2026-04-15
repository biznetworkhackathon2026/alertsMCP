# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that simulates logs and metrics endpoints for hackathon use. It generates realistic application logs and Prometheus-style metrics with intentional bugs that AI agents can detect and create solution PRs for. MCP servers expose tools, resources, and prompts to Claude and other LLM applications through a standardized protocol.

## Development Commands

### Setup
```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to JavaScript
```

### Development
```bash
npm run dev          # Run in development mode with auto-reload
npm run watch        # Watch mode for TypeScript compilation
```

### Testing
```bash
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Linting & Formatting
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Fix auto-fixable lint issues
npm run format       # Format code with Prettier
```

## Architecture

### MCP Server Structure

This server follows the standard MCP architecture:

- **Tools**: Executable functions that Claude can call:
  - `fetch_logs`: Query logs with filters (service, level, time range, search)
  - `query_metrics`: Get Prometheus-style metrics (memory, CPU, error rates)
  - `get_log_summary`: Aggregate log statistics (error counts, top issues)
- **Resources**: Data that Claude can read:
  - `logs://services/catalog`: Microservices catalog with metadata
  - `logs://schemas/log-entry`: Log format documentation
- **Prompts**: Not yet implemented in MVP

### Key Components

**Server Implementation** (`src/server.ts`): The main MCP server is implemented using `@modelcontextprotocol/sdk`. The server:
- Listens for JSON-RPC messages over stdio
- Registers available tools and resources
- Handles incoming requests and returns structured responses

**Tool Handlers** (`src/tools/`): Each tool:
- Validates input parameters using Zod schemas (`src/types/schemas.ts`)
- Calls generator functions to create dynamic data
- Returns results in MCP protocol format
- Includes proper error handling with descriptive messages

**Resource Providers** (`src/resources/`): Resources expose static data:
- Use resource URIs like `logs://services/catalog`, `logs://schemas/log-entry`
- Support list and read operations
- Return data in JSON format

### Data Generation

Log and metric data is generated dynamically on-demand:
- **Generators** (`src/generators/`): Core logic for creating logs and metrics
  - `log-generator.ts`: Generates baseline logs and injects bug scenario errors
  - `metric-generator.ts`: Generates Prometheus-style time-series metrics
  - `time-utils.ts`: Parses relative times ("-1h") and ISO timestamps
- **Data Files** (`src/data/`): Static definitions
  - `services.ts`: Microservices catalog (5 services)
  - `scenarios.ts`: Bug scenario definitions (3 scenarios)
- **Dynamic Approach**: Benefits
  - Supports any time range query
  - Always fresh timestamps relative to "now"
  - Realistic time-based patterns (memory leaks over hours)
  - Reproducible with scenario-based generation

## MCP-Specific Conventions

### Tool Naming
- Use snake_case for tool names (e.g., `create_alert`, not `createAlert`)
- Be descriptive: prefer `get_alerts_by_status` over `get_alerts`

### Parameter Design
- Use Zod schemas for runtime validation
- Make parameters required unless truly optional
- Use clear, descriptive parameter names
- Provide helpful descriptions in the schema

### Error Handling
- Throw McpError with appropriate error codes from `@modelcontextprotocol/sdk`
- Include context in error messages (e.g., which alert ID failed)
- Use standard error codes: InvalidRequest, InvalidParams, InternalError

### Resource URIs
- Follow URI conventions: `alert://type/identifier`
- Support both list operations (no identifier) and specific resource access
- Include MIME types in resource responses

## Testing Strategy

### Unit Tests
- Test each tool handler independently
- Mock the storage layer
- Verify correct MCP protocol responses

### Integration Tests
- Test the full server with real MCP client connections
- Verify end-to-end flows (create alert → retrieve alert → update alert)
- Test error scenarios

### MCP Inspector
Use `npx @modelcontextprotocol/inspector` to manually test the server:
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Configuration

The server should support configuration via:
- Environment variables for runtime config (storage paths, API keys)
- Config file (JSON/YAML) for default settings
- Command-line arguments for overrides

Required environment variables:
- `ALERTS_STORAGE_PATH`: Where to store alert data
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error)

## Client Integration

To use this server with Claude Desktop, add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "alerts": {
      "command": "node",
      "args": ["/path/to/alerts-mcp/dist/index.js"],
      "env": {
        "ALERTS_STORAGE_PATH": "/path/to/alerts/data"
      }
    }
  }
}
```

## Common Patterns

### Adding a New Tool

1. Define the input schema with Zod
2. Implement the handler function
3. Register the tool in the server's tool list
4. Add unit tests for the handler
5. Update documentation

### Adding a New Resource

1. Define the resource URI pattern
2. Implement the resource provider
3. Register with the resource manager
4. Add tests for list and get operations
5. Update documentation

## Dependencies

Key dependencies:
- `@modelcontextprotocol/sdk`: Core MCP server implementation
- `zod`: Schema validation for tool parameters
- `typescript`: Type safety and compilation
- `jest` or `vitest`: Testing framework

## References

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
