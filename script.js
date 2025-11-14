/**
 * Time Window Shrinker - Web Application
 *
 * This script implements the time window shrinking algorithm as a web application.
 * It simulates progressive narrowing of a daily time window until it collapses to a single point.
 *
 * Algorithm ported from Python CLI tool with equivalent functionality.
 */

// ============================================
// Constants and Configuration
// ============================================

const DAY_MINUTES = 24 * 60; // Total minutes in a day
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000; // Total milliseconds in a day

// ============================================
// Utility Functions
// ============================================

/**
 * Parse HH:MM time string to minutes since midnight
 * @param {string} timeString - Time in "HH:MM" format
 * @returns {number} Minutes since midnight
 * @throws {Error} If time format is invalid
 */
function parseHHMM(timeString) {
    if (!timeString || typeof timeString !== 'string') {
        throw new Error('Invalid time string provided');
    }

    const parts = timeString.split(':');
    if (parts.length !== 2) {
        throw new Error('Time must be in HH:MM format');
    }

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) {
        throw new Error('Hours and minutes must be valid numbers');
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Hours must be 0-23 and minutes must be 0-59');
    }

    return hours * 60 + minutes;
}

/**
 * Normalize minutes to the canonical 0..(DAY_MINUTES-1) range.
 * @param {number} minutes
 * @returns {number}
 */
