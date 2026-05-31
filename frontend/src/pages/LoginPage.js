import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { ThemeToggle } from '../components/ThemeToggle';
import api, { formatApiErrorDetail } from '../lib/api';
import { usePageView, useAnalytics } from '../lib/analytics';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { ArrowLeft, KeyRound, Mail, Lock, Smartphone, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { sounds } from '../lib/sounds';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, loading: authLoading, login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  usePageView('login');
  // eslint-disable-next-line no-unused-vars
  const { track } = useAnalytics();

  if (authLoading) return null;
  if (user) return <Navigate to="/" replace />;

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true); sounds.click();
    try {
      await login(email, password);
      sounds.success(); toast.success(t.welcomeBack + '!'); navigate('/');
    } catch (err) {
      sounds.error(); setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const handleOtpRequest = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true); sounds.click();
    try {
      const { data } = await api.post('/auth/login-otp-request', { identifier: otpIdentifier });
      toast.success(t.otpSent || 'OTP sent!');
      if (data.debug_otp) toast.info(`Dev OTP: ${data.debug_otp}`, { duration: 30000 });
      setOtpSent(true);
    } catch (err) {
      sounds.error(); setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true); sounds.click();
    try {
      await api.post('/auth/login-otp-verify', { identifier: otpIdentifier, otp });
      sounds.success(); toast.success(t.welcomeBack + '!'); navigate('/'); window.location.reload();
    } catch (err) {
      sounds.error(); setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = () => {
    sounds.click();
    const redirectUrl = window.location.origin + '/';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] dark:bg-[#050810] flex items-center justify-center p-4 pb-20 md:pb-4 relative overflow-hidden" data-testid="login-page">
      {/* Ambient amber glow — Dalal Street signature */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[560px] h-[560px] rounded-full opacity-50 dark:opacity-30"
             style={{ background: 'radial-gradient(circle, rgba(255,179,71,0.20) 0%, rgba(255,179,71,0.04) 40%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full opacity-40 dark:opacity-25"
             style={{ background: 'radial-gradient(circle, rgba(13,27,42,0.06) 0%, transparent 60%)' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-between mb-7">
          <Link to="/" className="snap-press inline-flex items-center gap-2 text-[#334155] dark:text-[#CBD5E1] hover:text-[#0A1118] dark:hover:text-[#FFFBF5]" data-testid="back-to-home-link">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">{t.backToHome}</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle compact />
          </div>
        </div>

        <div className="bismuth-tile p-8 snap-in">
          <div className="relative z-10">
            <div className="text-center mb-7">
              <a href="/" className="snap-press inline-flex items-center gap-2.5 mb-4" data-testid="logo-home-link">
                <img src="https://static.prod-images.emergentagent.com/jobs/46236293-45eb-486f-8de9-3cfd3f7e2526/images/251ac3f41bd806cd53ef74f0a949d1a3be51ac19219729fbf89fb0dba4f12b85.png" alt="Rinkosh" className="w-9 h-9 object-contain" />
                <span className="font-heading font-bold text-2xl text-[#0A1118] dark:text-[#FFFBF5] tracking-tight">Rinkosh</span>
              </a>
              <div className="cap text-[#C8860A] mb-1">{t.welcomeBack}</div>
              <h1 className="font-heading font-bold text-2xl text-[#0A1118] dark:text-[#FFFBF5] tracking-tight">Sign in to continue</h1>
              <p className="font-body text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">{t.signInToAccount}</p>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl font-body mb-4" data-testid="login-error">{error}</div>}

            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-[#F3F4F6] dark:bg-[#141C2A] p-1 mb-5" data-testid="login-method-tabs">
                <TabsTrigger value="password" className="rounded-lg font-body text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-[#1B2D45] data-[state=active]:shadow-sm" data-testid="tab-password">
                  <Lock className="w-3.5 h-3.5 mr-1.5" /> {t.password}
                </TabsTrigger>
                <TabsTrigger value="otp" className="rounded-lg font-body text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-[#1B2D45] data-[state=active]:shadow-sm" data-testid="tab-otp">
                  <Smartphone className="w-3.5 h-3.5 mr-1.5" /> OTP
                </TabsTrigger>
              </TabsList>

              <TabsContent value="password">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="font-body font-semibold text-sm text-[#0A1118] dark:text-[#FFFBF5]">{t.email}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C8860A]" />
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com" required
                        className="pl-10 h-12 rounded-xl bg-[#FFFBF5] dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#C8860A] focus:ring-[#C8860A] font-body text-base text-[#0A1118] dark:text-[#FFFBF5]"
                        data-testid="login-email-input" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="font-body font-semibold text-sm text-[#0A1118] dark:text-[#FFFBF5]">{t.password}</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C8860A]" />
                      <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={t.minSixChars} required
                        className="pl-10 h-12 rounded-xl bg-[#FFFBF5] dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#C8860A] focus:ring-[#C8860A] font-body text-base text-[#0A1118] dark:text-[#FFFBF5]"
                        data-testid="login-password-input" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}
                    className="snap-press w-full bg-[#0A1118] dark:bg-[#FFB347] dark:text-[#0A1118] dark:hover:bg-[#FFC36B] text-white hover:bg-[#1B2D45] rounded-xl font-body font-bold h-12 text-base shadow-md"
                    data-testid="login-submit-button">
                    {loading ? t.signingIn : t.signIn}
                  </Button>
                  <div className="text-center">
                    <Link to="/forgot-password" className="text-sm text-[#C8860A] dark:text-[#FFB347] hover:underline font-body font-semibold" data-testid="forgot-password-link">
                      {t.forgotPassword}
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="otp">
                {!otpSent ? (
                  <form onSubmit={handleOtpRequest} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="otp-email" className="font-body font-semibold text-sm text-[#0A1118] dark:text-[#FFFBF5]">{t.email}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C8860A]" />
                        <Input id="otp-email" type="email" value={otpIdentifier}
                          onChange={(e) => setOtpIdentifier(e.target.value)}
                          placeholder="you@example.com" required
                          className="pl-10 h-12 rounded-xl bg-[#FFFBF5] dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#C8860A] focus:ring-[#C8860A] font-body text-base text-[#0A1118] dark:text-[#FFFBF5]"
                          data-testid="otp-identifier-input" />
                      </div>
                    </div>
                    <Button type="submit" disabled={loading}
                      className="snap-press w-full bg-[#0A1118] dark:bg-[#FFB347] dark:text-[#0A1118] dark:hover:bg-[#FFC36B] text-white hover:bg-[#1B2D45] rounded-xl font-body font-bold h-12 text-base shadow-md"
                      data-testid="otp-request-button">
                      <Sparkles className="w-4 h-4 mr-2" />
                      {loading ? t.sending : (t.sendOtp || 'Send OTP')}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleOtpVerify} className="space-y-4">
                    <p className="font-body text-sm text-[#334155] dark:text-[#CBD5E1] text-center mb-2">{t.otpSentTo || 'OTP sent to'} <strong className="text-[#C8860A]">{otpIdentifier}</strong></p>
                    <div className="space-y-1.5">
                      <Label htmlFor="otp-code" className="font-body font-semibold text-sm text-[#0A1118] dark:text-[#FFFBF5]">OTP</Label>
                      <Input id="otp-code" type="text" value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000" required maxLength={6}
                        className="h-16 rounded-xl bg-[#FFFBF5] dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#C8860A] focus:ring-[#C8860A] text-center text-3xl tracking-[0.5em] font-heading font-bold text-[#0A1118] dark:text-[#FFFBF5]"
                        data-testid="otp-code-input" />
                    </div>
                    <Button type="submit" disabled={loading || otp.length !== 6}
                      className="snap-press w-full bg-[#0A1118] dark:bg-[#FFB347] dark:text-[#0A1118] dark:hover:bg-[#FFC36B] text-white hover:bg-[#1B2D45] rounded-xl font-body font-bold h-12 text-base shadow-md"
                      data-testid="otp-verify-button">
                      {loading ? t.signingIn : (t.verifyLogin || 'Verify & Login')}
                    </Button>
                    <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }}
                      className="snap-press w-full text-sm text-[#C8860A] dark:text-[#FFB347] hover:underline font-body font-semibold" data-testid="otp-change-email">
                      {t.changeEmail || 'Change email'}
                    </button>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E5E7EB] dark:border-[#1F2A3D]" /></div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-[#141C2A] px-4 cap">{t.orContinueWith}</span>
              </div>
            </div>

            <Button type="button" variant="outline" onClick={handleGoogleLogin}
              className="snap-press w-full rounded-xl font-body font-semibold border-2 border-[#E5E7EB] dark:border-[#1F2A3D] hover:border-[#C8860A] dark:hover:border-[#FFB347] bg-white dark:bg-[#0B121C] text-[#0A1118] dark:text-[#FFFBF5] h-12"
              data-testid="google-login-button">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] font-body text-center mt-5">
              {t.dontHaveAccount}{' '}
              <Link to="/register" className="text-[#C8860A] dark:text-[#FFB347] hover:underline font-semibold" data-testid="register-link">{t.register}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
