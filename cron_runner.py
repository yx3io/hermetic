#!/usr/bin/env python3
"""
Railway entry point: runs commit_watcher every 15 minutes using APScheduler.
"""

import logging
import signal
import sys

from apscheduler.schedulers.blocking import BlockingScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


def tick():
    log.info("=== commit watcher tick ===")
    try:
        from generators.commit_watcher import run
        count = run()
        log.info(f"tick done — {count} new subvocal(s)")
    except Exception:
        log.exception("tick failed")


def main():
    scheduler = BlockingScheduler()
    scheduler.add_job(tick, "interval", minutes=15, id="watcher")

    # run once immediately on startup
    tick()

    def shutdown(signum, frame):
        log.info("shutting down scheduler")
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    log.info("scheduler started — polling every 15 min")
    scheduler.start()


if __name__ == "__main__":
    main()
