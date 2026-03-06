import asyncio
import os
import httpx
from datetime import datetime

RENDER_URL = os.getenv("RENDER_EXTERNAL_URL", "")   
PING_INTERVAL = 10 * 60                              
async def keep_alive_loop():
    """
    Runs forever in the background.
    Only pings when RENDER_EXTERNAL_URL is set (i.e. we're on Render, not local).
    """
    if not RENDER_URL:
        print("[keep_alive] Not on Render — skipping keep-alive pings.")
        return

    url = f"{RENDER_URL}/health"
    print(f"[keep_alive] Started — pinging {url} every {PING_INTERVAL // 60} min.")

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            await asyncio.sleep(PING_INTERVAL)
            try:
                resp = await client.get(url)
                print(f"[keep_alive] {datetime.utcnow().strftime('%H:%M:%S')} — ping OK ({resp.status_code})")
            except Exception as e:
                print(f"[keep_alive] {datetime.utcnow().strftime('%H:%M:%S')} — ping FAILED: {e}")