import asyncio
from typing import AsyncIterator

class EventBus:
    def __init__(self) -> None:
        self._q: asyncio.Queue[str] = asyncio.Queue()

    async def publish(self, msg: str) -> None:
        await self._q.put(msg)

    async def stream(self) -> AsyncIterator[str]:
        while True:
            data = await self._q.get()
            yield data

bus = EventBus()
