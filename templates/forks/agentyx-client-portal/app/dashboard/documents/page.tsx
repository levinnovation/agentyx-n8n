"use client";

import { useEffect, useState } from "react";

interface DocItem {
  id: string;
  title: string;
  product: string;
  mime: string;
  version: number;
  updated_at: string;
  visibility: string;
  chars: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("context_only");
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const resp = await fetch("/api/documents/list");
      if (!resp.ok) throw new Error("Failed to fetch");
      const data = await resp.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setStatus("Error loading documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setStatus("Please enter a title and content");
      return;
    }

    setUploading(true);
    setStatus("");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("visibility", visibility);
      formData.append("mime", "text/plain");

      const resp = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Upload failed");
      }

      setStatus(`Uploaded "${title}" successfully`);
      setTitle("");
      setContent("");
      setVisibility("context_only");
      await fetchDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setStatus(`Error: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const toggleVisibility = async (doc: DocItem) => {
    const newVis = doc.visibility === "shareable" ? "context_only" : "shareable";
    setUpdatingId(doc.id);
    try {
      const resp = await fetch("/api/documents/visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: doc.id, visibility: newVis }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Update failed");
      }
      setStatus(`Updated "${doc.title}" to ${newVis}`);
      await fetchDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      setStatus(`Error: ${message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteDocument = async (doc: DocItem) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    setDeletingId(doc.id);
    try {
      const resp = await fetch(`/api/documents/delete?id=${doc.id}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error("Delete failed");
      setStatus(`Deleted "${doc.title}"`);
      await fetchDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setStatus(`Error: ${message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US");
    } catch {
      return d;
    }
  };

  // Auto-clear status after 5 seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Documents</h1>

      {status && (
        <div className="mb-4 p-3 rounded bg-secondary/50 text-sm border">
          {status}
        </div>
      )}

      {/* Upload Form */}
      <div className="mb-8 p-6 border rounded-lg bg-card">
        <h2 className="text-lg font-semibold mb-4">Upload New Document</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Document content or text to index..."
              rows={4}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-vertical"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Visibility</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="context_only"
                  checked={visibility === "context_only"}
                  onChange={() => setVisibility("context_only")}
                  className="accent-primary"
                />
                <span className="text-sm">Context Only (model may read)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="shareable"
                  checked={visibility === "shareable"}
                  onChange={() => setVisibility("shareable")}
                  className="accent-primary"
                />
                <span className="text-sm">Shareable (may send externally)</span>
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </form>
      </div>

      {/* Document List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Indexed Documents ({documents.length})
        </h2>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">No documents indexed yet.</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {doc.title}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground shrink-0">
                      {doc.mime.split("/").pop()}
                    </span>
                    <button
                      onClick={() => toggleVisibility(doc)}
                      disabled={updatingId === doc.id}
                      className={`text-xs px-2 py-0.5 rounded shrink-0 font-medium transition-colors border ${
                        doc.visibility === "shareable"
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                          : "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800"
                      } disabled:opacity-50`}
                    >
                      {updatingId === doc.id
                        ? "..."
                        : doc.visibility === "shareable"
                        ? "Share"
                        : "Context"}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{doc.chars.toLocaleString()} chars</span>
                    <span>v{doc.version}</span>
                    <span>{formatDate(doc.updated_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteDocument(doc)}
                  disabled={deletingId === doc.id}
                  className="ml-4 text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50 transition-colors shrink-0"
                >
                  {deletingId === doc.id ? "..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
