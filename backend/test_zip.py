import asyncio
import httpx
from stream_zip import async_stream_zip, ZIP_32
from datetime import datetime

async def main():
    async def files():
        async def chunks():
            yield b"hello "
            yield b"world"
        yield "hello.txt", datetime.now(), 0o600, ZIP_32, chunks()

    async for chunk in async_stream_zip(files()):
        print(len(chunk))

asyncio.run(main())
