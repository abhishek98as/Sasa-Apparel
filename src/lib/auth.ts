import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getDb, COLLECTIONS } from './mongodb';
import { User, UserRole } from './types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      vendorId?: string;
      tailorId?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    vendorId?: string;
    tailorId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    vendorId?: string;
    tailorId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const db = await getDb();
        const user = await db.collection<User>(COLLECTIONS.USERS).findOne({
          email: credentials.email.toLowerCase(),
        });

        if (!user) {
          throw new Error('Invalid email or password');
        }

        if (!user.isActive) {
          throw new Error('Account is deactivated. Please contact admin.');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        // Update last login
        await db.collection(COLLECTIONS.USERS).updateOne(
          { _id: user._id },
          { $set: { lastLogin: new Date() } }
        );

        return {
          id: user._id!.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          vendorId: user.vendorId?.toString(),
          tailorId: user.tailorId?.toString(),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.vendorId = user.vendorId;
        token.tailorId = user.tailorId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.vendorId = token.vendorId;
        session.user.tailorId = token.tailorId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Helper to verify passwords
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

