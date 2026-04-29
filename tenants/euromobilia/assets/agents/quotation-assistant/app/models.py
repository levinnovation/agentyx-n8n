from pydantic import BaseModel
from typing import Literal

class CustomerMessage(BaseModel):
    phone: str
    text: str
    timestamp: str

class QuotationIntent(BaseModel):
    intent: Literal["appliance", "furniture", "full_kitchen", "other", "human"]
    confidence: float
    missing_info: list[str]

class QuotationReply(BaseModel):
    text: str
    products_referenced: list[str]
    estimated_total: str | None
