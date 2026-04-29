"""
FAISS-based vector store for document embeddings.

Provides semantic search over indexed document content
(catalogs, nomenclature files, etc.) using OpenAI embeddings.
"""

from __future__ import annotations

import os
import json
import hashlib
from pathlib import Path

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..config import LLM_API_KEY, LLM_BASE_URL, EMBEDDING_MODEL, EMBEDDING_DIMENSION, FAISS_INDEX_DIR

_store: FAISS | None = None
_embeddings: OpenAIEmbeddings | None = None


def _get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        emb_kwargs = dict(
            model=EMBEDDING_MODEL,
            openai_api_key=LLM_API_KEY,
            dimensions=EMBEDDING_DIMENSION,
        )
        if LLM_BASE_URL:
            emb_kwargs["openai_api_base"] = LLM_BASE_URL
        _embeddings = OpenAIEmbeddings(**emb_kwargs)
    return _embeddings


def _index_path() -> Path:
    return Path(FAISS_INDEX_DIR)


def _manifest_path() -> Path:
    return _index_path() / "manifest.json"


TEXT_SPLITTER = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def build_index(documents: list[dict]) -> FAISS:
    """Build a new FAISS index from document_contents rows."""
    global _store

    all_docs: list[Document] = []

    for doc in documents:
        filename = doc.get("filename", "unknown")
        category = doc.get("category", "other")
        content = doc.get("content_text", "")
        if not content.strip():
            continue

        chunks = TEXT_SPLITTER.split_text(content)
        for i, chunk in enumerate(chunks):
            all_docs.append(Document(
                page_content=chunk,
                metadata={
                    "filename": filename,
                    "category": category,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                },
            ))

    if not all_docs:
        all_docs = [Document(
            page_content="No documents indexed yet.",
            metadata={"filename": "__empty__", "category": "other"},
        )]

    embeddings = _get_embeddings()
    _store = FAISS.from_documents(all_docs, embeddings)
    _save_index(_store, documents)
    return _store


def _save_index(store: FAISS, documents: list[dict]) -> None:
    idx_path = _index_path()
    idx_path.mkdir(parents=True, exist_ok=True)
    store.save_local(str(idx_path))

    manifest = {
        "doc_count": len(documents),
        "hashes": {
            doc["filename"]: hashlib.md5(doc.get("content_text", "").encode()).hexdigest()
            for doc in documents
        },
    }
    with open(_manifest_path(), "w") as f:
        json.dump(manifest, f)


def load_index() -> FAISS | None:
    """Load FAISS index from disk if it exists."""
    global _store
    idx_path = _index_path()
    if not (idx_path / "index.faiss").exists():
        return None

    embeddings = _get_embeddings()
    _store = FAISS.load_local(
        str(idx_path),
        embeddings,
        allow_dangerous_deserialization=True,
    )
    return _store


def get_store() -> FAISS | None:
    """Get the current FAISS store (load from disk if needed)."""
    global _store
    if _store is None:
        _store = load_index()
    return _store


def is_index_stale(documents: list[dict]) -> bool:
    """Check if the persisted index is stale vs the current documents."""
    mp = _manifest_path()
    if not mp.exists():
        return True

    with open(mp) as f:
        manifest = json.load(f)

    current_hashes = {
        doc["filename"]: hashlib.md5(doc.get("content_text", "").encode()).hexdigest()
        for doc in documents
    }

    return manifest.get("hashes") != current_hashes


def search(query: str, k: int = 8, category: str | None = None) -> list[Document]:
    """Semantic search over document chunks."""
    store = get_store()
    if store is None:
        return []

    filter_dict = None
    if category and category not in ("catalog", "all", "price_list"):
        filter_dict = {"category": category}

    try:
        if filter_dict:
            results = store.similarity_search(query, k=k, filter=filter_dict)
        else:
            results = store.similarity_search(query, k=k)
    except Exception as e:
        print(f"[vector_store] search error: {e}")
        results = []

    if category and category != "all" and not filter_dict:
        expansions: dict[str, set[str]] = {
            "catalog": {"catalog", "catalog_electro", "catalog_muebles"},
            "price_list": {"price_list", "price_list_electro", "price_list_muebles"},
            "nomenclatura": {"nomenclatura"},
        }
        variants = expansions.get(category, {category})
        results = [r for r in results if r.metadata.get("category") in variants]

    return results
