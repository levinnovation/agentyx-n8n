import { config } from "../config.js";
import axios from "axios";

function apiHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "X-N8N-API-KEY": apiKey,
  };
}

export class ApiDeployer {
  private client = axios.create({ timeout: 30000 });

  constructor(
    private n8nUrl: string,
    private apiKey: string,
  ) {}

  async listWorkflows(): Promise<Array<{ id: string; name: string; active: boolean; updatedAt?: string }>> {
    const resp = await this.client.get(`${this.n8nUrl}/api/v1/workflows`, {
      headers: apiHeaders(this.apiKey),
    });
    return resp.data?.data ?? [];
  }

  async getWorkflow(id: string): Promise<Record<string, unknown>> {
    const resp = await this.client.get(`${this.n8nUrl}/api/v1/workflows/${id}`, {
      headers: apiHeaders(this.apiKey),
    });
    return resp.data ?? {};
  }

  async findWorkflowByName(name: string): Promise<{ id: string } | null> {
    const workflows = await this.listWorkflows();
    const found = workflows.find((w) => w.name === name);
    return found ? { id: found.id } : null;
  }

  sanitizeWorkflowPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const readOnlyFields = new Set([
      "id",
      "active",
      "versionId",
      "createdAt",
      "updatedAt",
      "isArchived",
      "meta",
      "staticData",
      "pinData",
      "tags",
      "shared",
      "activeVersion",
      "activeVersionId",
      "triggerCount",
      "versionCounter",
    ]);
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (!readOnlyFields.has(key)) {
        sanitized[key] = value;
      }
    }
    delete sanitized.description;
    if (typeof sanitized.settings === "object" && sanitized.settings !== null) {
      const settings = sanitized.settings as Record<string, unknown>;
      delete settings.binaryMode;
    }
    return sanitized;
  }

  async createWorkflow(payload: unknown): Promise<{ id: string; name: string }> {
    const sanitized = this.sanitizeWorkflowPayload(payload as Record<string, unknown>);
    const resp = await this.client.post(`${this.n8nUrl}/api/v1/workflows`, sanitized, {
      headers: apiHeaders(this.apiKey),
    });
    return resp.data;
  }

  async updateWorkflow(id: string, payload: unknown): Promise<Record<string, unknown>> {
    const sanitized = this.sanitizeWorkflowPayload(payload as Record<string, unknown>);
    const resp = await this.client.put(`${this.n8nUrl}/api/v1/workflows/${id}`, sanitized, {
      headers: apiHeaders(this.apiKey),
    });
    return resp.data;
  }

  async activateWorkflow(id: string): Promise<Record<string, unknown>> {
    const resp = await this.client.post(`${this.n8nUrl}/api/v1/workflows/${id}/activate`, null, {
      headers: apiHeaders(this.apiKey),
    });
    return resp.data;
  }
}
