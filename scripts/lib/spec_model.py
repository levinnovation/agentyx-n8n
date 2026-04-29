"""Lightweight dataclasses for spec entities."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TenantSpec:
    name: str
    description: Optional[str] = None


@dataclass
class DomainSpec:
    id: str
    name: str
    tenant: str


@dataclass
class CapabilitySpec:
    id: str
    name: str
    tenant: str
    domain: str
    purpose: str = ""
    assets: list[str] = field(default_factory=list)
    status: str = "scaffolded"


@dataclass
class AssetSpec:
    id: str
    name: str
    type: str
    capability: str
    tenant: str
    domain: str
