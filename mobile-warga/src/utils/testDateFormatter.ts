import { formatDateTimeFlexible, formatDate, formatDateTime, formatRelativeTime } from './dateFormatter';

// Test cases
const testDates = [
  '2026-03-16 23:38:00',
  '2026-03-16T23:38:00',
  new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
  new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
  new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
];

console.log('Testing Date Formatting Functions');
console.log('=================================\n');

testDates.forEach((dateStr, index) => {
  console.log(`Test ${index + 1}: ${dateStr}`);
  console.log(`  Format Date Only: ${formatDate(dateStr)}`);
  console.log(`  Format DateTime: ${formatDateTime(dateStr)}`);
  console.log(`  Format Relative: ${formatRelativeTime(dateStr)}`);
  console.log(`  Flexible (relative): ${formatDateTimeFlexible(dateStr, { showRelative: true })}`);
  console.log(`  Flexible (datetime): ${formatDateTimeFlexible(dateStr)}`);
  console.log(`  Flexible (date only): ${formatDateTimeFlexible(dateStr, { showTime: false })}`);
  console.log('');
});
