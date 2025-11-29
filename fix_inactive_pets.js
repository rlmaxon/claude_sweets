// Fix inactive pets in the database
// This script ensures all existing pets have is_active = 1

const { db } = require('./database/db');

console.log('===Fixing inactive pets in database===\n');

// Check current state
const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN is_active = 0 OR is_active IS NULL THEN 1 ELSE 0 END) as inactive
  FROM pets
`).get();

console.log('Before fix:');
console.log(`- Total pets: ${stats.total}`);
console.log(`- Active pets: ${stats.active}`);
console.log(`- Inactive pets: ${stats.inactive}\n`);

if (stats.inactive > 0) {
  // Update all inactive pets to be active
  const result = db.prepare(`
    UPDATE pets
    SET is_active = 1
    WHERE is_active = 0 OR is_active IS NULL
  `).run();

  console.log(`✓ Updated ${result.changes} pets to is_active = 1\n`);
} else {
  console.log('✓ All pets are already active\n');
}

// Verify fix
const afterStats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN is_active = 0 OR is_active IS NULL THEN 1 ELSE 0 END) as inactive
  FROM pets
`).get();

console.log('After fix:');
console.log(`- Total pets: ${afterStats.total}`);
console.log(`- Active pets: ${afterStats.active}`);
console.log(`- Inactive pets: ${afterStats.inactive}\n`);

// Show sample of pets by status
console.log('Pet breakdown by status:');
const statusBreakdown = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM pets
  WHERE is_active = 1
  GROUP BY status
`).all();

statusBreakdown.forEach(row => {
  console.log(`- ${row.status}: ${row.count} pet(s)`);
});

console.log('\n✅ Database fix complete!');
db.close();
