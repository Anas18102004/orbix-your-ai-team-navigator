/**
 * Migration: Ensure auditLogs collection supports meeting actions
 * 
 * Ensures auditLogs collection exists with proper indexes for meeting-related actions.
 * Meeting actions: meeting_created, meeting_joined, meeting_left, meeting_started, 
 * meeting_ended, recording_started, recording_stopped, recording_deleted, 
 * transcript_created, summary_generated, tasks_created_by_ai
 */
const { MongoClient } = require('mongodb');

async function up(db) {
  const auditLogsCollection = db.collection('auditlogs');
  
  // Create indexes for meeting-related queries
  await auditLogsCollection.createIndex({ resourceType: 1, resourceId: 1 });
  await auditLogsCollection.createIndex({ action: 1, createdAt: -1 });
  
  // Compound index for meeting audit queries
  await auditLogsCollection.createIndex(
    { resourceType: 1, action: 1, createdAt: -1 },
    { partialFilterExpression: { resourceType: 'meeting' } }
  );
  
  console.log('✅ Extended auditLogs indexes for meeting actions');
}

async function down(db) {
  // Keep general indexes, just remove meeting-specific compound index
  const auditLogsCollection = db.collection('auditlogs');
  try {
    await auditLogsCollection.dropIndex('resourceType_1_action_1_createdAt_-1');
    console.log('✅ Removed meeting-specific compound index from auditLogs');
  } catch (error) {
    console.log('⚠️  Index may not exist, skipping');
  }
}

module.exports = { up, down };
