import asyncio
from sqlalchemy import text
from database import engine

async def migrate():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE events ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;"))
            print("Successfully added start_time column.")
        except Exception as e:
            print(f"Error (maybe already exists): {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
