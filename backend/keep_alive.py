import asyncio
import httpx
import os
from datetime import datetime

SELF_URL = os.getenv("RENDER_EXTERNAL_URL", "").rstrip("/")
PING_INTERVAL = 600  # 10 minutes in seconds

async def keep_alive_loop():
    """Pings this server's own health endpoint every 10 minutes."""
    if not SELF_URL:
        print("⚠️  RENDER_EXTERNAL_URL not set — keep-alive disabled (local dev mode)")
        return

    await asyncio.sleep(30)  # wait for server to fully start first

    async with httpx.AsyncClient(timeout=10) as client:
        while True:
            try:
                res = await client.get(f"{SELF_URL}/health")
                print(f"✅ Keep-alive ping [{datetime.now().strftime('%H:%M')}] → {res.status_code}")
            except Exception as e:
                print(f"⚠️  Keep-alive ping failed: {e}")
            await asyncio.sleep(PING_INTERVAL)
