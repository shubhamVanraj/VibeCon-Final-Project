import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatApiErrorDetail } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  if (authLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      toast.success('Welcome back!');
      navigate(data.has_profile ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-[#4B5563] hover:text-[#0A0A0A] mb-8 transition-colors" data-testid="back-to-home-link">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-body text-sm">Back to home</span>
        </Link>

        <Card className="rounded-2xl border border-black/5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-6 h-6 text-[#059669]" strokeWidth={1.5} />
              <span className="font-heading font-bold text-xl text-[#0A0A0A]">Rinkosh</span>
            </div>
            <CardTitle className="font-heading text-2xl tracking-tight">Welcome back</CardTitle>
            <CardDescription className="font-body">Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl font-body" data-testid="login-error">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-body">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="rounded-xl bg-[#F9F9FB] border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669]"
                  data-testid="login-email-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-body">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password" required
                  className="rounded-xl bg-[#F9F9FB] border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669]"
                  data-testid="login-password-input" />
              </div>
              <Button type="submit" disabled={loading}
                className="w-full bg-[#111827] text-white hover:bg-[#000000] rounded-full py-3 font-body font-semibold h-12"
                data-testid="login-submit-button">
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="text-center">
                <Link to="/forgot-password" className="text-sm text-[#059669] hover:underline font-body" data-testid="forgot-password-link">
                  Forgot password?
                </Link>
              </div>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E5E7EB]" /></div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-4 text-[#9CA3AF] font-body">or continue with</span>
              </div>
            </div>

            <Button type="button" variant="outline" onClick={handleGoogleLogin}
              className="w-full rounded-full py-3 font-body font-semibold border-[#E5E7EB] hover:border-[#111827] h-12"
              data-testid="google-login-button">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </Button>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-[#4B5563] font-body">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#059669] hover:underline font-semibold" data-testid="register-link">Sign up</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
