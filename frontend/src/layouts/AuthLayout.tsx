import { Outlet, Link } from 'react-router-dom';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Brand } from '@/components/common/Brand';

export function AuthLayout() {
  const points = [
    'Live provider results only — no preset evaluation scores',
    'Semantic similarity stays separate from cultural assessment',
    'Human review and complete audit trail',
  ];

  return (
    <div className="cg-page grid min-h-screen lg:grid-cols-[.95fr_1.05fr]">
      <div className="relative hidden overflow-hidden bg-[#0B1537] p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-32 top-12 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-violet-500/25 blur-3xl" />
        <Brand className="relative [&_*]:text-white" />
        <div className="relative my-auto max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100">
            <Sparkles className="h-3.5 w-3.5" />Human-centered AI evaluation
          </div>
          <h1 className="text-5xl font-black leading-tight tracking-tight">Build more culturally aware, safer AI.</h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-blue-100/80">Transparent multimodal evaluation with Arabic support, confidence, evidence, and expert review.</p>
          <div className="mt-8 space-y-3 text-sm text-blue-50">
            {points.map((item) => (
              <div className="flex items-center gap-3" key={item}>
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />{item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-blue-200/70">CulturalGuard AI · Respecting Cultures. Empowering AI.</p>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Link to="/"><Brand /></Link></div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