function normalizeMinutes(minutes) {
    return ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

/**
 * Format minutes since midnight to HH:MM string
 * @param {number} minutes - Minutes since midnight
 * @returns {string} Time in "HH:MM" format
 */
function formatHHMM(minutes) {
    const normalized = normalizeMinutes(minutes);

    const hours = Math.floor(normalized / 60);
    const mins = normalized % 60;

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Compute the midpoint between two times on a circular 24h clock.
 * This respects wrap-around (e.g. midpoint of 23:30 and 00:30 is 00:00, not 12:00).
 * @param {number} aMinutes
 * @param {number} bMinutes
 * @returns {number}
 */
function circularMidpoint(aMinutes, bMinutes) {
    const a = normalizeMinutes(aMinutes);
    const b = normalizeMinutes(bMinutes);
    let diff = (b - a + DAY_MINUTES) % DAY_MINUTES;

    if (diff > DAY_MINUTES / 2) {
        diff -= DAY_MINUTES;
    }

    return normalizeMinutes(a + diff / 2);
}

/**
 * Format a Date object into YYYY-MM-DD for input[type="date"]
 * @param {Date} date - JavaScript Date object
 * @returns {string} Date string in YYYY-MM-DD format
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD date string into a UTC Date object
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date|null} Date object or null if invalid
 */
function parseDateInput(dateString) {
    if (!dateString) {
        return null;
    }

    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return null;
    }

    const [year, month, day] = parts;
    return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Calculate the inclusive number of days between two date strings
 * @param {string} startDateValue - Start date string in YYYY-MM-DD format
 * @param {string} endDateValue - End date string in YYYY-MM-DD format
 * @returns {number} Inclusive number of days
 * @throws {Error} If dates are invalid or out of order
 */
function calculateDaysFromDates(startDateValue, endDateValue) {
    const startDate = parseDateInput(startDateValue);
    const endDate = parseDateInput(endDateValue);

    if (!startDate || !endDate) {
        throw new Error('Start date and end date must be valid dates');
    }

    const diffMs = endDate.getTime() - startDate.getTime();

    if (diffMs < 0) {
        throw new Error('End date must be on or after the start date');
    }

    return Math.floor(diffMs / MILLISECONDS_PER_DAY) + 1;
}

/**
 * Calculate the length of a time window, handling midnight crossing
 * @param {number} startMin - Start time in minutes
 * @param {number} endMin - End time in minutes
 * @returns {number} Window length in minutes
 */
function calculateWindowLength(startMin, endMin) {
    return ((endMin - startMin + DAY_MINUTES) % DAY_MINUTES);
}

// ============================================
// Core Algorithm Functions
// ============================================

/**
 * Compute the daily narrowing step based on interpretation mode
 * @param {number} startMin - Start time in minutes
 * @param {number} endMin - End time in minutes
 * @param {number} days - Number of days
 * @param {string} finishOnDay - "inclusive" or "after-steps"
 * @returns {number} Daily step size in minutes
 * @throws {Error} If inputs are invalid
 */
function computeDailyStep(startMin, endMin, days, finishOnDay) {
    // Input validation
    if (!Number.isInteger(days) || days <= 0) {
        throw new Error('Number of days must be a positive integer');
    }

    const windowLength = calculateWindowLength(startMin, endMin);
    if (windowLength === 0) {
        throw new Error('Start and end times define an empty window');
    }

    // Calculate step based on interpretation mode
    if (finishOnDay === 'inclusive') {
        // Collapse occurs ON day N (today counted as day 1)
        return days === 1 ? 0 : windowLength / (2 * (days - 1));
    } else if (finishOnDay === 'after-steps') {
        // Perform exactly N narrowing steps; collapse happens next day
        return windowLength / (2 * days);
    } else {
        throw new Error('finishOnDay must be "inclusive" or "after-steps"');
    }
}

/**
 * Compute offset per side for each day based on algorithm type.
 * Returns array of offsets (minutes) where offsets[i] is per-side offset on day i (1-based).
 */
function computeOffsetsByAlgorithm(startMin, endMin, days, finishOnDay, algorithmType, percentage = 0.05) {
    const L = calculateWindowLength(startMin, endMin);
    const halfL = L / 2;

    if (days === 1) {
        return [0];
    }

    // Helper for rounding collapse day according to finish mode (only used for linear)
    if (algorithmType === 'linear') {
        const m = computeDailyStep(startMin, endMin, days, finishOnDay);
        const offsets = [];
        for (let d = 1; d <= days; d++) {
            offsets.push((d - 1) * m);
        }
        return offsets;
    }

    // For non-linear algorithms we ignore finishOnDay and collapse exactly on day N
    const offsets = [];

    if (algorithmType === 'percentage') {
        // Shrink by fixed percentage of current length; final day clamps to collapse
        let currentLen = L;
        let cumulativeOffset = 0;
        for (let d = 1; d <= days; d++) {
            offsets.push(cumulativeOffset);
            if (d === days) {
                cumulativeOffset = halfL; // collapse
            } else {
                const shrinkThisDay = currentLen * percentage;
                cumulativeOffset += shrinkThisDay / 2;
                currentLen -= shrinkThisDay;
            }
        }
    } else if (algorithmType === 'logistic') {
        const k = 6; // steepness factor; bigger => steeper middle
        const logistic = (x) => 1 / (1 + Math.exp(-k * (x - 0.5)));
        const startVal = logistic(0);
        const endVal = logistic(1);
        const denom = endVal - startVal;
        for (let d = 1; d <= days; d++) {
            const xPrev = (d - 1) / (days - 1);
            const xCurr = xPrev; // offset computed directly on xPrev
            const frac = (logistic(xCurr) - startVal) / denom; // 0..1
            offsets.push(halfL * frac);
        }
    } else if (algorithmType === 'sinusoidal') {
        for (let d = 1; d <= days; d++) {
            const t = (d - 1) / (days - 1); // 0..1
            const frac = (1 - Math.cos(Math.PI * t)) / 2; // 0..1
            offsets.push(halfL * frac);
        }
    } else {
        throw new Error(`Unsupported algorithm type: ${algorithmType}`);
    }

    return offsets;
}

/**
 * Generate the complete schedule of shrinking time windows
 * @param {number} startMin - Initial start time in minutes
 * @param {number} endMin - Initial end time in minutes
 * @param {number} days - Number of days
 * @param {string} finishOnDay - Interpretation mode
 * @param {string} rounding - Rounding mode ("nearest", "floor", "ceil")
 * @param {string} algorithmType - Algorithm variant
 * @returns {Array} Array of schedule row objects
 */
function generateSchedule(startMin, endMin, days, finishOnDay, rounding, algorithmType) {
    const offsets = computeOffsetsByAlgorithm(startMin, endMin, days, finishOnDay, algorithmType);

    // Define rounding function based on mode
    const roundFunctions = {
        nearest: Math.round,
        floor: Math.floor,
        ceil: Math.ceil
    };

    const roundFunc = roundFunctions[rounding];
    if (!roundFunc) {
        throw new Error('Rounding mode must be "nearest", "floor", or "ceil"');
    }

    const schedule = [];

    for (let day = 1; day <= days; day++) {
        const offset = offsets[day - 1];

        // Calculate start and end times for this day
        const dayStart = roundFunc(startMin + offset);
        const dayEnd = roundFunc(endMin - offset);

        schedule.push({
            dayId: day,
            startMin: dayStart,
            endMin: dayEnd
        });
    }

    return schedule;
}

// ============================================
// DOM Manipulation and Event Handling
// ============================================

// Store current schedule data for export
let currentScheduleData = null;

/**
 * Initialize the application when DOM is loaded
 */
// ============================================
// Settings Toggle Handler
// ============================================

/**
 * Initialize the advanced settings toggle functionality
 */
function initializeSettingsToggle() {
    const toggleBtn = document.getElementById('toggle-settings');
    const settingsContent = document.getElementById('advanced-settings-content');
    const toggleIcon = toggleBtn?.querySelector('.toggle-icon');
    const toggleText = toggleBtn?.querySelector('.toggle-text');

    if (!toggleBtn || !settingsContent) return;

    toggleBtn.addEventListener('click', function() {
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        const newExpanded = !isExpanded;

        toggleBtn.setAttribute('aria-expanded', newExpanded);
        settingsContent.classList.toggle('hidden', !newExpanded);
        
        if (toggleIcon) {
            toggleIcon.textContent = newExpanded ? '▲' : '▼';
        }
        if (toggleText) {
            toggleText.textContent = newExpanded ? 'Less Settings' : 'More Settings';
        }
    });
}

// ============================================
// Main Application Initialization
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize settings toggle
    initializeSettingsToggle();
    const form = document.getElementById('shrinker-form');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const exportBtn = document.getElementById('export-csv-btn');

    if (startDateInput) {
        const todayValue = formatDateForInput(new Date());
        if (!startDateInput.value) {
            startDateInput.value = todayValue;
        }

        if (endDateInput) {
            endDateInput.min = startDateInput.value || todayValue;
            
            // Set end date to end of year if not already set
            if (!endDateInput.value) {
                const today = new Date();
                const endOfYear = new Date(today.getFullYear(), 11, 31); // Month 11 = December
                endDateInput.value = formatDateForInput(endOfYear);
            }
        }

        startDateInput.addEventListener('change', function() {
            if (!endDateInput) {
                return;
            }

            const startValue = startDateInput.value;
            endDateInput.min = startValue || '';

            if (endDateInput.value && startValue && endDateInput.value < startValue) {
                endDateInput.value = startValue;
            }
        });
    }

    if (endDateInput && startDateInput) {
        endDateInput.addEventListener('change', function() {
            const startValue = startDateInput.value;

            if (endDateInput.value && startValue && endDateInput.value < startValue) {
                endDateInput.value = startValue;
            }
        });
    }

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportCSV);
    }
});

