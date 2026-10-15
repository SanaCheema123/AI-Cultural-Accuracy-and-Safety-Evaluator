import { ArrowLeft, FileQuestion, LockKeyhole, ServerCrash, WifiOff, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

type SystemErrorKind = '404' | '403' | '500' | 'network';

type ErrorConfig = {
  title: string;
  desc: string;
  Icon: LucideIcon;
};

const errorMap: Record<SystemErrorKind, ErrorConfig> = {
  '404': {
    title: 'Page not found',
    desc: 'The page you requested does not exist or has moved.',
    Icon: FileQuestion,
  },
  '403': {
    title: 'Access denied',
    desc: 'Your workspace role does not have permission to access this resource.',
    Icon: LockKeyhole,
  },
  '500': {
    title: 'Server error',
    desc: 'The application encountered an unexpected error. No stack trace is exposed to users.',
    Icon: ServerCrash,
  },
  network: {
    title: 'Network unavailable',
    desc: 'CulturalGuard cannot reach the API. Check your connection and backend service.',
    Icon: WifiOff,
  },
};

export default function SystemErrorPage({ kind }: { kind: SystemErrorKind }) {
  const navigate = useNavigate();
  const config = errorMap[kind];
  const Icon = config.Icon;

  return (
    <div className="cg-page grid min-h-screen place-items-center p-6">
      <div className="max-w-lg text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-rose-50 text-rose-600 dark:bg-rose-950/30">
          <Icon className="h-7 w-7" />
        </div>
        <p className="mt-5 text-sm font-bold uppercase tracking-widest text-blue-600">
          {kind === 'network' ? 'Network' : kind}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">{config.title}</h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">{config.desc}</p>
        <Button className="mt-6" onClick={() => navigate(-1)} icon={<ArrowLeft className="h-4 w-4 rtl:rotate-180" />}>
          Go back
        </Button>
      </div>
    </div>
  );
}
