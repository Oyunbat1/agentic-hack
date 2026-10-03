"""MCP client for the Memory MCP server. The Shopper touches memory only through here."""

import json
from typing import Any

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


class MemoryClient:
    def __init__(self, url: str):
        self.url = url

    async def call(self, tool: str, **args: Any) -> Any:
        async with streamablehttp_client(self.url) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(tool, args)
        if result.isError:
            raise RuntimeError(f"memory.{tool}: {result.content[0].text if result.content else 'error'}")
        data = result.structuredContent
        if data is None:
            return json.loads(result.content[0].text) if result.content else None
        return data["result"] if set(data) == {"result"} else data  # FastMCP wraps non-dict returns