/**
 * Handle form submission
 * @param {Event} event - Form submit event
 */
function handleFormSubmit(event) {
    event.preventDefault();

    try {
        // Clear any previous errors
        clearErrors();

        // Get and validate form inputs
        const formData = getFormData();
        validateFormData(formData);

        // Generate schedule
        const schedule = generateSchedule(
            formData.startMin,
            formData.endMin,
            formData.days,
            formData.finishMode,
            formData.rounding,
            formData.algorithm
        );

        // Display results
        displayResults(schedule, formData.startMin, formData.endMin, formData.finishMode, formData.days, formData.algorithm);

    } catch (error) {
        displayError(error.message);
    }
}

/**
 * Extract and parse form data
 * @returns {Object} Parsed form data
 */
function getFormData() {
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const daysInput = document.getElementById('days');
    const finishMode = document.getElementById('finish-mode').value;
    const rounding = document.getElementById('rounding').value;
    const algorithm = document.getElementById('algorithm').value;
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    const rawDaysValue = daysInput && typeof daysInput.value === 'string' ? daysInput.value.trim() : '';
    const startDateValue = startDateInput ? startDateInput.value : '';
    const endDateValue = endDateInput ? endDateInput.value : '';

    const usingManualDays = rawDaysValue !== '';
    const usingDateRange = !usingManualDays && startDateValue && endDateValue;

    let days = null;

    if (usingManualDays) {
        const parsedDays = Number(rawDaysValue);
        days = Number.isFinite(parsedDays) ? parsedDays : NaN;
    } else if (usingDateRange) {
        days = calculateDaysFromDates(startDateValue, endDateValue);
    }

    return {
        startMin: parseHHMM(startTime),
        endMin: parseHHMM(endTime),
        days: days,
        finishMode: finishMode,
        rounding: rounding,
        algorithm: algorithm,
        startTime: startTime,
        endTime: endTime,
        daysSource: usingManualDays ? 'manual' : (usingDateRange ? 'range' : null),
        rawDaysValue: rawDaysValue,
        startDateValue: startDateValue,
        endDateValue: endDateValue
    };
}

