/**
 * Test script to verify JavaScript implementation matches Python behavior
 */

const DAY_MINUTES = 24 * 60;

// Utility functions (copied from script.js for testing)
function parseHHMM(timeString) {
    const parts = timeString.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
}

function formatHHMM(minutes) {
    const normalized = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
    const hours = Math.floor(normalized / 60);
    const mins = normalized % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function calculateWindowLength(startMin, endMin) {
    return ((endMin - startMin + DAY_MINUTES) % DAY_MINUTES);
}

function computeDailyStep(startMin, endMin, days, finishOnDay) {
    const windowLength = calculateWindowLength(startMin, endMin);

    if (finishOnDay === 'inclusive') {
        return days === 1 ? 0 : windowLength / (2 * (days - 1));
    } else if (finishOnDay === 'after-steps') {
        return windowLength / (2 * days);
    }
    throw new Error('Invalid finishOnDay mode');
}

function generateSchedule(startMin, endMin, days, finishOnDay, rounding) {
    const dailyStep = computeDailyStep(startMin, endMin, days, finishOnDay);

    const roundFunctions = {
        nearest: Math.round,
        floor: Math.floor,
        ceil: Math.ceil
    };

    const roundFunc = roundFunctions[rounding];

    const schedule = [];
    for (let day = 1; day <= days; day++) {
        const offset = (day - 1) * dailyStep;
        const dayStart = roundFunc(startMin + offset);
        const dayEnd = roundFunc(endMin - offset);
        schedule.push({ dayId: day, startMin: dayStart, endMin: dayEnd });
    }

    return schedule;
}

// Test cases
console.log('Testing Time Window Shrinker JavaScript Implementation\n');

// Test 1: Basic functionality
console.log('Test 1: Basic schedule generation (09:00-21:00, 10 days, inclusive)');
const schedule1 = generateSchedule(parseHHMM('09:00'), parseHHMM('21:00'), 10, 'inclusive', 'nearest');
schedule1.forEach(row => {
    console.log(`Day ${row.dayId}: ${formatHHMM(row.startMin)} - ${formatHHMM(row.endMin)}`);
});

// Test 2: Midnight crossing
console.log('\nTest 2: Midnight crossing (22:30-05:15, 7 days, inclusive)');
const schedule2 = generateSchedule(parseHHMM('22:30'), parseHHMM('05:15'), 7, 'inclusive', 'nearest');
schedule2.forEach(row => {
    console.log(`Day ${row.dayId}: ${formatHHMM(row.startMin)} - ${formatHHMM(row.endMin)}`);
});

// Test 3: After-steps mode
console.log('\nTest 3: After-steps mode (09:00-21:00, 5 days, after-steps)');
const schedule3 = generateSchedule(parseHHMM('09:00'), parseHHMM('21:00'), 5, 'after-steps', 'nearest');
schedule3.forEach(row => {
    console.log(`Day ${row.dayId}: ${formatHHMM(row.startMin)} - ${formatHHMM(row.endMin)}`);
});

// Test 4: Single day
console.log('\nTest 4: Single day (should not shrink)');
const schedule4 = generateSchedule(parseHHMM('10:00'), parseHHMM('18:00'), 1, 'inclusive', 'nearest');
schedule4.forEach(row => {
    console.log(`Day ${row.dayId}: ${formatHHMM(row.startMin)} - ${formatHHMM(row.endMin)}`);
});

// Test 5: Different rounding modes
console.log('\nTest 5: Rounding modes comparison (09:00-21:00, 3 days)');
['nearest', 'floor', 'ceil'].forEach(rounding => {
    console.log(`\nRounding: ${rounding}`);
    const schedule = generateSchedule(parseHHMM('09:00'), parseHHMM('21:00'), 3, 'inclusive', rounding);
    schedule.forEach(row => {
        console.log(`Day ${row.dayId}: ${formatHHMM(row.startMin)} - ${formatHHMM(row.endMin)}`);
    });
});

console.log('\nAll tests completed!');
