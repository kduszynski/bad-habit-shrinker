import {
    parseHHMM,
    formatHHMM,
    calculateWindowLength,
    computeDailyStep,
    generateSchedule,
    ScheduleRow,
    RoundingMode
} from '../src/script';

const logSchedule = (label: string, schedule: ScheduleRow[]): void => {
    console.log(label);
    schedule.forEach((row) => {
        console.log(`Day ${row.dayId}: ${formatHHMM(row.startMin)} - ${formatHHMM(row.endMin)}`);
    });
};

console.log('Testing Time Window Shrinker TypeScript Implementation\\n');

// Test 1: Basic functionality
logSchedule(
    'Test 1: Basic schedule generation (09:00-21:00, 10 days, inclusive)',
    generateSchedule(parseHHMM('09:00'), parseHHMM('21:00'), 10, 'inclusive', 'nearest', 'linear')
);

// Test 2: Midnight crossing
logSchedule(
    '\\nTest 2: Midnight crossing (22:30-05:15, 7 days, inclusive)',
    generateSchedule(parseHHMM('22:30'), parseHHMM('05:15'), 7, 'inclusive', 'nearest', 'linear')
);

// Test 3: After-steps mode
logSchedule(
    '\\nTest 3: After-steps mode (09:00-21:00, 5 days, after-steps)',
    generateSchedule(parseHHMM('09:00'), parseHHMM('21:00'), 5, 'after-steps', 'nearest', 'linear')
);

// Test 4: Single day
logSchedule(
    '\\nTest 4: Single day (should not shrink)',
    generateSchedule(parseHHMM('10:00'), parseHHMM('18:00'), 1, 'inclusive', 'nearest', 'linear')
);

// Test 5: Different rounding modes
const roundingModes: RoundingMode[] = ['nearest', 'floor', 'ceil'];
roundingModes.forEach((rounding) => {
    logSchedule(
        `\\nTest 5: Rounding mode ${rounding}`,
        generateSchedule(parseHHMM('09:00'), parseHHMM('21:00'), 3, 'inclusive', rounding, 'linear')
    );
});

// Sanity check for helper functions
const start = parseHHMM('08:00');
const end = parseHHMM('22:00');
const windowLength = calculateWindowLength(start, end);
const dailyStep = computeDailyStep(start, end, 10, 'inclusive');

console.log('\\nHelper Checks:');
console.log(`Window length: ${windowLength} minutes`);
console.log(`Daily step (per side): ${dailyStep} minutes`);
console.log('\\nAll tests completed!');
