import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
}

async function testLogin(email: string, passwordPlain: string) {
    console.log(`Testing login for: ${email}`);
    const client = new MongoClient(MONGODB_URI!);

    try {
        await client.connect();
        const db = client.db();

        console.log('Connected to DB');

        const user = await db.collection('users').findOne({ email: email });

        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }

        console.log(`✅ User found: ${user.name} (${user.role})`);
        console.log(`Stored Hash: ${user.password}`);

        const isMatch = await bcrypt.compare(passwordPlain, user.password);

        if (isMatch) {
            console.log('✅ Password Match: SUCCESS');
        } else {
            console.error('❌ Password Match: FAILED');
        }

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await client.close();
    }
}

// Run test for admin
testLogin('admin@sasa.com', 'admin123');
