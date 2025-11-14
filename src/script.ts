/**
 * Time Window Shrinker - Web Application
 *
 * TypeScript implementation of the time window shrinking algorithm and
 * browser UI bindings. Pure calculation helpers are exported for testing.
 */

export const DAY_MINUTES = 24 * 60;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type FinishMode = 'inclusive' | 'after-steps';
export type RoundingMode = 'nearest' | 'floor' | 'ceil';
export type AlgorithmType = 'linear' | 'percentage' | 'logistic' | 'sinusoidal';
type DaysSource = 'manual' | 'range' | null;

type NumericDisplay = number | '--';

export interface ScheduleRow {
    dayId: number;
    startMin: number;
    endMin: number;
}

interface ScheduleExportData {
    schedule: ScheduleRow[];
    startTime: string;
    endTime: string;
    dailyShrink: NumericDisplay;
    perSideShrink: NumericDisplay;
    collapseTime: string;
    totalDays: number;
    finishMode: FinishMode;
    algorithm: AlgorithmType;
}

interface ParsedFormData {
    startMin: number;
    endMin: number;
    days: number | null;
    finishMode: FinishMode;
    rounding: RoundingMode;
    algorithm: AlgorithmType;
    startTime: string;
    endTime: string;
    daysSource: DaysSource;
    rawDaysValue: string;
    startDateValue: string;
    endDateValue: string;
}

interface ValidatedFormData extends ParsedFormData {
    days: number;
}

const ROUNDERS: Record<RoundingMode, (value: number) => number> = {
    nearest: Math.round,
    floor: Math.floor,
    ceil: Math.ceil
};

const asError = (value: unknown): Error => (value instanceof Error ? value : new Error(String(value)));

// ============================================
// Utility Functions (exported for testing)
// ============================================

export function parseHHMM(timeString: string): number {
    if (!timeString || typeof timeString !== 'string') {
        throw new Error('Invalid time string provided');
    }

    const parts = timeString.split(':');
    if (parts.length !== 2) {
        throw new Error('Time must be in HH:MM format');
    }

    const hours = parseInt(parts[0] ?? '', 10);
    const minutes = parseInt(parts[1] ?? '', 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        throw new Error('Hours and minutes must be valid numbers');
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Hours must be 0-23 and minutes must be 0-59');
    }

    return hours * 60 + minutes;
}

