/**
 * Migration: Extend aiContextDocs for meeting types
 * 
 * Ensures aiContextDocs collection exists and adds indexes for meeting-related types.
 * Adds support for types: "meeting_transcript", "meeting_summary"
 */
const { MongoClient } = require('mongodb');

async function up(db) {
  const aiContextDocsCollection = db.collection('aicontextdocs');
  
  // Create indexes if collection exists, otherwise it will be created by model
  try {
    await aiContextDocsCollection.createIndex({ workspaceId: 1, type: 1 });
    await aiContextDocsCollection.createIndex({ type: 1, createdAt: -1 });
    await aiContextDocsCollection.createIndex({ sourceId: 1 }); // For meetingId references
    
    // Add compound index for meeting-related queries
    await aiContextDocsCollection.createIndex(
      { type: 1, sourceId: 1, createdAt: -1 },
      { partialFilterExpression: { type: { $in: ['meeting_transcript', 'meeting_summary'] } } }
    );
    
    console.log('✅ Extended aiContextDocs indexes for meeting types');
  } catch (error) {
    // Collection might not exist yet, that's okay - model will create it
    console.log('⚠️  aiContextDocs collection may not exist yet, indexes will be created by model');
  }
}

async function down(db) {
  // Remove meeting-specific indexes (keep general ones)
  const aiContextDocsCollection = db.collection('aicontextdocs');
  try {
    await aiContextDocsCollection.dropIndex('type_1_sourceId_1_createdAt_-1');
    console.log('✅ Removed meeting-specific indexes from aiContextDocs');
  } catch (error) {
    console.log('⚠️  Index may not exist, skipping');
  }
}

module.exports = { up, down };
