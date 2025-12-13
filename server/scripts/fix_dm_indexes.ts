
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/orbix';

async function fixIndexes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const collection = mongoose.connection.collection('directmessages');

        // List indexes
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes);

        // Drop the problematic index if it exists
        const badIndex = indexes.find(idx => idx.name === 'participants_1' && idx.unique);
        if (badIndex) {
            console.log('Found problematic index: participants_1. Dropping...');
            await collection.dropIndex('participants_1');
            console.log('Dropped participants_1 index.');
        } else {
            console.log('participants_1 unique index not found or already fixed.');
        }

        console.log('Index fix complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing indexes:', error);
        process.exit(1);
    }
}

fixIndexes();
