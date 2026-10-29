"""Non-MCP CLI over the shared client. stdout: structured JSON only; stderr: non-sensitive notes.

Exit codes: 0 upstream result; 10 rejected (definitive domain/validation error);
11 unknown (transport-ambiguous write or resync/stream ambiguity); 12 local/config error; 2 usage.
Stream errors, oversized local input and unreadable input files are controlled exits — never tracebacks.
"""
import argparse
import asyncio
import json
import sys
import httpx
from .client import NpcHarnessClient
from .config import HarnessConfig
from .sse import HarnessStreamError, stream_events

MAP = {
    "capabilities": "npc_capabilities",
    "snapshot": "npc_snapshot",
    "action": "npc_request_action",
    "goal": "npc_request_goal",
    "query": "npc_query_receipt",
    "cancel": "npc_cancel",
    "publish": "npc_publish_observations",
}
EXIT_OK, EXIT_REJECTED, EXIT_UNKNOWN, EXIT_LOCAL = 0, 10, 11, 12
_PAYLOAD_LIMIT = 65536


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="npc-harness",
                                     description="Thin CLI over the shared H5a harness client (same schema as MCP)")
    parser.add_argument("command", choices=[*MAP, "events"])
    parser.add_argument("--input", default="-", help="complete JSON payload (file path or '-' for stdin)")
    parser.add_argument("--env-file", default=None, help="explicit env file; no parent-directory search")
    parser.add_argument("--broker-epoch", default=None, help="required for events; convenience for snapshot/query")
    parser.add_argument("--after", default="", help="SSE read cursor; empty means resync_required by contract")
    parser.add_argument("--last-event-id", default=None, help="takes precedence over --after (server contract)")
    parser.add_argument("--max-events", type=int, default=None, help="bounded read")
    parser.add_argument("--timeout-seconds", type=float, default=None, help="bounded stream read")
    return parser


def _read_payload(path: str):
    if path == "-":
        text = sys.stdin.buffer.read(_PAYLOAD_LIMIT + 1)
    else:
        with open(path, "rb") as handle:
            text = handle.read(_PAYLOAD_LIMIT + 1)
    if len(text) > _PAYLOAD_LIMIT:
        raise ValueError("input payload exceeds local limit")
    text = text.decode("utf-8").strip()
    return json.loads(text) if text else {}


async def _events(args, config) -> int:
    if not args.broker_epoch:
        print("npc-harness: events requires --broker-epoch", file=sys.stderr)
        return EXIT_LOCAL
    bound = asyncio.timeout(args.timeout_seconds) if args.timeout_seconds else None

    async def consume():
        async for row in stream_events(config, broker_epoch=args.broker_epoch, after=args.after,
                                       last_event_id=args.last_event_id, max_events=args.max_events,
                                       read_timeout=args.timeout_seconds):
            print(json.dumps(row, ensure_ascii=False), flush=True)
            if row["kind"] == "resync_required":
                return EXIT_UNKNOWN
        return EXIT_OK

    try:
        if bound is not None:
            async with bound:
                return await consume()
        return await consume()
    except TimeoutError:
        print("npc-harness: stream read bound reached; treat tail as unconsumed", file=sys.stderr)
        return EXIT_UNKNOWN
    except HarnessStreamError as error:
        # Status/code only: never the URL, headers, token or upstream body.
        print(f"npc-harness: stream error (status={error.status} code={error.code})", file=sys.stderr)
        return EXIT_UNKNOWN
    except httpx.HTTPError:
        print("npc-harness: upstream stream transport error", file=sys.stderr)
        return EXIT_UNKNOWN


async def _run(args) -> int:
    import os
    if args.env_file:
        os.environ["NPC_HARNESS_ENV_FILE"] = args.env_file
    config = HarnessConfig.from_env(prefix="NPC_HARNESS_", env_file_var="NPC_HARNESS_ENV_FILE",
                                    allow_manual_var="NPC_HARNESS_ALLOW_MANUAL")
    if args.command == "events":
        return await _events(args, config)
    payload = _read_payload(args.input)
    if args.broker_epoch and isinstance(payload, dict):
        payload.setdefault("brokerEpoch", args.broker_epoch)
    result = await NpcHarnessClient(config).call(MAP[args.command], payload)
    print(json.dumps(result, ensure_ascii=False), flush=True)
    if result["outcome"] == "upstream":
        return EXIT_OK
    if result["outcome"] == "unknown":
        print("npc-harness: write outcome unknown; settle it only by querying the original id with the "
              "command's ORIGINAL broker epoch (a fresh boot's 404 proves nothing); do not resend", file=sys.stderr)
        return EXIT_UNKNOWN
    print(f"npc-harness: rejected (code={result.get('code', '')})", file=sys.stderr)
    return EXIT_REJECTED


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return asyncio.run(_run(args))
    except ValueError:
        # Config validation, JSON parse and local-limit errors; messages carry no secrets.
        print("npc-harness: local configuration or input JSON error", file=sys.stderr)
        return EXIT_LOCAL
    except BrokenPipeError:
        return EXIT_LOCAL
    except OSError:
        print("npc-harness: local input/config file error", file=sys.stderr)
        return EXIT_LOCAL


if __name__ == "__main__":
    sys.exit(main())
