from pydantic import BaseModel

class NodeConfigUpdate(BaseModel):
    model_name: str
    temperature: float
    max_tokens: int
    credential_name: str
    api_key: str
