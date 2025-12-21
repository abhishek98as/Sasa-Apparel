import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

// Load environment variables
if (!process.env.MONGODB_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

const MONGODB_URI = process.env.MONGODB_URI;

describe('Authentication Logic', () => {
    let client: MongoClient;
    let db: any;

    beforeAll(async () => {
        if (!MONGODB_URI) throw new Error('MONGODB_URI not defined');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db();
    });

    afterAll(async () => {
        if (client) await client.close();
    });

    it('should have the users collection', async () => {
        const collections = await db.listCollections({ name: 'users' }).toArray();
        expect(collections.length).toBe(1);
    });

    it('should find the admin user', async () => {
        const adminUser = await db.collection('users').findOne({ email: 'admin@sasa.com' });
        expect(adminUser).toBeDefined();
        expect(adminUser.role).toBe('admin');
    });

    it('should verify admin password correctly', async () => {
        const adminUser = await db.collection('users').findOne({ email: 'admin@sasa.com' });
        expect(adminUser).toBeDefined();

        // The seed script sets admin password to 'admin123'
        const isValid = await bcrypt.compare('admin123', adminUser.password);
        expect(isValid).toBe(true);
    });
});
