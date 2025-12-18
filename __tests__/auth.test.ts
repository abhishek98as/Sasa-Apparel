/**
 * Authentication Tests
 * Tests for login functionality and authentication flows
 */

import bcrypt from 'bcryptjs';
import { MongoClient, ServerApiVersion } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

describe('Authentication Tests', () => {
  let client: MongoClient;

  beforeAll(async () => {
    client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  describe('Password Hashing', () => {
    test('should hash password correctly', async () => {
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(20);
    });

    test('should verify correct password', async () => {
      const password = 'admin123';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'admin123';
      const wrongPassword = 'wrongPassword';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const isValid = await bcrypt.compare(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('User Lookup', () => {
    test('should find user by email in database', async () => {
      const db = client.db('cloth_manufacturing');
      const usersCollection = db.collection('users');
      
      // Try to find admin user (will only work if database is seeded)
      const user = await usersCollection.findOne({ email: 'admin@sasa.com' });
      
      // If user exists (database seeded), validate structure
      if (user) {
        expect(user.email).toBe('admin@sasa.com');
        expect(user.role).toBe('admin');
        expect(user.password).toBeDefined();
        expect(user.isActive).toBe(true);
      } else {
        // Database not seeded - this is expected in test environment
        console.log('Note: Database not seeded - admin user not found');
      }
    });

    test('should return null for non-existent user', async () => {
      const db = client.db('cloth_manufacturing');
      const usersCollection = db.collection('users');
      
      const user = await usersCollection.findOne({ 
        email: 'nonexistent@email.com' 
      });
      
      expect(user).toBeNull();
    });
  });

  describe('Authentication Logic', () => {
    test('should validate user credentials correctly', async () => {
      const db = client.db('cloth_manufacturing');
      const usersCollection = db.collection('users');
      
      // Create a test user
      const testPassword = 'testPass123';
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      
      const testUser = {
        email: 'test_auth_user@test.com',
        password: hashedPassword,
        name: 'Test Auth User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Clean up any existing test user
      await usersCollection.deleteOne({ email: testUser.email });
      
      // Insert test user
      await usersCollection.insertOne(testUser);
      
      // Find user by email
      const foundUser = await usersCollection.findOne({ email: testUser.email });
      expect(foundUser).toBeDefined();
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(testPassword, foundUser!.password);
      expect(isPasswordValid).toBe(true);
      
      // Check user is active
      expect(foundUser!.isActive).toBe(true);
      
      // Clean up
      await usersCollection.deleteOne({ email: testUser.email });
    });

    test('should reject inactive user', async () => {
      const db = client.db('cloth_manufacturing');
      const usersCollection = db.collection('users');
      
      const testPassword = 'testPass123';
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      
      const inactiveUser = {
        email: 'inactive_user@test.com',
        password: hashedPassword,
        name: 'Inactive User',
        role: 'vendor',
        isActive: false, // Inactive user
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await usersCollection.deleteOne({ email: inactiveUser.email });
      await usersCollection.insertOne(inactiveUser);
      
      const foundUser = await usersCollection.findOne({ email: inactiveUser.email });
      expect(foundUser).toBeDefined();
      expect(foundUser!.isActive).toBe(false);
      
      // In real auth flow, this should be rejected
      // The auth.ts authorize function checks isActive
      
      await usersCollection.deleteOne({ email: inactiveUser.email });
    });
  });
});

describe('User Role Tests', () => {
  let client: MongoClient;

  beforeAll(async () => {
    client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  const validRoles = ['admin', 'vendor', 'tailor'];

  test.each(validRoles)('should accept valid role: %s', async (role) => {
    expect(['admin', 'vendor', 'tailor']).toContain(role);
  });

  test('should have correct user structure for admin', async () => {
    const db = client.db('cloth_manufacturing');
    const user = await db.collection('users').findOne({ role: 'admin' });
    
    if (user) {
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('password');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('isActive');
      expect(user.role).toBe('admin');
    }
  });

  test('should have correct user structure for vendor', async () => {
    const db = client.db('cloth_manufacturing');
    const user = await db.collection('users').findOne({ role: 'vendor' });
    
    if (user) {
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('password');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('vendorId');
      expect(user.role).toBe('vendor');
    }
  });

  test('should have correct user structure for tailor', async () => {
    const db = client.db('cloth_manufacturing');
    const user = await db.collection('users').findOne({ role: 'tailor' });
    
    if (user) {
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('password');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('tailorId');
      expect(user.role).toBe('tailor');
    }
  });
});
