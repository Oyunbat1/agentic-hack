"""Start every backend process: memory MCP, 4 store agents, shopper API. Ctrl+C stops all.

Run: python -m sags.dev
"""

import signal
import socket
import subprocess
import sys
import time

from sags.config import STORES, settings

s = settings()
PROCS = [
    ("memory-mcp", [sys.executable, "-m", "sags.memory.server"], s.memory_mcp_port),
    *[(f"store:{sid}", [sys.executable, "-m", "sags.stores.agent", sid], cfg["port"]) for sid, cfg in STORES.items()],
    ("shopper", [sys.executable, "-m", "uvicorn", "sags.shopper.api:app", "--host", s.host, "--port", str(s.shopper_port), "--log-level", "warning"], s.shopper_port),
]


def _busy(port: int) -> bool:
    with socket.socket() as sock:
        return sock.connect_ex((s.host, port)) == 0


def main() -> None:
    busy = [port for _, _, port in PROCS if _busy(port)]
    if busy:
        sys.exit(f"Ports already in use: {busy}. The backend is probably already running — use it, or stop it with: pkill -f sags")
    running = []
    for name, cmd, port in PROCS:
        running.append((name, subprocess.Popen(cmd)))
        print(f"  ▸ {name:<14} http://{s.host}:{port}")
        time.sleep(0.3)  # memory + stores up before the shopper
    print("All agents running. Ctrl+C to stop.")
    try:
        while all(p.poll() is None for _, p in running):
            time.sleep(1)
        dead = [n for n, p in running if p.poll() is not None]
        print(f"Stopped unexpectedly: {dead}")
    except KeyboardInterrupt:
        pass
    finally:
        for _, p in running:
            p.send_signal(signal.SIGINT)
        for _, p in running:
            p.wait(timeout=10)


if __name__ == "__main__":
    main()
