# Time Window Shrinker - Web Application

**Generated with different LLM models support.**

A modern, minimalistic web application that simulates the progressive narrowing of a daily time window until it collapses to a single point ("hour zero").

## 🚀 Quick Start

### Running the Application

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

### Core Functionality
- **Time Window Input**: HTML5 time inputs with default values (08:00 - 22:00)
- **Flexible Duration Input**: Two ways to specify the schedule duration:
  - **Manual Entry**: Enter number of days directly
  - **Date Range**: Select start and end dates (auto-calculates days)
- **Two Finish Modes**: Different interpretations of day counting
- **Multiple Rounding Options**: Nearest, floor, and ceiling rounding modes
- **Midnight Crossing**: Handles time windows that span midnight

### User Interface
- **Modern UI**: Clean, responsive design with CSS custom properties
- **Run Summary Card**: Displays key metrics before the schedule table:
  - Daily interval shrink (total)
  - Per side shrink (each end)
  - Collapse time
- **Schedule Table**: Formatted table showing day-by-day progression
- **CSV Export**: One-click export of schedule data with summary metadata
- **Error Handling**: Clear validation messages and user feedback

### Smart Defaults
- Start time defaults to **08:00**
- End time defaults to **22:00**
- Start date defaults to **today**
- End date defaults to **end of current year**

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

### Input Parameters

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| **Start Time** | Time | Beginning of the time window | 08:00 |
| **End Time** | Time | End of the time window | 22:00 |
| **Duration** | Number or Date Range | Number of days or date range | - |
| **Finish Mode** | Select | How to interpret "days" | Inclusive |
| **Rounding** | Select | Rounding method for minutes | Nearest |

### Duration Input Options

**Option 1: Manual Entry**
- Enter the number of days directly in the "Number of Days" field
- Leave date range fields empty

**Option 2: Date Range**
- Leave "Number of Days" field empty
- Select start date (defaults to today)
- Select end date (defaults to end of year)
- Days are automatically calculated from the date difference

### Finish Mode Options

- **Inclusive**: Collapse occurs ON day N (today = day 1)
  - Example: 10 days means collapse on day 10
- **After-Steps**: Perform N narrowing steps, collapse on day N+1
  - Example: 10 days means collapse on day 11

### Rounding Modes

- **Nearest**: Round to nearest minute (default)
- **Floor**: Always round down
- **Ceil**: Always round up

## 📊 Run Summary

The Run Summary card displays:

- **Daily interval shrink (total)**: Total minutes the window narrows per day (both sides combined)
- **Per side shrink**: Minutes each side (start/end) shrinks per day
- **Collapse time**: The exact time when the window collapses to a single point

## 💾 CSV Export

The exported CSV file includes:

1. **Schedule Data**: Day, Start Time, End Time columns
2. **Summary Metadata**: Comment lines with:
   - Initial start and end times
   - Daily interval shrink (total)
   - Per side shrink
   - Collapse time
   - Total days
   - Finish mode

Filename format: `time-window-schedule-YYYYMMDD.csv`

## 🎨 Design System

### Color Palette
```css
--primary: #2563eb        /* Blue-600 */
--primary-hover: #1d4ed8   /* Blue-700 */
--success: #059669        /* Green-600 */
--text: #1f2937          /* Gray-800 */
--text-light: #6b7280     /* Gray-500 */
--bg: #ffffff            /* White */
--bg-secondary: #f9fafb   /* Gray-50 */
--border: #e5e7eb        /* Gray-200 */
--error: #dc2626         /* Red-600 */
```

### Typography
- **Font Family**: Inter, system fonts
- **Line Height**: 1.6
- **Responsive Sizing**: Fluid typography

### Components
- **Form Grid**: CSS Grid with auto-fit columns
- **Duration Cards**: Card-based layout for duration input options
- **Summary Card**: Prominent display of key metrics
- **Table**: Monospace font for time columns
- **Buttons**: Primary and success colors with hover states

## 📱 Responsive Design

### Breakpoints
- **Desktop**: > 768px (grid layout)
- **Tablet**: 480px - 768px (stacked layout)
- **Mobile**: < 480px (compact spacing)

### Mobile Optimizations
- Touch-friendly inputs
- Stacked form layout
- Optimized table scrolling
- Readable typography on small screens

## 🧪 Testing

### Unit Tests
Run the JavaScript algorithm tests:
```bash
node test_js_functions.js
```

### Test Scenarios
- ✅ Normal operation (09:00-21:00, 10 days)
- ✅ Midnight crossing (22:30-05:15, 7 days)
- ✅ Single day schedules
- ✅ Both finish modes
- ✅ All rounding modes
- ✅ Date range calculation
- ✅ Invalid inputs and error handling

## 🔍 Browser Compatibility

- **Modern Browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **HTML5 Features**: `<input type="time">`, `<input type="date">`, CSS Grid, Flexbox
- **JavaScript**: ES6+ features (const/let, arrow functions, template literals)

## 🚀 Performance

- **Algorithm Complexity**: O(n) where n = number of days
- **DOM Operations**: Minimal, efficient table generation
- **Bundle Size**: ~10KB total (HTML + CSS + JS)
- **Load Time**: Instant on modern connections

## 🛠️ Development

### File Structure
```
├── index.html (~3KB)     - Semantic HTML structure
├── styles.css (~6KB)     - Modular CSS with custom properties
├── script.js (~12KB)     - Organized JavaScript modules
├── test_js_functions.js  - Test suite
└── main.py              - Original Python CLI tool
```

### Code Quality
- **Readable**: Clear function names and comments
- **Maintainable**: Modular structure and separation of concerns
- **Testable**: Pure functions for algorithm logic
- **Accessible**: Semantic HTML and ARIA attributes

## 📊 Example Outputs

### Basic Schedule (10 days, inclusive)
```
Day  Start   End
1    09:00   21:00
2    09:40   20:20
...  ...     ...
10   15:00   15:00  ← Collapse point
```

### Midnight Crossing (7 days)
```
Day  Start   End
1    22:30   05:15
2    23:04   04:41
...  ...     ...
7    01:53   01:53  ← Collapse point
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

1. Test your changes with `node test_js_functions.js`
2. Ensure responsive design works on mobile
3. Follow the existing code style and documentation
4. Add tests for new features

## 📄 License

This project is a web port of the original Python Time Window Shrinker algorithm.

---

**Built with:** HTML5, CSS3, ES6 JavaScript  
**Algorithm:** Ported from Python CLI tool  
**Design:** Modern, minimalistic web interface
