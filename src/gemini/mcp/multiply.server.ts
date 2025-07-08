import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';

// zod documentation: https://zod.dev/v4
// mcp documentation: https://modelcontextprotocol.io/introduction
// mcp SDK: https://github.com/modelcontextprotocol/typescript-sdk

async function createMultiplyClient(): Promise<Client> {
  const server = new McpServer({
    name: "Multiply Server",
    version: "1.0.0",
  });

  server.registerTool("multiply",
    {
      title: "Mock API to multiply two numbers",
      description: "Multiply two numbers and return the result",
      inputSchema: {
        firstNumber: z.number().min(2).max(10),
        secondNumber: z.number().min(2).max(10),
      },
    },
    async ({ firstNumber, secondNumber }) => {
      const structuredContent = {
        firstNumber: firstNumber,
        secondNumber: secondNumber,
        multiplicationResult: firstNumber * secondNumber,
      };
      return {
        content: [{
          type: "text",
          text: JSON.stringify(structuredContent, null, 2)
        }],
        structuredContent
      };
    },
  );

  const transports = InMemoryTransport.createLinkedPair();
  await server.connect(transports[0]);

  const client = new Client({
    name: "Multiply Client",
    version: "1.0.0",
  });
  client.connect(transports[1]);

  return client;
}

export default createMultiplyClient;