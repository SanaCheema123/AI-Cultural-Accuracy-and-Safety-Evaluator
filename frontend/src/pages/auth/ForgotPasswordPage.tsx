import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Form';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<{ message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      setResult(await api.post<{ message: string }>('/auth/forgot-password', { email }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Reset your password</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Enter your account email. Reset instructions are sent only when a delivery provider is configured.</p>
      {result ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <p>{result.message}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <Button type="submit" loading={loading} className="w-full">Send reset instructions</Button>
        </form>
      )}
      <Link to="/auth/login" className="mt-6 inline-block text-sm font-bold text-blue-600">Back to sign in</Link>
    </div>
  );
}
