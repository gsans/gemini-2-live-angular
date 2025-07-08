import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';

// zod documentation: https://zod.dev/v4
// mcp documentation: https://modelcontextprotocol.io/introduction
// mcp SDK: https://github.com/modelcontextprotocol/typescript-sdk

const MCP_SERVER_NAME = "Weather Server";
const MCP_SERVER_VERSION = "1.0.0";
const MCP_CLIENT_NAME = "Weather Client";
const MCP_CLIENT_VERSION = "1.0.0";

async function createWeatherClient(): Promise<Client> {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  server.registerTool("getCurrentTemperature",
    {
      title: "Mock API to query for the temperature in a given location",
      description: "Get the current temperature in a given location",
      inputSchema: {
        location: z.string().describe("The city and state, e.g. San Francisco, CA"),
        unit: z.enum(["celsius", "fahrenheit"]).describe("The temperature unit to use. Infer this from the users location."),
      },
      outputSchema: {
        location: z.string().describe("The city and state, e.g. San Francisco, CA"),
        temperature: z.string().describe("The current temperature in the specified unit, e.g. '25°C' or '77°F'"),
        mcp_server: z.string().describe("The name and version of the MCP server that provided this information"),
      },
    },
    async ({ location = "London", unit = "celsius" }) => {
      const structuredContent = {
        location,
        temperature: "25°" + (unit.toLowerCase() === "celsius" ? "C" : "F"),
        mcp_server: `${MCP_SERVER_NAME} (${MCP_SERVER_VERSION})`,
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(structuredContent, null, 2)
        }],
        structuredContent
      };
    }
  );

  const transports = InMemoryTransport.createLinkedPair();
  await server.connect(transports[0]);

  const client = new Client({
    name: MCP_CLIENT_NAME,
    version: MCP_CLIENT_VERSION,
  });
  client.connect(transports[1]);

  return client;
}

export default createWeatherClient;