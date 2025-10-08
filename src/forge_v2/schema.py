from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

class Step(BaseModel):
    call: str
    with_: Dict[str, Any] = Field(default_factory=dict, alias="with")

class Ritual(BaseModel):
    steps: List[Step]

class ForgeConfig(BaseModel):
    rituals: Dict[str, Ritual]

class Receipt(BaseModel):
    type: str
    ritual: str
    step: Optional[str] = None
    ok: bool
    ts: str
    data: Dict[str, Any] = Field(default_factory=dict)
    hash: Optional[str] = None
