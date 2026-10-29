"""Bounded immutable public event journal; callers serialize with the broker lock."""
from collections import deque
from dataclasses import dataclass
import re
from typing import Final

import anyio
from protocol import Document, Rejected, canonical

MAX_SEQUENCE: Final = 9007199254740991
CURSOR: Final = re.compile(r'([A-Za-z0-9._:-]{1,128})/(0|[1-9][0-9]{0,15})', re.ASCII)


@dataclass(frozen=True, slots=True)
class PublicEvent:
    sequence: int
    cursor: str
    event: str
    data: str


class Journal:
    """Mutable ring and edge-triggered notification, never a per-client queue."""

    def __init__(self, epoch: str, scope: Document):
        self.epoch = epoch
        self.scope = scope
        self.sequence = 0
        self.capacity = 1024
        self.events: deque[PublicEvent] = deque()
        self.changed = anyio.Event()
        self.subscribers = 0

    @property
    def cursor(self) -> str:
        return f'{self.epoch}/{self.sequence}'

    def position(self, cursor: str) -> int:
        matched = CURSOR.fullmatch(cursor)
        if matched is None or int(matched[2]) > MAX_SEQUENCE:
            raise Rejected('INVALID_CURSOR', 400)
        sequence = int(matched[2])
        if matched[1] != self.epoch or sequence > self.sequence:
            raise Rejected('RESYNC_REQUIRED', 409)
        floor = self.events[0].sequence - 1 if self.events else self.sequence
        if sequence < floor:
            raise Rejected('RESYNC_REQUIRED', 409)
        return sequence

    def after(self, cursor: str) -> tuple[PublicEvent, ...]:
        position = self.position(cursor)
        return tuple(row for row in self.events if row.sequence > position)

    def next(self, cursor: str) -> PublicEvent | None:
        position = self.position(cursor)
        return next((row for row in self.events if row.sequence > position), None)

    def publish(self, event: str, data: Document) -> str:
        # Exhaustion is fail-closed; an operator must perform normal new-epoch recovery.
        if self.sequence >= MAX_SEQUENCE:
            raise Rejected('RESYNC_REQUIRED', 409)
        self.sequence += 1
        envelope: Document = dict(apiVersion='h5a.1', brokerEpoch=self.epoch,
                                  scope=self.scope, cursor=self.cursor, type=event, data=data)
        self.events.append(PublicEvent(self.sequence, self.cursor, event, canonical(envelope)))
        while len(self.events) > self.capacity:
            self.events.popleft()
        changed, self.changed = self.changed, anyio.Event()
        changed.set()
        return self.cursor
