export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground mb-6">Welcome to the Agentyx portal.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <a
          href="/dashboard/documents"
          className="block p-6 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-1">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Upload and manage indexed documents with visibility controls
          </p>
        </a>
        <a
          href="/dashboard/agents"
          className="block p-6 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-1">Agents</h2>
          <p className="text-sm text-muted-foreground">
            View and manage AI agents
          </p>
        </a>
        <a
          href="/dashboard/conversations"
          className="block p-6 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-1">Conversations</h2>
          <p className="text-sm text-muted-foreground">
            Browse chat history and interactions
          </p>
        </a>
      </div>
    </div>
  );
}
