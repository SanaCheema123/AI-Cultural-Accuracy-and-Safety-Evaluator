import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { PublicShell } from '@/layouts/PublicShell';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppShell } from '@/layouts/AppShell';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { LoadingState } from '@/components/common/States';

const Landing = lazy(() => import('@/pages/public/LandingPage'));
const Login = lazy(() => import('@/pages/auth/LoginPage'));
const Register = lazy(() => import('@/pages/auth/RegisterPage'));
const Forgot = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const Reset = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const Overview = lazy(() => import('@/pages/app/OverviewPage'));
const Evaluate = lazy(() => import('@/pages/app/EvaluatePage'));
const History = lazy(() => import('@/pages/app/HistoryPage'));
const Settings = lazy(() => import('@/pages/app/SettingsPage'));
const SystemError = lazy(() => import('@/pages/system/SystemErrorPage'));

function LegacyEvaluationRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/app/evaluate?id=${encodeURIComponent(id)}` : '/app/evaluate'} replace />;
}

export function App() {
  return (
    <Suspense fallback={<div className="p-8"><LoadingState /></div>}>
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/" element={<Landing />} />
        </Route>

        {/* Authentication remains as supporting infrastructure. Product navigation exposes only five core pages. */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<Forgot />} />
          <Route path="reset-password" element={<Reset />} />
        </Route>

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="evaluate" element={<Evaluate />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />

          {/* Old evaluation links remain backwards-compatible, but resolve into the single Evaluate workspace. */}
          <Route path="evaluations/:id" element={<LegacyEvaluationRedirect />} />
          <Route path="evaluations/:id/*" element={<LegacyEvaluationRedirect />} />

          {/* Any retired application page returns to Home instead of exposing a dead route. */}
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>

        <Route path="/403" element={<SystemError kind="403" />} />
        <Route path="/500" element={<SystemError kind="500" />} />
        <Route path="/network-error" element={<SystemError kind="network" />} />
        <Route path="*" element={<SystemError kind="404" />} />
      </Routes>
    </Suspense>
  );
}
