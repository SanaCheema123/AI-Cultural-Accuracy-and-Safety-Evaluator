import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Form';
import { authService } from '@/services/authService';
import { ApiError } from '@/api/client';

export default function RegisterPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (form.password.length < 10) {
      setError('Use at least 10 characters for your password.');
      return;
    }
    setLoading(true);
    try {
      await authService.register(form);
      nav('/app');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-up">
      <p className="text-sm font-bold text-blue-600">Create account</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Start evaluating responsibly</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Create your account. A private workspace is created automatically.
      </p>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="mt-7 grid gap-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required />
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            At least 10 characters. Passwords are PBKDF2-HMAC hashed on the server.
          </p>
        </div>
        <Button type="submit" loading={loading} className="h-11 w-full">
          Create Account <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Already registered?{' '}
        <Link to="/auth/login" className="font-bold text-blue-600">
          Sign in
        </Link>
      </p>
    </div>
  );
}
