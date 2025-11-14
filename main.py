#!/usr/bin/env python3
"""
Time Window Shrinker
--------------------

Given a daily time window [A, B] and a target number of days, simulate a
progressive narrowing by adding m minutes to the start and subtracting m
minutes from the end each day, until the window collapses to a single point
("hour zero").

Two common interpretations of "X days" are supported via --finish-on-day:
  1) inclusive  (default): collapse occurs ON day N (today counted as day 1).
     m = L / (2 * (N - 1))
  2) after-steps: perform exactly N narrowing steps; collapse happens the
     next day. m = L / (2 * N)

The program writes a CSV with columns:
  id, start, end
where times are formatted as HH:mm.

Examples
--------
Collapse on day 10 (inclusive), from 09:00 to 21:00:
    python time_window_shrinker.py --start 09:00 --end 21:00 \
        --days 10 --output schedule.csv

Same inputs, but do exactly 10 steps and collapse the day after:
    python time_window_shrinker.py --start 09:00 --end 21:00 \
        --days 10 --finish-on-day after-steps --output schedule.csv

Handles windows crossing midnight, e.g. 22:30–05:15:
    python time_window_shrinker.py --start 22:30 --end 05:15 \
        --days 7 --output schedule.csv

"""
from __future__ import annotations

import argparse
import csv
import math
from dataclasses import dataclass
from typing import Iterable, List

DAY_MIN = 24 * 60


def round_half_away_from_zero(value: float) -> int:
    """Round to nearest integer with halves going away from zero."""
    if value >= 0:
        return int(math.floor(value + 0.5))
    return int(math.ceil(value - 0.5))


# --------------------- Utilities ---------------------

def parse_hhmm(value: str) -> int:
    """Parse "HH:mm" into minutes since midnight (0..1439).

    Accepts 0-padded or non-0-padded hours/minutes.
    Raises ValueError for invalid formats or ranges.
    """
    try:
        parts = value.split(":")
        if len(parts) != 2:
            raise ValueError
        h, m = int(parts[0]), int(parts[1])
        if not (0 <= h <= 23 and 0 <= m <= 59):
            raise ValueError
        return h * 60 + m
    except Exception as exc:  # noqa: BLE001 (keep simple for CLI)
        raise argparse.ArgumentTypeError(f"Invalid HH:mm time: '{value}'") from exc


def hhmm(minutes: int) -> str:
    """Format minutes since midnight to "HH:mm" with zero-padding.

    minutes may be outside 0..1439; the representation wraps around 24h.
    """
    minutes = minutes % DAY_MIN
    h, m = divmod(minutes, 60)
    return f"{h:02d}:{m:02d}"


@dataclass(frozen=True)
class ScheduleRow:
    day_id: int
    start_min: int
    end_min: int

    @property
    def start_str(self) -> str:
        return hhmm(self.start_min)

    @property
    def end_str(self) -> str:
        return hhmm(self.end_min)


# ------------------- Core algorithm -------------------

def window_length(a_min: int, b_min: int) -> int:
    """Return length L of window [A,B) in minutes on a 24h clock.

    Supports intervals that cross midnight.
    """
    L = (b_min - a_min) % DAY_MIN
    return L


def compute_daily_step(a_min: int, b_min: int, days: int, finish_on_day: str) -> float:
    """Compute daily step m (in minutes) according to interpretation.

    finish_on_day: "inclusive" or "after-steps".
    """
    if days <= 0:
        raise ValueError("'days' must be a positive integer")

    L = window_length(a_min, b_min)
    if L == 0:
        raise ValueError("Start and end times define an empty window (L=0)")

    if finish_on_day == "inclusive":
        if days == 1:
            # We are already at collapse; treat m as 0.
            return 0.0
        return L / (2.0 * (days - 1))
    elif finish_on_day == "after-steps":
        return L / (2.0 * days)
    else:
        raise ValueError("finish_on_day must be 'inclusive' or 'after-steps'")


def generate_schedule(
    a_min: int,
    b_min: int,
    days: int,
    finish_on_day: str = "inclusive",
    rounding: str = "nearest",
) -> List[ScheduleRow]:
    """Generate schedule rows for each simulated day.

    Parameters
    ----------
    a_min, b_min : int
        Start and end times in minutes since midnight.
    days : int
        See --finish-on-day for semantics.
    finish_on_day : {"inclusive", "after-steps"}
        Controls how daily step m is computed.
    rounding : {"nearest", "floor", "ceil"}
        How to round cumulative minutes to whole minutes for display.

    Returns
    -------
    list of ScheduleRow
        One row per day simulated.
    """
    m = compute_daily_step(a_min, b_min, days, finish_on_day)

    def _round(x: float) -> int:
        if rounding == "nearest":
            return round_half_away_from_zero(x)
        if rounding == "floor":
            return int(x // 1)
        if rounding == "ceil":
            return int(-(-x // 1))
        raise ValueError("rounding must be 'nearest', 'floor', or 'ceil'")

    rows: List[ScheduleRow] = []

    if finish_on_day == "inclusive":
        # Day indices: 1..days (collapse on last)
        for d in range(1, days + 1):
            offset = (d - 1) * m
            start = _round(a_min + offset)
            end = _round(b_min - offset)
            rows.append(ScheduleRow(d, start, end))
    else:  # after-steps
        # We perform 'days' shrinking steps and show the 'days' resulting windows.
        for d in range(1, days + 1):
            offset = (d - 1) * m
            start = _round(a_min + offset)
            end = _round(b_min - offset)
            rows.append(ScheduleRow(d, start, end))
        # Note: collapse moment would occur at A + days*m == B - days*m, next day.

    return rows


# ----------------------- I/O -------------------------

def write_csv(rows: Iterable[ScheduleRow], path: str) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "start", "end"])  # HH:mm for both times
        for r in rows:
            writer.writerow([r.day_id, r.start_str, r.end_str])


# ---------------------- CLI -------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Simulate daily narrowing of a time window and export CSV.",
    )
    p.add_argument("--start", required=True, type=parse_hhmm, help="Start time HH:mm")
    p.add_argument("--end", required=True, type=parse_hhmm, help="End time HH:mm")
    p.add_argument("--days", required=True, type=int, help="Number of days (positive integer)")
    p.add_argument(
        "--finish-on-day",
        choices=["inclusive", "after-steps"],
        default="inclusive",
        help=(
            "Interpretation of 'days': 'inclusive' collapses ON day N; 'after-steps' "
            "does exactly N narrowing steps and collapses the next day."
        ),
    )
    p.add_argument(
        "--rounding",
        choices=["nearest", "floor", "ceil"],
        default="nearest",
        help="Rounding mode for cumulative minute offsets when formatting HH:mm.",
    )
    p.add_argument(
        "--output",
        required=True,
        help="Path to output CSV (will be overwritten)",
    )
    return p


def main(argv: List[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        rows = generate_schedule(
            a_min=args.start,
            b_min=args.end,
            days=args.days,
            finish_on_day=args.finish_on_day,
            rounding=args.rounding,
        )
    except Exception as e:
        parser.error(str(e))
        return 2

    write_csv(rows, args.output)

    # Optional: print a short summary for convenience.
    L = window_length(args.start, args.end)
    # Collapse moment (regardless of interpretation) is midpoint of initial window.
    collapse_min = (args.start + L / 2.0) % DAY_MIN
    collapse_hhmm = hhmm(int(round(collapse_min)))

    print(f"Wrote {len(rows)} rows to '{args.output}'.")
    print(
        "Hour zero (midpoint of initial window) occurs at:",
        collapse_hhmm,
    )
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
