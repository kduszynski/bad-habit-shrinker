# Time Window Shrinker - Web Application

**Generated with different LLM models support.**

A modern, mobile-first web application that simulates the progressive narrowing of a daily time window until it collapses to a single point.

## 🚀 Quick Start

1. **Start the web server:**
   ```bash
   python3 -m http.server 8000
   ```

2. **Open in browser:**
   ```
   http://localhost:8000
   ```

## 📋 Overview

This web application calculates how a time window shrinks progressively over multiple days until it collapses to a single point at the midpoint of the original window. The window narrows equally from both ends—the start time advances and the end time retreats by the same amount each day.

## 🎯 Features

- **Simplified Form**: Essential fields (start time, end time, days) shown first
- **Collapsible Settings**: Advanced options (rounding mode, finish mode) hidden behind "More Settings" toggle
- **Mobile-First Design**: Optimized for mobile devices with touch-friendly inputs
- **Flexible Duration**: Enter days directly or use date range
- **Run Summary**: Key metrics displayed before schedule table
- **CSV Export**: One-click export with metadata
- **Midnight Crossing**: Handles time windows spanning midnight

### Defaults
- Start time: 08:00
- End time: 22:00
- Start date: Today
- End date: End of current year

## 🏗️ Architecture

```
time-window-shrinker/
├── index.html          # Main HTML structure
├── styles.css          # Modern CSS styling with custom properties
├── script.js           # Algorithm logic and DOM manipulation
├── test_js_functions.js # Unit tests for algorithm
├── main.py            # Original Python CLI tool
└── README.md          # This documentation
```

## 🔧 Technical Implementation

### Algorithm

The core algorithm calculates daily narrowing steps using the formula:

**Inclusive Mode** (collapse on day N):
```
m = L / (2 × (N - 1))
```

**After-Steps Mode** (collapse after N days):
```
m = L / (2 × N)
```

Where:
- `L` = Initial window length in minutes
- `N` = Number of days
- `m` = Daily narrowing step in minutes (per side)

The window shrinks equally from both ends:
- Start time advances by `m` minutes each day
- End time retreats by `m` minutes each day
- Total daily shrink = `2 × m` minutes

### Time Representation

- **Internal**: Minutes since midnight (0-1439)
- **Display**: HH:MM format with zero-padding
- **Modular arithmetic**: Handles midnight crossing seamlessly

### Date Range Calculation

When using date range input:
- Days are calculated inclusively (start date = day 1, end date = final day)
- The number of days is automatically computed from the date difference
- Date validation ensures end date is on or after start date

## 📖 Usage

### Essential Fields
1. **Start Time** - Beginning of time window (default: 08:00)
2. **End Time** - End of time window (default: 22:00)
3. **Number of Days** - Enter directly OR use date range below

### Date Range (Optional)
- Select start and end dates to auto-calculate days
- Leave empty if using manual days entry

### Advanced Settings (Click "More Settings")
- **Finish Mode**:
  - `Inclusive` - Collapse on day N
  - `After Steps` - Collapse after N steps (on day N+1)
- **Rounding Mode**:
  - `Nearest` - Round to nearest minute (default)
  - `Floor` - Round down
  - `Ceil` - Round up

## 📊 Output

**Run Summary** displays:
- Daily interval shrink (total minutes/day)
- Per side shrink (minutes/day each side)
- Collapse time (when window reaches zero)

**CSV Export** includes schedule data and metadata summary.

Filename: `time-window-schedule-YYYYMMDD.csv`

## 🎨 Design

- **Color Scheme**: Professional blue palette with light backgrounds
- **Typography**: Inter font family, responsive sizing
- **Layout**: Mobile-first, single column on mobile, grid on larger screens
- **Components**: Collapsible sections, touch-friendly inputs (44px+), concise spacing

## 📱 Responsive Design

**Mobile-First Approach**
- Base styles optimized for mobile (< 768px)
- Single column layout, compact spacing
- Touch-friendly inputs (min 44px height)
- Horizontal scroll for tables

**Tablet & Desktop** (≥ 768px)
- Grid layout for form fields
- Increased spacing and padding
- Multi-column summary cards

## 🧪 Testing

Run unit tests:
```bash
node test_js_functions.js
```

Tests cover: normal operation, midnight crossing, all finish/rounding modes, date range calculation, error handling.

## 🔍 Browser Support

Modern browsers (Chrome, Firefox, Safari, Edge). Uses HTML5 inputs, CSS Grid, Flexbox, ES6+ JavaScript.

**Performance**: O(n) algorithm, minimal DOM operations, ~10KB total bundle size.

## 🛠️ Development

### File Structure
```
├── index.html          - HTML structure with collapsible settings
├── styles.css          - Mobile-first CSS with custom properties
├── script.js           - Algorithm logic and DOM manipulation
├── test_js_functions.js - Unit tests
└── main.py            - Original Python CLI tool
```

---

## 🐍 Python CLI Tool

The web application is based on the original Python command-line tool (`main.py`). The Python version provides the same core algorithm with a CLI interface.

### Python CLI Usage

```bash
# Collapse on day 10 (inclusive), from 09:00 to 21:00
python main.py --start 09:00 --end 21:00 --days 10 --output schedule.csv

# Same inputs, but do exactly 10 steps and collapse the day after
python main.py --start 09:00 --end 21:00 --days 10 \
    --finish-on-day after-steps --output schedule.csv

# Handles windows crossing midnight, e.g. 22:30–05:15
python main.py --start 22:30 --end 05:15 --days 7 --output schedule.csv
```

### Python CLI Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--start` | Yes | Start time in HH:mm format |
| `--end` | Yes | End time in HH:mm format |
| `--days` | Yes | Number of days (positive integer) |
| `--finish-on-day` | No | `inclusive` (default) or `after-steps` |
| `--rounding` | No | `nearest` (default), `floor`, or `ceil` |
| `--output` | Yes | Path to output CSV file |

### Python CLI Output

The Python CLI writes a CSV file with columns:
- `id`: Day number (1, 2, 3, ...)
- `start`: Start time in HH:mm format
- `end`: End time in HH:mm format

The tool also prints a summary to stdout:
- Number of rows written
- Collapse time (hour zero)

### Differences from Web Version

The Python CLI:
- ✅ Command-line interface
- ✅ File-based CSV output
- ✅ No date range input (days only)
- ✅ No default values
- ✅ No interactive UI

The web version adds:
- ✅ Interactive browser interface
- ✅ Date range input option
- ✅ Default values for convenience
- ✅ Run summary card
- ✅ One-click CSV export
- ✅ Real-time validation and error messages

---

## 🤝 Contributing

Test changes with `node test_js_functions.js`. Ensure mobile-first design works correctly.

---

**Built with:** HTML5, CSS3, ES6 JavaScript | **Algorithm:** Ported from Python CLI tool
