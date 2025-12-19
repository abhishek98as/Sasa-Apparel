'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scissors, Package, Users } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');
  const { t, locale, setLocale } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    setEmail(trimmedEmail);
    setPassword(trimmedPassword);

    if (!trimmedEmail || !trimmedPassword) {
      setIsLoading(false);
      setLoginError('Email and password are required');
      return;
    }

    try {
      const result = await signIn('credentials', {
        email: trimmedEmail,
        password: trimmedPassword,
        redirect: false,
      });

      if (result?.error) {
        setLoginError(result.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setLoginError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 sm:p-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-surface-900">{t('welcome.back')}</h2>
        <p className="text-surface-500 mt-2 text-sm sm:text-base">{t('sign.in')}</p>

        <div className="mt-4 inline-flex items-center gap-2 text-xs text-surface-500">
          <span className="uppercase font-semibold">Language:</span>
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`px-2 py-1 rounded ${locale === 'en' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100'}`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLocale('hi')}
            className={`px-2 py-1 rounded ${locale === 'hi' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100'}`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      {loginError && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs sm:text-sm text-red-700">{loginError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <Input
          label={t('email')}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label={t('password')}
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          isLoading={isLoading}
          className="w-full"
        >
          {t('sign.in')}
        </Button>
      </form>

      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-surface-50 rounded-lg">
        <p className="text-xs text-surface-500 text-center">
          Demo credentials for testing:
        </p>
        <div className="mt-2 space-y-1 text-xs text-surface-600">
          <p><strong>Admin:</strong> admin@sasa.com / admin123</p>
          <p><strong>Vendor:</strong> vendor@test.com / vendor123</p>
        </div>
      </div>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 sm:p-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-surface-900">Welcome back</h2>
        <p className="text-surface-500 mt-2 text-sm sm:text-base">Sign in to your account</p>
      </div>
      <div className="animate-pulse space-y-4 sm:space-y-5">
        <div className="h-14 sm:h-16 bg-gray-200 rounded"></div>
        <div className="h-14 sm:h-16 bg-gray-200 rounded"></div>
        <div className="h-10 sm:h-12 bg-primary-200 rounded"></div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Branding (hidden on mobile, shown on lg+) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMC0xMHY2aDZ2LTZoLTZ6bTAtMTB2Nmg2di02aC02em0tMTAgMTB2Nmg2di02aC02em0wIDEwdjZoNnYtNmgtNnptLTEwLTEwdjZoNnYtNmgtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-20">
          <div className="mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Sasa Apparel
            </h1>
            <p className="text-xl text-primary-100">
              Manufacturing Management Portal
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 text-primary-100">
              <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                <Scissors className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Production Tracking</h3>
                <p className="text-sm text-primary-200">Monitor cutting and tailoring progress</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-primary-100">
              <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Shipment Management</h3>
                <p className="text-sm text-primary-200">Track orders and deliveries</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-primary-100">
              <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Multi-role Access</h3>
                <p className="text-sm text-primary-200">Admin, Vendor & Tailor portals</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full"></div>
        <div className="absolute top-20 -right-10 w-40 h-40 bg-white/5 rounded-full"></div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-surface-50 min-h-screen lg:min-h-0">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* Mobile branding header */}
          <div className="text-center mb-6 sm:mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 mb-4">
              <Scissors className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary-700">Sasa Apparel</h1>
            <p className="text-surface-500 text-sm sm:text-base">Manufacturing Portal</p>
          </div>

          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

