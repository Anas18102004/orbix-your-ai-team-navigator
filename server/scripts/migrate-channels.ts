import mongoose from 'mongoose';
import { Channel } from '../models/Channel';
import { Workspace } from '../models/Workspace';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration script to:
 * 1. Ensure all channels have workspaceId (or report orphans)
 * 2. Backfill channel.aiMode = 'off' default
 * 3. Update channel type from 'group'|'dm' to 'channel'|'private_channel'
 * 4. Generate slugs for existing channels
 * 5. Update memberCount from memberIds length
 */
async function migrateChannels() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/orbix';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all channels
    const channels = await Channel.find({});
    console.log(`📊 Found ${channels.length} channels to migrate`);

    const orphans: any[] = [];
    let updated = 0;
    let errors = 0;

    for (const channel of channels) {
      try {
        let needsUpdate = false;
        const updates: any = {};

        // 1. Check workspaceId
        if (!channel.workspaceId) {
          // Try to find a default workspace
          const defaultWorkspace = await Workspace.findOne({}).sort({ createdAt: 1 });
          if (defaultWorkspace) {
            updates.workspaceId = defaultWorkspace._id;
            needsUpdate = true;
            console.log(`⚠️  Channel ${channel._id} missing workspaceId, assigning to default workspace`);
          } else {
            orphans.push({
              _id: channel._id,
              name: channel.name,
              reason: 'No workspaceId and no default workspace found',
            });
            continue;
          }
        } else {
          // Verify workspace exists
          const workspace = await Workspace.findById(channel.workspaceId);
          if (!workspace) {
            orphans.push({
              _id: channel._id,
              name: channel.name,
              workspaceId: channel.workspaceId,
              reason: 'Referenced workspace does not exist',
            });
            continue;
          }
        }

        // 2. Backfill aiMode
        if (!channel.aiMode) {
          updates.aiMode = 'off';
          needsUpdate = true;
        }

        // 3. Update type enum
        if (channel.type === 'group') {
          updates.type = 'channel';
          needsUpdate = true;
        } else if (channel.type === 'dm') {
          // DMs should be migrated to DirectMessage collection separately
          // For now, mark as private_channel if it has < 3 members, otherwise channel
          if (channel.memberIds && channel.memberIds.length < 3) {
            updates.type = 'private_channel';
          } else {
            updates.type = 'channel';
          }
          needsUpdate = true;
        }

        // 4. Generate slug if missing
        if (!channel.slug && channel.name) {
          updates.slug = channel.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          needsUpdate = true;
        }

        // 5. Update memberCount
        if (channel.memberIds) {
          const count = channel.memberIds.length;
          if (channel.memberCount !== count) {
            updates.memberCount = count;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await Channel.updateOne({ _id: channel._id }, { $set: updates });
          updated++;
          console.log(`✅ Updated channel ${channel.name} (${channel._id})`);
        }
      } catch (error: any) {
        errors++;
        console.error(`❌ Error updating channel ${channel._id}:`, error.message);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️  Orphans: ${orphans.length}`);
    console.log(`   ❌ Errors: ${errors}`);

    if (orphans.length > 0) {
      console.log('\n⚠️  Orphaned channels (require manual fix):');
      orphans.forEach((orphan) => {
        console.log(`   - ${orphan.name} (${orphan._id}): ${orphan.reason}`);
      });
      console.log('\n💡 Please fix these manually or assign to a workspace.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrateChannels();
}

export { migrateChannels };
