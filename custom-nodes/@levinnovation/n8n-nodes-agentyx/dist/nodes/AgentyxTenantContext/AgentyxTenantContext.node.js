"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentyxTenantContext = void 0;
class AgentyxTenantContext {
    description = {
        displayName: "Agentyx Tenant Context",
        name: "agentyxTenantContext",
        icon: "file:AgentyxTenantContext.svg",
        group: ["transform"],
        version: 1,
        subtitle: '={{ $parameter["operation"] }}',
        description: "Inject tenant/domain/capability context into the workflow execution",
        defaults: {
            name: "Agentyx Tenant Context",
        },
        inputs: ["main"],
        outputs: ["main"],
        properties: [
            {
                displayName: "Tenant",
                name: "tenant",
                type: "string",
                default: "",
                placeholder: "levinnovation",
                description: "Tenant slug",
                required: true,
            },
            {
                displayName: "Domain",
                name: "domain",
                type: "string",
                default: "",
                placeholder: "customer-service",
                description: "Domain slug",
            },
            {
                displayName: "Capability",
                name: "capability",
                type: "string",
                default: "",
                placeholder: "lead-qualification",
                description: "Capability slug",
            },
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            const tenant = this.getNodeParameter("tenant", i);
            const domain = this.getNodeParameter("domain", i);
            const capability = this.getNodeParameter("capability", i);
            returnData.push({
                json: {
                    ...items[i].json,
                    _agentyx_context: {
                        tenant,
                        domain,
                        capability,
                        timestamp: new Date().toISOString(),
                    },
                },
            });
        }
        return [returnData];
    }
}
exports.AgentyxTenantContext = AgentyxTenantContext;
