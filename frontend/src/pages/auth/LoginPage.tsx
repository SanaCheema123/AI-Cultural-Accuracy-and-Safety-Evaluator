import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Form';
import { authService } from '@/services/authService';
import { ApiError } from '@/api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(email, password);
      navigate((location.state as { from?: string } | null)?.from || '/app');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-up">
      <p className="text-sm font-bold text-blue-600">Welcome back</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Sign in to CulturalGuard AI</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Continue to your live evaluation workspace.</p>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/auth/forgot-password" className="mb-1.5 text-xs font-semibold text-blue-600">Forgot password?</Link>
          </div>
          <div className="relative">
            <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="pe-11" />
            <button type="button" onClick={() => setShow((value) => !value)} className="absolute end-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" loading={loading} className="h-11 w-full" icon={<LogIn className="h-4 w-4" />}>Sign In</Button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">New to CulturalGuard? <Link to="/auth/register" className="font-bold text-blue-600">Create account</Link></p>
    </div>
  );
}
