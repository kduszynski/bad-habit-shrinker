# Time Window Shrinker - Code Analysis

## Overview
The Time Window Shrinker is a Python command-line application that simulates the progressive narrowing of a daily time window over multiple days until it collapses to a single point (referred to as "hour zero").

## Core Logic

### Time Window Representation
- Times are represented internally as **minutes since midnight** (0-1439)
- Supports time windows that **cross midnight** (e.g., 22:30–05:15)
- All time calculations use modular arithmetic with `DAY_MIN = 1440` (24 * 60 minutes)

### Window Shrinking Algorithm
1. **Initial Window**: `[start_time, end_time]` in minutes since midnight
2. **Daily Narrowing**: Each day adds `m` minutes to start time and subtracts `m` minutes from end time
3. **Collapse Point**: When start time equals end time (the midpoint of the original window)
4. **Progressive Steps**: Continues until the window collapses to a single point

### Two Interpretation Modes

#### 1. "inclusive" (default)
- Collapse occurs **ON day N** (today counted as day 1)
- Formula: `m = L / (2 * (N - 1))` where L is initial window length
- For days=1: `m = 0` (already collapsed)

#### 2. "after-steps"
- Performs exactly N narrowing steps
- Collapse happens the **next day** after N steps
- Formula: `m = L / (2 * N)`

## Key Components

### Utility Functions
- `parse_hhmm(value: str) -> int`: Converts "HH:mm" to minutes since midnight
- `hhmm(minutes: int) -> str`: Converts minutes to zero-padded "HH:mm" format
- `window_length(a_min: int, b_min: int) -> int`: Calculates window duration, handling midnight crossing

### Core Algorithm
- `compute_daily_step()`: Calculates the daily narrowing increment `m`
- `generate_schedule()`: Produces schedule rows with rounding options ("nearest", "floor", "ceil")

### Data Structures
- `ScheduleRow` dataclass: Contains `day_id`, `start_min`, `end_min` with string formatting properties

### I/O Operations
- `write_csv()`: Outputs schedule as CSV with columns: `id, start, end`
- Times formatted as "HH:mm" in output

## Command Line Interface

### Required Arguments
- `--start HH:mm`: Start time of the window
- `--end HH:mm`: End time of the window
- `--days N`: Number of days (positive integer)
- `--output PATH`: Output CSV file path

### Optional Arguments
- `--finish-on-day {inclusive,after-steps}`: Days interpretation mode (default: inclusive)
- `--rounding {nearest,floor,ceil}`: Rounding mode for minute offsets (default: nearest)

## Requirements

### Functional Requirements
1. Parse and validate time inputs in "HH:mm" format (00:00-23:59)
2. Handle time windows that span midnight
3. Calculate appropriate daily narrowing step based on mode
4. Generate daily schedule with progressive window shrinking
5. Support different rounding behaviors for display precision
6. Output schedule as CSV with human-readable time formats
7. Provide summary information about the collapse point

### Technical Requirements
1. **Time Representation**: Internal calculations use minutes since midnight
2. **Modular Arithmetic**: Handle 24-hour wraparound correctly
3. **Precision Handling**: Support different rounding modes for cumulative offsets
4. **Error Handling**: Validate inputs and provide meaningful error messages
5. **File I/O**: Overwrite output CSV without confirmation
6. **CLI Robustness**: Use argparse for argument parsing and validation

### Edge Cases Handled
- Windows with zero length (start == end)
- Single-day schedules (days=1)
- Midnight-crossing windows
- Invalid time formats
- Non-positive day counts

## Example Usage

```bash
# Collapse on day 10, 09:00-21:00 window
python main.py --start 09:00 --end 21:00 --days 10 --output schedule.csv

# Exactly 10 steps, collapse next day
python main.py --start 09:00 --end 21:00 --days 10 --finish-on-day after-steps --output schedule.csv

# Midnight-crossing window for 7 days
python main.py --start 22:30 --end 05:15 --days 7 --output schedule.csv
```

## Output Format
CSV with header row:
```
id,start,end
1,09:00,21:00
2,09:12,20:48
...
```

Where `id` is the day number, and times are in "HH:mm" format.
