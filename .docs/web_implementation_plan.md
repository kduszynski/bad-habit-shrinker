# Time Window Shrinker - Web Implementation Plan

## Overview

Convert the Python Time Window Shrinker CLI tool into a minimalistic web application with three files: `index.html`, `styles.css`, and `script.js`.

## Architecture

### File Structure

```text
index.html      # Main HTML structure and form
styles.css      # Modern, minimal styling
script.js       # Algorithm logic and DOM manipulation
```

## HTML Structure (`index.html`)

### Form Section

```html
<form id="shrinker-form">
  <div class="form-group">
    <label for="start-time">Start Time</label>
    <input type="time" id="start-time" required>
  </div>

  <div class="form-group">
    <label for="end-time">End Time</label>
    <input type="time" id="end-time" required>
  </div>

  <div class="form-group">
    <label for="days">Number of Days</label>
    <input type="number" id="days" min="1" required>
  </div>

  <div class="form-group">
    <label for="finish-mode">Finish Mode</label>
    <select id="finish-mode">
      <option value="inclusive">Inclusive (collapse on day N)</option>
      <option value="after-steps">After Steps (collapse after N days)</option>
    </select>
  </div>

  <div class="form-group">
    <label for="rounding">Rounding</label>
    <select id="rounding">
      <option value="nearest">Nearest</option>
      <option value="floor">Floor</option>
      <option value="ceil">Ceil</option>
    </select>
  </div>

  <button type="submit" class="generate-btn">Generate Schedule</button>
</form>
```

### Results Section

```html
<div id="results" class="results hidden">
  <h2>Schedule</h2>
  <table id="schedule-table">
    <thead>
      <tr>
        <th>Day</th>
        <th>Start Time</th>
        <th>End Time</th>
      </tr>
    </thead>
    <tbody id="schedule-body">
      <!-- Dynamic rows inserted here -->
    </tbody>
  </table>

  <div class="summary">
    <p id="collapse-info"></p>
  </div>
</div>
```

## CSS Styling (`styles.css`)

### Design Principles

- **Modern**: Clean typography, subtle shadows, rounded corners
- **Minimalistic**: White space, simple color palette, no unnecessary elements
- **Responsive**: Works on mobile and desktop
- **Accessible**: Good contrast, focus states, semantic markup

### Key Styles

```css
:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --text: #1f2937;
  --text-light: #6b7280;
  --bg: #ffffff;
  --bg-secondary: #f9fafb;
  --border: #e5e7eb;
  --success: #059669;
  --error: #dc2626;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg-secondary);
  margin: 0;
  padding: 2rem;
  min-height: 100vh;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: var(--bg);
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

label {
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text);
}

input, select {
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus, select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.generate-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 1rem;
}

.generate-btn:hover {
  background: var(--primary-hover);
}

.results table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.results th, .results td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.results th {
  font-weight: 600;
  color: var(--text);
}

.hidden {
  display: none;
}

.error {
  color: var(--error);
  margin-top: 0.5rem;
  font-size: 0.875rem;
}
```

## JavaScript Logic (`script.js`)

### Core Algorithm Functions (Ported from Python)

```javascript
const DAY_MIN = 24 * 60;

// Utility functions
function parseHHMM(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatHHMM(minutes) {
  const normalized = ((minutes % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function windowLength(startMin, endMin) {
  return ((endMin - startMin + DAY_MIN) % DAY_MIN);
}

function computeDailyStep(startMin, endMin, days, finishOnDay) {
  const L = windowLength(startMin, endMin);

  if (days <= 0) throw new Error("'days' must be a positive integer");
  if (L === 0) throw new Error("Start and end times define an empty window");

  if (finishOnDay === 'inclusive') {
    return days === 1 ? 0 : L / (2 * (days - 1));
  } else if (finishOnDay === 'after-steps') {
    return L / (2 * days);
  }
  throw new Error("finishOnDay must be 'inclusive' or 'after-steps'");
}

function generateSchedule(startMin, endMin, days, finishOnDay, rounding) {
  const m = computeDailyStep(startMin, endMin, days, finishOnDay);

  const roundFunc = {
    nearest: x => Math.round(x),
    floor: x => Math.floor(x),
    ceil: x => Math.ceil(x)
  }[rounding];

  const rows = [];

  for (let d = 1; d <= days; d++) {
    const offset = (d - 1) * m;
    const start = roundFunc(startMin + offset);
    const end = roundFunc(endMin - offset);
    rows.push({ dayId: d, startMin: start, endMin: end });
  }

  return rows;
}
```

### DOM Manipulation

```javascript
// Form handling
document.getElementById('shrinker-form').addEventListener('submit', (e) => {
  e.preventDefault();

  try {
    // Clear previous errors
    document.querySelectorAll('.error').forEach(el => el.remove());

    // Get form values
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const days = parseInt(document.getElementById('days').value);
    const finishMode = document.getElementById('finish-mode').value;
    const rounding = document.getElementById('rounding').value;

    // Validate inputs
    if (!startTime || !endTime) {
      throw new Error('Start and end times are required');
    }

    // Generate schedule
    const startMin = parseHHMM(startTime);
    const endMin = parseHHMM(endTime);
    const rows = generateSchedule(startMin, endMin, days, finishMode, rounding);

    // Display results
    displayResults(rows, startMin, endMin);

  } catch (error) {
    displayError(error.message);
  }
});

function displayResults(rows, startMin, endMin) {
  const resultsDiv = document.getElementById('results');
  const tbody = document.getElementById('schedule-body');
  const collapseInfo = document.getElementById('collapse-info');

  // Clear previous results
  tbody.innerHTML = '';

  // Add rows to table
  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.dayId}</td>
      <td>${formatHHMM(row.startMin)}</td>
      <td>${formatHHMM(row.endMin)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Show collapse info
  const L = windowLength(startMin, endMin);
  const collapseMin = Math.round((startMin + L / 2) % DAY_MIN);
  collapseInfo.textContent = `Hour zero (midpoint) occurs at: ${formatHHMM(collapseMin)}`;

  // Show results
  resultsDiv.classList.remove('hidden');
}

function displayError(message) {
  const form = document.getElementById('shrinker-form');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error';
  errorDiv.textContent = message;
  form.appendChild(errorDiv);
}
```

## Implementation Steps

1. **Create HTML structure** with semantic form and results sections
2. **Implement CSS styling** with modern design principles
3. **Port Python algorithm** to JavaScript with equivalent functionality
4. **Add form validation** and error handling
5. **Implement DOM manipulation** for dynamic results display
6. **Test edge cases** including midnight crossing and invalid inputs

## Key Considerations

### Browser Compatibility

- Use modern HTML5 input types (`type="time"`, `type="number"`)
- Ensure ES6+ features work in target browsers
- Consider fallbacks for older browsers if needed

### User Experience

- Real-time validation feedback
- Loading states during calculation
- Clear error messages
- Responsive design for mobile devices

### Performance

- Algorithm is O(n) where n = number of days
- Minimal DOM manipulation
- No external dependencies

## Testing Scenarios

- Normal operation (09:00-21:00, 10 days)
- Midnight crossing (22:30-05:15, 7 days)
- Edge cases (1 day, same start/end time)
- Invalid inputs (negative days, malformed times)
- Rounding behavior verification
