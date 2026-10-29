"""Single schema entry: packaged copies of the canonical H4 contract, hash-gated at import.

No parallel execution schema; a drifted copy refuses to load instead of validating loosely.
"""
import copy
import hashlib
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

HERE = Path(__file__).parent / "schema"
FILES = ["contract.schema.json", "common.schema.json", "envelope.schema.json", "event.schema.json"]
# sha256 of the canonical sources at packaging time (H4-closeout + npc-contracts).
CANONICAL_HASHES = {
    "contract.schema.json": "b1e200a6ae1fb0769ee122a30cc35a4cfa929621278c636a09f8a1e98b68d34b",
    "common.schema.json": "1999d49eb3cac26884ea53e656620ccc6804142469944ff2ff20f6ab37527814",
    "envelope.schema.json": "ba586c92bceeef95589b422cf218526b657fb881cd455a80c433ca7180548ecf",
    "event.schema.json": "bbbfcbe42d3d64993880343b03d53fabf0e6606ef36e68121720cf42b637bcff",
}

DOCS = [json.loads((HERE / name).read_text()) for name in FILES]
CONTRACT = DOCS[0]

SYNC_OK = True
if CANONICAL_HASHES:
    for name, expected in CANONICAL_HASHES.items():
        if hashlib.sha256((HERE / name).read_bytes()).hexdigest() != expected:
            SYNC_OK = False
            raise RuntimeError(f"Packaged schema copy drifted from canonical source: {name}")


def inline(node, doc, stack=()):
    if isinstance(node, list):
        return [inline(v, doc, stack) for v in node]
    if not isinstance(node, dict):
        return node
    if "$ref" in node:
        ref = node["$ref"]
        base, _, pointer = ref.partition("#")
        target = next(d for d in DOCS if d["$id"] == base) if base else doc
        identity = (target["$id"], pointer)
        if identity in stack:
            raise ValueError("Recursive schema not supported by this export")
        value = target
        for key in pointer.lstrip("/").split("/") if pointer else []:
            value = value[key.replace("~1", "/").replace("~0", "~")]
        return inline(value, target, stack + (identity,))
    return {k: inline(v, doc, stack) for k, v in node.items() if k not in ("$id", "$schema")}


def definition(name):
    return inline(CONTRACT["$defs"][name], CONTRACT)


def object_schema(props):
    return dict(type="object", additionalProperties=False, required=list(props), properties=props)


ID = definition("id")
inputs = {
    "npc_capabilities": object_schema({}),
    "npc_snapshot": object_schema({"brokerEpoch": ID}),
    "npc_publish_observations": definition("eventBatch"),
    "npc_request_action": inline(CONTRACT["$defs"]["command"]["oneOf"][0], CONTRACT),
    "npc_request_goal": inline(CONTRACT["$defs"]["command"]["oneOf"][1], CONTRACT),
    "npc_query_receipt": object_schema({"brokerEpoch": ID, "commandId": ID}),
    "npc_cancel": definition("cancel"),
}
# Client result envelope (NOT part of the canonical domain contract): detail is genuinely
# optional — ordinary errors carry no detail — and query never carries a scope hint, so an
# error result is always schema-valid by construction. MCP and CLI share this one entry.
ERROR = {"type": "object", "additionalProperties": False,
         "required": ["outcome", "code", "httpStatus", "operationId", "query"],
         "properties": {"outcome": {"enum": ["error", "unknown"]}, "code": {"type": "string"},
                        "httpStatus": {"type": ["integer", "null"]}, "operationId": {"type": ["string", "null"]},
                        "detail": {"type": "string", "maxLength": 500},
                        "query": {"type": ["object", "null"], "additionalProperties": False,
                                  "properties": {"tool": {"const": "npc_query_receipt"}, "commandId": {"type": "string"},
                                                 "brokerEpoch": definition("id")}}}}
outputs = {}
for name in inputs:
    variants = ([definition("receipt"), definition("delivery")] if name in ("npc_request_action", "npc_request_goal", "npc_cancel", "npc_query_receipt")
                else [definition("batchReceipt"), definition("batchDelivery")] if name == "npc_publish_observations"
                else [definition("brokerSnapshot")] if name == "npc_snapshot" else [definition("capabilities")])
    outputs[name] = {"type": "object", "oneOf": [object_schema({"outcome": {"const": "upstream"},
                                                               "httpStatus": {"type": "integer"},
                                                               "data": {"oneOf": variants}}), ERROR]}


def valid(schema, value):
    return Draft202012Validator(schema, format_checker=FormatChecker()).is_valid(value)
