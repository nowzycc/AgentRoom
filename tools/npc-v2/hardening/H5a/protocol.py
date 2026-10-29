"""Shared Draft 2020-12 schema boundary; no duplicated execution schema."""
import json
from pathlib import Path
from typing import TypeAlias
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

Json: TypeAlias = 'None | bool | int | float | str | list[Json] | dict[str, Json]'
Document: TypeAlias = dict[str, Json]
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SCHEMA = json.loads((HERE.parent / 'H4-closeout/schema/contract.schema.json').read_text())
registry = Registry()
for name in ('common', 'envelope', 'event'):
    document = json.loads((ROOT / f'packages/npc-contracts/schemas/{name}.schema.json').read_text())
    registry = registry.with_resource(document['$id'], Resource.from_contents(document))
registry = registry.with_resource(SCHEMA['$id'], Resource.from_contents(SCHEMA))

class Rejected(Exception):
    def __init__(self, code: str, status: int = 400):
        self.code, self.status = code, status
        super().__init__(code)

    def body(self) -> Document:
        return dict(apiVersion='h5a.1', code=self.code, reason=self.code, retryable=self.status >= 500)

def parse(definition: str, value: Json) -> Document:
    validator = Draft202012Validator({'$ref': SCHEMA['$id'] + '#/$defs/' + definition}, registry=registry, format_checker=FormatChecker())
    if not validator.is_valid(value):
        raise Rejected('INVALID_REQUEST')
    if not isinstance(value, dict):
        raise Rejected('INVALID_REQUEST')
    return value

def canonical(value: Json) -> str:
    # Same recursive key-sort semantics as domain/commands.ts; no Unicode normalization.
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
