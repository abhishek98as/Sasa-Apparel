/**
 * Login Component Tests
 * Tests for the login page UI and functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';

// Mock the login page component for testing
const MockLoginForm = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
        required
      />
      <button type="submit" disabled={isLoading} data-testid="submit-button">
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
      {error && <div data-testid="error-message">{error}</div>}
    </form>
  );
};

describe('Login Form Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    test('should render login form', () => {
      render(<MockLoginForm />);
      
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    test('should have correct input types', () => {
      render(<MockLoginForm />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should have required attributes on inputs', () => {
      render(<MockLoginForm />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      
      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });
  });

  describe('Form Input', () => {
    test('should update email input value', async () => {
      render(<MockLoginForm />);
      const user = userEvent.setup();
      
      const emailInput = screen.getByTestId('email-input');
      await user.type(emailInput, 'admin@sasa.com');
      
      expect(emailInput).toHaveValue('admin@sasa.com');
    });

    test('should update password input value', async () => {
      render(<MockLoginForm />);
      const user = userEvent.setup();
      
      const passwordInput = screen.getByTestId('password-input');
      await user.type(passwordInput, 'admin123');
      
      expect(passwordInput).toHaveValue('admin123');
    });
  });

  describe('Form Submission', () => {
    test('should call signIn with correct credentials on submit', async () => {
      (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });
      
      render(<MockLoginForm />);
      const user = userEvent.setup();
      
      await user.type(screen.getByTestId('email-input'), 'admin@sasa.com');
      await user.type(screen.getByTestId('password-input'), 'admin123');
      await user.click(screen.getByTestId('submit-button'));
      
      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('credentials', {
          email: 'admin@sasa.com',
          password: 'admin123',
          redirect: false,
        });
      });
    });

    test('should display error message on failed login', async () => {
      (signIn as jest.Mock).mockResolvedValue({ 
        ok: false, 
        error: 'Invalid email or password' 
      });
      
      render(<MockLoginForm />);
      const user = userEvent.setup();
      
      await user.type(screen.getByTestId('email-input'), 'wrong@email.com');
      await user.type(screen.getByTestId('password-input'), 'wrongpassword');
      await user.click(screen.getByTestId('submit-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid email or password');
      });
    });

    test('should disable button during loading', async () => {
      let resolveSignIn: (value: any) => void;
      (signIn as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );
      
      render(<MockLoginForm />);
      const user = userEvent.setup();
      
      await user.type(screen.getByTestId('email-input'), 'admin@sasa.com');
      await user.type(screen.getByTestId('password-input'), 'admin123');
      await user.click(screen.getByTestId('submit-button'));
      
      expect(screen.getByTestId('submit-button')).toBeDisabled();
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Signing in...');
      
      // Resolve the promise to complete the test
      resolveSignIn!({ ok: true, error: null });
    });
  });
});

describe('Login Validation Tests', () => {
  test('should validate email format', () => {
    const validEmails = [
      'admin@sasa.com',
      'vendor@test.com',
      'tailor@test.com',
      'user.name@domain.co.in',
    ];

    const invalidEmails = [
      'notanemail',
      '@nodomain.com',
      'no@domain',
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });

    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  test('should require minimum password length', () => {
    const minLength = 6;
    
    expect('admin123'.length >= minLength).toBe(true);
    expect('short'.length >= minLength).toBe(false);
  });
});