/**
 * Validate form data
 * @param {Object} formData - Form data to validate
 * @throws {Error} If validation fails
 */
function validateFormData(formData) {
    if (!formData.startTime || !formData.endTime) {
        throw new Error('Start time and end time are required');
    }

    if (!formData.daysSource) {
        throw new Error('Provide a number of days or select both start and end dates');
    }

    if (!Number.isInteger(formData.days) || formData.days <= 0) {
        if (formData.daysSource === 'range') {
            throw new Error('Start and end dates must define at least one day');
        }
        throw new Error('Number of days must be a positive integer');
    }

    if (formData.days > 1000) {
        throw new Error('Number of days cannot exceed 1000');
    }
}

/**
 * Clear all error messages from the form
 */
function clearErrors() {
    const errorElements = document.querySelectorAll('.error');
    errorElements.forEach(element => element.remove());
}

/**
 * Display error message to user
 * @param {string} message - Error message to display
 */
function displayError(message) {
    const form = document.getElementById('shrinker-form');
    if (!form) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert');

    form.appendChild(errorDiv);

    // Scroll to error message
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Display the generated schedule results
 * @param {Array} schedule - Array of schedule row objects
 * @param {number} startMin - Original start time
 * @param {number} endMin - Original end time
 */
function displayResults(schedule, startMin, endMin, finishMode, totalDays, algorithmType) {
    const resultsSection = document.getElementById('results');
    const scheduleBody = document.getElementById('schedule-body');
    const collapseInfo = document.getElementById('collapse-info');
    const summaryDailyShrink = document.getElementById('summary-daily-shrink');
    const summaryPerSideShrink = document.getElementById('summary-per-side-shrink');
    const summaryCollapseTime = document.getElementById('summary-collapse-time');
    const summaryAlgo = document.getElementById('summary-algo');

    if (!resultsSection || !scheduleBody || !collapseInfo || !summaryDailyShrink || !summaryPerSideShrink || !summaryCollapseTime) {
        console.error('Required DOM elements not found');
        return;
    }

    // Clear previous results
    scheduleBody.innerHTML = '';

    // Add schedule rows to table
    schedule.forEach(row => {
        const tableRow = document.createElement('tr');

        tableRow.innerHTML = `
            <td>${row.dayId}</td>
            <td>${formatHHMM(row.startMin)}</td>
            <td>${formatHHMM(row.endMin)}</td>
        `;

        scheduleBody.appendChild(tableRow);
    });

    // Calculate and display collapse information
    const windowLength = calculateWindowLength(startMin, endMin);
    const collapseTime = Math.round((startMin + windowLength / 2) % DAY_MINUTES);

    // For non-linear algorithms daily shrink is variable; display N/A
    let dailyShrinkMinutes = '--';
    let perSideShrinkMinutes = '--';

    if (algorithmType === 'linear') {
        const m = computeDailyStep(startMin, endMin, totalDays, finishMode);
        dailyShrinkMinutes = Math.max(0, Math.round(m * 2));
        perSideShrinkMinutes = Math.max(0, Math.round(m));
    }
    
    summaryDailyShrink.textContent = `${dailyShrinkMinutes} min/day`;
    summaryPerSideShrink.textContent = `${perSideShrinkMinutes} min/day (each side)`;

    const collapseMoment = finishMode === 'inclusive' && schedule.length > 0
        ? Math.round(circularMidpoint(schedule[schedule.length - 1].startMin, schedule[schedule.length - 1].endMin))
        : collapseTime;

    summaryCollapseTime.textContent = formatHHMM(collapseMoment);
    summaryAlgo.textContent = algorithmType.charAt(0).toUpperCase() + algorithmType.slice(1);

    let collapseDescriptor = '';
    if (finishMode === 'inclusive') {
        collapseDescriptor = `Window collapses on day ${totalDays} at ${formatHHMM(collapseMoment)}.`;
    } else {
        collapseDescriptor = `After ${totalDays} narrowing step${totalDays === 1 ? '' : 's'}, the window collapses the following day at ${formatHHMM(collapseMoment)}.`;
    }

    collapseInfo.textContent = collapseDescriptor;

    // Store schedule data for export
    currentScheduleData = {
        schedule: schedule,
        startTime: formatHHMM(startMin),
        endTime: formatHHMM(endMin),
        dailyShrink: dailyShrinkMinutes,
        perSideShrink: perSideShrinkMinutes,
        collapseTime: formatHHMM(collapseMoment),
        totalDays: totalDays,
        finishMode: finishMode,
        algorithm: algorithmType
    };

    // Show results section
    resultsSection.classList.remove('hidden');

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Handle CSV export button click
 */
function handleExportCSV() {
    if (!currentScheduleData) {
        displayError('No schedule data available to export');
        return;
    }

    try {
        exportScheduleToCSV(currentScheduleData);
    } catch (error) {
        displayError(`Export failed: ${error.message}`);
    }
}

/**
 * Export schedule data to CSV file
 * @param {Object} scheduleData - Schedule data object
 */
function exportScheduleToCSV(scheduleData) {
    const { schedule, startTime, endTime, dailyShrink, perSideShrink, collapseTime, totalDays, finishMode, algorithm } = scheduleData;

    // Create CSV header
    const headers = ['Day', 'Start Time', 'End Time'];
    const csvRows = [headers.join(',')];

    // Add schedule rows
    schedule.forEach(row => {
        const day = row.dayId;
        const start = formatHHMM(row.startMin);
        const end = formatHHMM(row.endMin);
        csvRows.push([day, start, end].join(','));
    });

    // Add summary information as comments/metadata
    csvRows.push('');
    csvRows.push('# Summary Information');
    csvRows.push(`# Initial Start Time,${startTime}`);
    csvRows.push(`# Initial End Time,${endTime}`);
    csvRows.push(`# Daily Interval Shrink (Total),${dailyShrink} min/day`);
    csvRows.push(`# Per Side Shrink,${perSideShrink} min/day (each side)`);
    csvRows.push(`# Collapse Time,${collapseTime}`);
    csvRows.push(`# Total Days,${totalDays}`);
    csvRows.push(`# Finish Mode,${finishMode}`);
    csvRows.push(`# Algorithm,${algorithm}`);

    // Create CSV content
    const csvContent = csvRows.join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `time-window-schedule-${timestamp}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL object
    URL.revokeObjectURL(url);
}

// ============================================
// Export functions for testing (if needed)
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseHHMM,
        formatHHMM,
        calculateWindowLength,
        computeDailyStep,
        generateSchedule
    };
}
