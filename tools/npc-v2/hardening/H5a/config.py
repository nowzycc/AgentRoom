"""Local-only configuration; secrets never appear in repr/log output."""
from dataclasses import dataclass, field
from pathlib import Path
import os
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent

@dataclass(frozen=True, slots=True)
class Config:
    origin: str
    runtime_id: str
    harness_token: str = field(repr=False)
    runtime_token: str = field(repr=False)
    world_id: str = 'apartment-v3'
    actor_id: str = 'npc-a'
    source: str = 'fake:h4a'
    session_id: str = 'session-h4a'
    observer_id: str = 'harness-observation'

    @classmethod
    def load(cls) -> 'Config':
        load_dotenv(HERE / '.env.local', override=False)
        if os.environ.get('H5_QUIESCENT') != 'confirmed':
            raise RuntimeError('Close prior H5 pages; explicitly confirm quiescent in local config')
        values = [os.environ.get(k, '') for k in ('H5_ORIGIN', 'H5_RUNTIME_ID', 'H5_HARNESS_TOKEN', 'H5_RUNTIME_TOKEN')]
        if not all(values):
            raise RuntimeError('Missing H5 local configuration')
        origin, runtime_id, harness_token, runtime_token = values
        if not origin.startswith('http://127.0.0.1:') or harness_token == runtime_token:
            raise RuntimeError('H5 requires loopback origin and distinct credentials')
        return cls(origin, runtime_id, harness_token, runtime_token,
            world_id=os.environ.get('H5_WORLD_ID', 'apartment-v3'),
            actor_id=os.environ.get('H5_ACTOR_ID', 'npc-a'),
            source=os.environ.get('H5_SOURCE', 'fake:h4a'),
            session_id=os.environ.get('H5_SESSION_ID', 'session-h4a'),
            observer_id=os.environ.get('H5_OBSERVER_ID', 'harness-observation'))
