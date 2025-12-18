import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/test',
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

// Set test environment variables - Using MongoDB Atlas
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-jest';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.MONGODB_URI = 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';
