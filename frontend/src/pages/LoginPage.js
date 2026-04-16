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
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { ArrowLeft, KeyRound, Mail, Lock, Smartphone } from 'lucide-react';
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
  const { track } = useAnalytics();

  if (authLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    sounds.click();
    try {
      const data = await login(email, password);
      sounds.success();
      toast.success(t.welcomeBack + '!');
      navigate(data.has_profile ? '/dashboard' : '/onboarding');
    } catch (err) {
      sounds.error();
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpRequest = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    sounds.click();
    try {
      const { data } = await api.post('/auth/login-otp-request', { identifier: otpIdentifier });
      toast.success(t.otpSent || 'OTP sent!');
      if (data.debug_otp) toast.info(`Dev OTP: ${data.debug_otp}`, { duration: 30000 });
      setOtpSent(true);
    } catch (err) {
      sounds.error();
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    sounds.click();
    try {
      const { data } = await api.post('/auth/login-otp-verify', { identifier: otpIdentifier, otp });
      sounds.success();
      toast.success(t.welcomeBack + '!');
      navigate(data.has_profile ? '/dashboard' : '/onboarding');
      window.location.reload();
    } catch (err) {
      sounds.error();
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    sounds.click();
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-mesh-auth flex items-center justify-center p-4 pb-20 md:pb-4" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[#4B5563] hover:text-[#0A0A0A] transition-colors" data-testid="back-to-home-link">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">{t.backToHome}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle compact />
            <ThemeToggle />
          </div>
        </div>

        <Card className="rounded-2xl border border-black/5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] bg-white/90 dark:bg-[hsl(240,6%,9%)]/90 backdrop-blur-md">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <img src="https://static.prod-images.emergentagent.com/jobs/46236293-45eb-486f-8de9-3cfd3f7e2526/images/251ac3f41bd806cd53ef74f0a949d1a3be51ac19219729fbf89fb0dba4f12b85.png" alt="Rinkosh" className="w-8 h-8 object-contain" />
              <span className="font-heading font-bold text-xl text-[#0A0A0A] tracking-tight">Rinkosh</span>
            </div>
            <CardTitle className="font-heading text-2xl tracking-tight">{t.welcomeBack}</CardTitle>
            <CardDescription className="font-body">{t.signInToAccount}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && <div className="bg-red-50 dark:bg-red-500/10 text-red-600 text-sm p-3 rounded-xl font-body" data-testid="login-error">{error}</div>}

            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-[#F3F4F6] dark:bg-[hsl(240,5%,13%)] p-1 mb-4" data-testid="login-method-tabs">
                <TabsTrigger value="password" className="rounded-lg font-body text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(240,5%,18%)] data-[state=active]:shadow-sm" data-testid="tab-password">
                  <Lock className="w-3.5 h-3.5 mr-1.5" /> {t.password}
                </TabsTrigger>
                <TabsTrigger value="otp" className="rounded-lg font-body text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(240,5%,18%)] data-[state=active]:shadow-sm" data-testid="tab-otp">
                  <Smartphone className="w-3.5 h-3.5 mr-1.5" /> OTP
                </TabsTrigger>
              </TabsList>

              {/* Password Login */}
              <TabsContent value="password">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="font-body font-semibold text-sm">{t.email}</Label>
                    <div className="relative input-glow rounded-xl">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com" required
                        className="pl-10 h-12 rounded-xl bg-[#F9F9FB] dark:bg-[hsl(240,5%,10%)] border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669] font-body text-base"
                        data-testid="login-email-input" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="font-body font-semibold text-sm">{t.password}</Label>
                    <div className="relative input-glow rounded-xl">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                      <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={t.minSixChars} required
                        className="pl-10 h-12 rounded-xl bg-[#F9F9FB] dark:bg-[hsl(240,5%,10%)] border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669] font-body text-base"
                        data-testid="login-password-input" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}
                    className="w-full bg-[#111827] text-white hover:bg-[#000000] rounded-full font-body font-semibold h-12 btn-dark-glow text-base"
                    data-testid="login-submit-button">
                    {loading ? t.signingIn : t.signIn}
                  </Button>
                  <div className="text-center">
                    <Link to="/forgot-password" className="text-sm text-[#059669] hover:underline font-body" data-testid="forgot-password-link">
                      {t.forgotPassword}
                    </Link>
                  </div>
                </form>
              </TabsContent>

              {/* OTP Login */}
              <TabsContent value="otp">
                {!otpSent ? (
                  <form onSubmit={handleOtpRequest} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="otp-email" className="font-body font-semibold text-sm">{t.email}</Label>
                      <div className="relative input-glow rounded-xl">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                        <Input id="otp-email" type="email" value={otpIdentifier}
                          onChange={(e) => setOtpIdentifier(e.target.value)}
                          placeholder="you@example.com" required lang="hi"
                          className="pl-10 h-12 rounded-xl bg-[#F9F9FB] dark:bg-[hsl(240,5%,10%)] border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669] font-body text-base"
                          data-testid="otp-identifier-input" />
                      </div>
                    </div>
                    <Button type="submit" disabled={loading}
                      className="w-full bg-[#059669] hover:bg-[#047857] text-white rounded-full font-body font-semibold h-12 btn-glow text-base"
                      data-testid="otp-request-button">
                      {loading ? t.sending : (t.sendOtp || 'Send OTP')}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleOtpVerify} className="space-y-4">
                    <p className="font-body text-sm text-[#4B5563] text-center mb-2">{t.otpSentTo || 'OTP sent to'} {otpIdentifier}</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="otp-code" className="font-body font-semibold text-sm">OTP</Label>
                      <Input id="otp-code" type="text" value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000" required maxLength={6}
                        className="h-14 rounded-xl bg-[#F9F9FB] dark:bg-[hsl(240,5%,10%)] border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669] text-center text-2xl tracking-[0.4em] font-heading"
                        data-testid="otp-code-input" />
                    </div>
                    <Button type="submit" disabled={loading || otp.length !== 6}
                      className="w-full bg-[#059669] hover:bg-[#047857] text-white rounded-full font-body font-semibold h-12 btn-glow text-base"
                      data-testid="otp-verify-button">
                      {loading ? t.signingIn : (t.verifyLogin || 'Verify & Login')}
                    </Button>
                    <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }}
                      className="w-full text-sm text-[#059669] hover:underline font-body" data-testid="otp-change-email">
                      {t.changeEmail || 'Change email'}
                    </button>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full divider-gradient" /></div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-[hsl(240,6%,9%)] px-4 text-[#9CA3AF] font-body">{t.orContinueWith}</span>
              </div>
            </div>

            <Button type="button" variant="outline" onClick={handleGoogleLogin}
              className="w-full rounded-full font-body font-semibold border-[#E5E7EB] hover:border-[#111827] h-12 haptic-light"
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

          <CardFooter className="justify-center pb-6">
            <p className="text-sm text-[#4B5563] font-body">
              {t.dontHaveAccount}{' '}
              <Link to="/register" className="text-[#059669] hover:underline font-semibold" data-testid="register-link">{t.register}</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
