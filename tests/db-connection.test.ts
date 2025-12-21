import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local if not already loaded
if (!process.env.MONGODB_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

const MONGODB_URI = process.env.MONGODB_URI;

describe('Database Connection', () => {
    let client: MongoClient;

    beforeAll(async () => {
        if (!MONGODB_URI) {
            // Skip tests if no URI, or fail gracefully
            throw new Error('MONGODB_URI is not defined');
        }
        client = new MongoClient(MONGODB_URI);
        await client.connect();
    });

    afterAll(async () => {
        if (client) {
            await client.close();
        }
    });

    it('should connect to MongoDB Atlas successfully', async () => {
        const db = client.db();
        const commandResult = await db.command({ ping: 1 });
        expect(commandResult).toBeDefined();
        expect(commandResult.ok).toBe(1);
        console.log('✅ Connected to MongoDB Atlas successfully');
    });
});