export function formatHHMM(minutes: number): string {
    const normalized = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
    const hours = Math.floor(normalized / 60);
    const mins = normalized % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateInput(dateString: string | undefined): Date | null {
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

function calculateDaysFromDates(startDateValue: string, endDateValue: string): number {
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

export function calculateWindowLength(startMin: number, endMin: number): number {
    return ((endMin - startMin + DAY_MINUTES) % DAY_MINUTES);
}

// ============================================
// Core Algorithm Functions
// ============================================

export function computeDailyStep(startMin: number, endMin: number, days: number, finishOnDay: FinishMode): number {
    if (!Number.isInteger(days) || days <= 0) {
        throw new Error('Number of days must be a positive integer');
    }

    const windowLength = calculateWindowLength(startMin, endMin);
    if (windowLength === 0) {
        throw new Error('Start and end times define an empty window');
    }

    if (finishOnDay === 'inclusive') {
        return days === 1 ? 0 : windowLength / (2 * (days - 1));
    }

    return windowLength / (2 * days);
}

function computeOffsetsByAlgorithm(
    startMin: number,
    endMin: number,
    days: number,
    finishOnDay: FinishMode,
    algorithmType: AlgorithmType,
    percentage = 0.05
): number[] {
    const windowLength = calculateWindowLength(startMin, endMin);
    const halfLength = windowLength / 2;

    if (algorithmType === 'linear') {
        const m = computeDailyStep(startMin, endMin, days, finishOnDay);
        return Array.from({ length: days }, (_, idx) => idx * m);
    }

    const offsets: number[] = [];

    if (algorithmType === 'percentage') {
        let currentLen = windowLength;
        let cumulativeOffset = 0;
        for (let day = 1; day <= days; day += 1) {
            offsets.push(cumulativeOffset);
            if (day === days) {
                cumulativeOffset = halfLength;
            } else {
                const shrinkThisDay = currentLen * percentage;
                cumulativeOffset += shrinkThisDay / 2;
                currentLen -= shrinkThisDay;
            }
        }
    } else if (algorithmType === 'logistic') {
        const k = 6;
        const logistic = (x: number): number => 1 / (1 + Math.exp(-k * (x - 0.5)));
        const startVal = logistic(0);
        const endVal = logistic(1);
        const denom = endVal - startVal;

        for (let day = 1; day <= days; day += 1) {
            const t = (day - 1) / (days - 1 || 1);
            const frac = (logistic(t) - startVal) / denom;
            offsets.push(halfLength * frac);
        }
    } else if (algorithmType === 'sinusoidal') {
        for (let day = 1; day <= days; day += 1) {
            const t = (day - 1) / (days - 1 || 1);
            const frac = (1 - Math.cos(Math.PI * t)) / 2;
            offsets.push(halfLength * frac);
        }
    } else {
        throw new Error(`Unsupported algorithm type: ${algorithmType}`);
    }

    return offsets;
}

export function generateSchedule(
    startMin: number,
    endMin: number,
    days: number,
    finishOnDay: FinishMode,
    rounding: RoundingMode,
    algorithmType: AlgorithmType
): ScheduleRow[] {
    const offsets = computeOffsetsByAlgorithm(startMin, endMin, days, finishOnDay, algorithmType);
    const roundFunc = ROUNDERS[rounding];

    if (!roundFunc) {
        throw new Error('Rounding mode must be "nearest", "floor", or "ceil"');
    }

    return offsets.map((offset, idx) => {
        const day = idx + 1;
        return {
            dayId: day,
            startMin: roundFunc(startMin + offset),
            endMin: roundFunc(endMin - offset)
        };
    });
}

// ============================================
// DOM Manipulation and Event Handling
// ============================================

let currentScheduleData: ScheduleExportData | null = null;

function initializeSettingsToggle(): void {
    const toggleBtn = document.getElementById('toggle-settings') as HTMLButtonElement | null;
    const settingsContent = document.getElementById('advanced-settings-content');
    const toggleIcon = toggleBtn?.querySelector<HTMLElement>('.toggle-icon');
    const toggleText = toggleBtn?.querySelector<HTMLElement>('.toggle-text');

    if (!toggleBtn || !settingsContent) {
        return;
    }

    toggleBtn.addEventListener('click', () => {
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        const newExpanded = !isExpanded;

        toggleBtn.setAttribute('aria-expanded', String(newExpanded));
        settingsContent.classList.toggle('hidden', !newExpanded);

        if (toggleIcon) {
            toggleIcon.textContent = newExpanded ? '▲' : '▼';
        }
        if (toggleText) {
            toggleText.textContent = newExpanded ? 'Less Settings' : 'More Settings';
        }
    });
}

function initApp(): void {
    initializeSettingsToggle();

    const form = document.getElementById('shrinker-form') as HTMLFormElement | null;
    const startDateInput = document.getElementById('start-date') as HTMLInputElement | null;
    const endDateInput = document.getElementById('end-date') as HTMLInputElement | null;
    const exportBtn = document.getElementById('export-csv-btn') as HTMLButtonElement | null;

    if (startDateInput) {
        const todayValue = formatDateForInput(new Date());
        if (!startDateInput.value) {
            startDateInput.value = todayValue;
        }

        if (endDateInput) {
            endDateInput.min = startDateInput.value || todayValue;
            if (!endDateInput.value) {
                const today = new Date();
                const endOfYear = new Date(today.getFullYear(), 11, 31);
                endDateInput.value = formatDateForInput(endOfYear);
            }
        }

        startDateInput.addEventListener('change', () => {
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
        endDateInput.addEventListener('change', () => {
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
}

function handleFormSubmit(event: Event): void {
    event.preventDefault();

    try {
        clearErrors();
        const formData = getFormData();
        validateFormData(formData);

        const schedule = generateSchedule(
            formData.startMin,
            formData.endMin,
            formData.days,
            formData.finishMode,
            formData.rounding,
            formData.algorithm
        );

        displayResults(
            schedule,
            formData.startMin,
            formData.endMin,
            formData.finishMode,
            formData.days,
            formData.algorithm
        );
    } catch (error) {
        displayError(asError(error).message);
    }
}

function getFormData(): ParsedFormData {
    const startTimeInput = document.getElementById('start-time') as HTMLInputElement | null;
    const endTimeInput = document.getElementById('end-time') as HTMLInputElement | null;
    const daysInput = document.getElementById('days') as HTMLInputElement | null;
    const finishModeSelect = document.getElementById('finish-mode') as HTMLSelectElement | null;
    const roundingSelect = document.getElementById('rounding') as HTMLSelectElement | null;
    const algorithmSelect = document.getElementById('algorithm') as HTMLSelectElement | null;
    const startDateInput = document.getElementById('start-date') as HTMLInputElement | null;
    const endDateInput = document.getElementById('end-date') as HTMLInputElement | null;

    if (!startTimeInput || !endTimeInput || !finishModeSelect || !roundingSelect || !algorithmSelect) {
        throw new Error('Required form inputs are missing');
    }

    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const rawDaysValue = (daysInput?.value ?? '').trim();
    const startDateValue = startDateInput?.value ?? '';
    const endDateValue = endDateInput?.value ?? '';

    const usingManualDays = rawDaysValue !== '';
    const usingDateRange = !usingManualDays && Boolean(startDateValue && endDateValue);

    let days: number | null = null;

    if (usingManualDays) {
        const parsedDays = Number(rawDaysValue);
        days = Number.isFinite(parsedDays) ? parsedDays : NaN;
    } else if (usingDateRange) {
        days = calculateDaysFromDates(startDateValue, endDateValue);
    }

    return {
        startMin: parseHHMM(startTime),
        endMin: parseHHMM(endTime),
        days,
        finishMode: finishModeSelect.value as FinishMode,
        rounding: roundingSelect.value as RoundingMode,
        algorithm: algorithmSelect.value as AlgorithmType,
        startTime,
        endTime,
        daysSource: usingManualDays ? 'manual' : (usingDateRange ? 'range' : null),
        rawDaysValue,
        startDateValue,
        endDateValue
    };
}

function validateFormData(formData: ParsedFormData): asserts formData is ValidatedFormData {
    if (!formData.startTime || !formData.endTime) {
        throw new Error('Start time and end time are required');
    }

    if (!formData.daysSource) {
        throw new Error('Provide a number of days or select both start and end dates');
    }

    const days = formData.days;

    if (days === null || !Number.isInteger(days) || days <= 0) {
        if (formData.daysSource === 'range') {
            throw new Error('Start and end dates must define at least one day');
        }
        throw new Error('Number of days must be a positive integer');
    }

    if (days > 1000) {
        throw new Error('Number of days cannot exceed 1000');
    }

    formData.days = days;
}

function clearErrors(): void {
    document.querySelectorAll<HTMLElement>('.error').forEach((element) => element.remove());
}

function displayError(message: string): void {
    const form = document.getElementById('shrinker-form');
    if (!form) {
        return;
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert');

    form.appendChild(errorDiv);
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function displayResults(
    schedule: ScheduleRow[],
    startMin: number,
    endMin: number,
    finishMode: FinishMode,
    totalDays: number,
    algorithmType: AlgorithmType
): void {
    const resultsSection = document.getElementById('results');
    const scheduleBody = document.getElementById('schedule-body');
    const collapseInfo = document.getElementById('collapse-info');
    const summaryDailyShrink = document.getElementById('summary-daily-shrink');
    const summaryPerSideShrink = document.getElementById('summary-per-side-shrink');
    const summaryCollapseTime = document.getElementById('summary-collapse-time');
    const summaryAlgo = document.getElementById('summary-algo');

    if (!resultsSection || !scheduleBody || !collapseInfo || !summaryDailyShrink || !summaryPerSideShrink || !summaryCollapseTime || !summaryAlgo) {
        console.error('Required DOM elements not found');
        return;
    }

    scheduleBody.innerHTML = '';

    schedule.forEach((row) => {
        const tableRow = document.createElement('tr');
        tableRow.innerHTML = `
            <td>${row.dayId}</td>
            <td>${formatHHMM(row.startMin)}</td>
            <td>${formatHHMM(row.endMin)}</td>
        `;
        scheduleBody.appendChild(tableRow);
    });

    const windowLength = calculateWindowLength(startMin, endMin);
    const collapseTime = Math.round((startMin + windowLength / 2) % DAY_MINUTES);

    let dailyShrinkMinutes: NumericDisplay = '--';
    let perSideShrinkMinutes: NumericDisplay = '--';

    if (algorithmType === 'linear') {
        const m = computeDailyStep(startMin, endMin, totalDays, finishMode);
        dailyShrinkMinutes = Math.max(0, Math.round(m * 2));
        perSideShrinkMinutes = Math.max(0, Math.round(m));
    }

    summaryDailyShrink.textContent = `${dailyShrinkMinutes} min/day`;
    summaryPerSideShrink.textContent = `${perSideShrinkMinutes} min/day (each side)`;

    const collapseMoment = finishMode === 'inclusive' && schedule.length > 0
        ? Math.round((schedule[schedule.length - 1]?.startMin + schedule[schedule.length - 1]?.endMin) / 2)
        : collapseTime;

    summaryCollapseTime.textContent = formatHHMM(collapseMoment);
    summaryAlgo.textContent = algorithmType.charAt(0).toUpperCase() + algorithmType.slice(1);

    let collapseDescriptor: string;
    if (finishMode === 'inclusive') {
        collapseDescriptor = `Window collapses on day ${totalDays} at ${formatHHMM(collapseMoment)}.`;
    } else {
        const suffix = totalDays === 1 ? '' : 's';
        collapseDescriptor = `After ${totalDays} narrowing step${suffix}, the window collapses the following day at ${formatHHMM(collapseMoment)}.`;
    }

    collapseInfo.textContent = collapseDescriptor;

    currentScheduleData = {
        schedule,
        startTime: formatHHMM(startMin),
        endTime: formatHHMM(endMin),
        dailyShrink: dailyShrinkMinutes,
        perSideShrink: perSideShrinkMinutes,
        collapseTime: formatHHMM(collapseMoment),
        totalDays,
        finishMode,
        algorithm: algorithmType
    };

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleExportCSV(): void {
    if (!currentScheduleData) {
        displayError('No schedule data available to export');
        return;
    }

    try {
        exportScheduleToCSV(currentScheduleData);
    } catch (error) {
        displayError(`Export failed: ${asError(error).message}`);
    }
}

function exportScheduleToCSV(scheduleData: ScheduleExportData): void {
    const { schedule, startTime, endTime, dailyShrink, perSideShrink, collapseTime, totalDays, finishMode, algorithm } = scheduleData;

    const headers = ['Day', 'Start Time', 'End Time'];
    const csvRows: string[] = [headers.join(',')];

    schedule.forEach((row) => {
        csvRows.push([row.dayId, formatHHMM(row.startMin), formatHHMM(row.endMin)].join(','));
    });

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

    const csvContent = csvRows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `time-window-schedule-${timestamp}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initApp);
}
