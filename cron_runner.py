#!/usr/bin/env python3
"""
Railway entry point:
  - commit_watcher every 15 minutes  (react to new commits + tweet)
  - daily_thought twice a day        (unprompted philosophical tweets)
"""

import logging
import random
import signal
import sys

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


def commit_tick():
    log.info("=== commit watcher tick ===")
    try:
        from generators.commit_watcher import run
        count = run()
        log.info(f"tick done — {count} new subvocal(s)")
    except Exception:
        log.exception("commit tick failed")


def thought_tick():
    log.info("=== daily thought tick ===")
    try:
        from generators.daily_thought import run
        count = run(count=1)
        log.info(f"thought done — {count} thought(s) posted")
    except Exception:
        log.exception("thought tick failed")


def main():
    scheduler = BlockingScheduler()

    scheduler.add_job(commit_tick, "interval", minutes=15, id="watcher")

    # 5 daily thoughts spread across the day at random-ish times
    windows = [(6, 9), (10, 13), (14, 16), (17, 19), (20, 23)]
    times = []
    for i, (lo, hi) in enumerate(windows):
        h = random.randint(lo, hi)
        m = random.randint(0, 59)
        times.append((h, m))
        scheduler.add_job(
            thought_tick,
            CronTrigger(hour=h, minute=m),
            id=f"thought_{i}",
        )

    schedule_str = ", ".join(f"{h:02d}:{m:02d}" for h, m in times)
    log.info(f"daily thoughts scheduled at {schedule_str} UTC")

    commit_tick()

    def shutdown(signum, frame):
        log.info("shutting down scheduler")
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    log.info("scheduler started — commits every 15 min, thoughts twice daily")
    scheduler.start()


if __name__ == "__main__":
    main()
