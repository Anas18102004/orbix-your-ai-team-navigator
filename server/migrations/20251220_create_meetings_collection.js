/**
 * Migration: Create meetings collection
 * 
 * Creates the meetings collection with indexes for efficient querying.
 * Assumes: workspaceId references existing workspaces collection
 */
const { MongoClient } = require('mongodb');

async function up(db) {
  // Create meetings collection
  const meetingsCollection = db.collection('meetings');
  
  // Create indexes
  await meetingsCollection.createIndex({ workspaceId: 1, status: 1 });
  await meetingsCollection.createIndex({ organizerId: 1, status: 1 });
  await meetingsCollection.createIndex({ startTime: 1 });
  await meetingsCollection.createIndex({ 'participants.userId': 1 });
  await meetingsCollection.createIndex({ createdAt: -1 });
  
  console.log('✅ Created meetings collection with indexes');
}

async function down(db) {
  await db.collection('meetings').drop();
  console.log('✅ Dropped meetings collection');
}

module.exports = { up, down };
