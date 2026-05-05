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

    # two daily thoughts at semi-random hours (morning-ish and evening-ish UTC)
    morning_hour = random.randint(8, 12)
    evening_hour = random.randint(18, 23)
    morning_min = random.randint(0, 59)
    evening_min = random.randint(0, 59)

    scheduler.add_job(
        thought_tick,
        CronTrigger(hour=morning_hour, minute=morning_min),
        id="thought_morning",
    )
    scheduler.add_job(
        thought_tick,
        CronTrigger(hour=evening_hour, minute=evening_min),
        id="thought_evening",
    )

    log.info(
        f"daily thoughts scheduled at {morning_hour:02d}:{morning_min:02d} "
        f"and {evening_hour:02d}:{evening_min:02d} UTC"
    )

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
