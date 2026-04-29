"""JSON Schema validation helpers."""

import json
from pathlib import Path
from jsonschema import validate, ValidationError


STANDARDS = Path(__file__).resolve().parent.parent.parent / "standards"


def validate_against_schema(data: dict, schema_name: str) -> list[str]:
    """Validate data against a schema in standards/. Returns list of errors."""
    schema_path = STANDARDS / schema_name
    if not schema_path.exists():
        return [f"Schema not found: {schema_name}"]
    schema = json.loads(schema_path.read_text())
    errors = []
    try:
        validate(instance=data, schema=schema)
    except ValidationError as e:
        errors.append(str(e))
    return errors
