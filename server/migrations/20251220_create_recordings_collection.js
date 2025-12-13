/**
 * Migration: Create recordings collection
 * 
 * Creates the recordings collection for storing meeting recording metadata.
 * Assumes: meetingId references meetings collection
 */
const { MongoClient } = require('mongodb');

async function up(db) {
  const recordingsCollection = db.collection('recordings');
  
  // Create indexes
  await recordingsCollection.createIndex({ meetingId: 1 });
  await recordingsCollection.createIndex({ createdByUserId: 1 });
  await recordingsCollection.createIndex({ createdAt: -1 });
  await recordingsCollection.createIndex({ s3Url: 1 }, { unique: true, sparse: true });
  
  console.log('✅ Created recordings collection with indexes');
}

async function down(db) {
  await db.collection('recordings').drop();
  console.log('✅ Dropped recordings collection');
}

module.exports = { up, down };
