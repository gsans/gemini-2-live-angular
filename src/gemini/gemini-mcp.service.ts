import { Inject, Injectable, OnDestroy } from '@angular/core';
import { environment } from '../../src/environments/environment.development';

import createWeatherClient from './mcp/weather.server.js';
import createMultiplyClient from './mcp/multiply.server.js';
import { CallableTool, mcpToTool } from '@google/genai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// zod documentation: https://zod.dev/v4
// mcp documentation: https://modelcontextprotocol.io/introduction

@Injectable()
export class McpService implements OnDestroy {
  weatherClient: Client | undefined;
  multiplyClient: Client | undefined;

  constructor() {}

  async ngOnDestroy(): Promise<void> {
    await this.stop();
  }

  async start(): Promise<CallableTool> {
    this.weatherClient = await createWeatherClient();
    this.multiplyClient = await createMultiplyClient();

    return mcpToTool(this.weatherClient, this.multiplyClient);
  }

  async stop(): Promise<void> {
    if (this.weatherClient) {
      await this.weatherClient.close();
    }
    if (this.multiplyClient) {
      await this.multiplyClient.close();
    }
  }

  async execute(request: any): Promise<any> {
    if (!this.weatherClient || !this.multiplyClient) {
      throw new Error('MCP clients are not initialized');
    }

    // Example of executing a tool call
    if (request.name === 'getCurrentTemperature') {
      return this.weatherClient.callTool(request);
    } else if (request.name === 'multiply') {
      return this.multiplyClient.callTool(request);
    } else {
      throw new Error(`Unknown tool: ${request.name}`);
    }
  }
}
