from pydantic import BaseModel

class ExampleInput(BaseModel):
    query: str

class ExampleOutput(BaseModel):
    answer: str
