import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Redirect based on role
  switch (session.user.role) {
    case 'admin':
      redirect('/admin/dashboard');
    case 'vendor':
      redirect('/vendor/dashboard');
    case 'tailor':
      redirect('/tailor/dashboard');
    default:
      redirect('/login');
  }
}

