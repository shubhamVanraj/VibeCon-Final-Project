import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { formatApiErrorDetail } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Shield, ArrowLeft, Mail, KeyRound, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      toast.success('Reset code sent to your email');
      if (data.debug_otp) {
        toast.info(`Dev mode - OTP: ${data.debug_otp}`, { duration: 30000 });
      }
      setStep(2);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, new_password: newPassword });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-auth flex items-center justify-center p-4" data-testid="forgot-password-page">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-[#4B5563] hover:text-[#0A0A0A] mb-8 transition-colors" data-testid="back-to-login-link">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-body text-sm">Back to login</span>
        </Link>

        <Card className="rounded-2xl border border-black/5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <CardHeader className="text-center pb-2">
            <a href="/" className="flex items-center justify-center gap-2 mb-2 cursor-pointer" data-testid="logo-home-link">
              <img src="https://static.prod-images.emergentagent.com/jobs/46236293-45eb-486f-8de9-3cfd3f7e2526/images/251ac3f41bd806cd53ef74f0a949d1a3be51ac19219729fbf89fb0dba4f12b85.png" alt="Rinkosh" className="w-7 h-7 object-contain" />
              <span className="font-heading font-bold text-xl text-[#0A0A0A] tracking-tight">Rinkosh</span>
            </a>
            <CardTitle className="font-heading text-2xl tracking-tight">
              {step === 1 ? 'Forgot Password' : step === 2 ? 'Enter Reset Code' : 'New Password'}
            </CardTitle>
            <CardDescription className="font-body">
              {step === 1 ? 'Enter your email to receive a reset code' : step === 2 ? 'Check your email for the 6-digit code' : 'Choose a strong new password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step >= s ? 'bg-[#059669] scale-110' : 'bg-[#E5E7EB]'}`} />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl font-body mb-4" data-testid="forgot-error">{error}</div>}

                {step === 1 && (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-[#059669]/10 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-6 h-6 text-[#059669]" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-body">Email Address</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com" required
                        className="rounded-xl bg-[#F9F9FB] border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669]"
                        data-testid="forgot-email-input" />
                    </div>
                    <Button type="submit" disabled={loading}
                      className="w-full bg-[#111827] text-white hover:bg-[#000000] rounded-full py-3 font-body font-semibold h-12"
                      data-testid="forgot-submit-button">
                      {loading ? 'Sending...' : 'Send Reset Code'}
                    </Button>
                  </form>
                )}

                {step === 2 && (
                  <form onSubmit={(e) => { e.preventDefault(); if (otp.length === 6) setStep(3); }} className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-[#059669]/10 flex items-center justify-center mx-auto mb-4">
                      <KeyRound className="w-6 h-6 text-[#059669]" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="font-body">6-Digit Code</Label>
                      <Input id="otp" type="text" value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000" required maxLength={6}
                        className="rounded-xl bg-[#F9F9FB] border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669] text-center text-2xl tracking-[0.5em] font-heading"
                        data-testid="forgot-otp-input" />
                    </div>
                    <Button type="submit" disabled={otp.length !== 6}
                      className="w-full bg-[#111827] text-white hover:bg-[#000000] rounded-full py-3 font-body font-semibold h-12"
                      data-testid="forgot-verify-button">
                      Verify Code
                    </Button>
                    <button type="button" onClick={handleRequestOtp} className="w-full text-sm text-[#059669] hover:underline font-body" data-testid="resend-code-btn">
                      Didn't receive? Send again
                    </button>
                  </form>
                )}

                {step === 3 && (
                  <form onSubmit={handleVerifyAndReset} className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-[#059669]/10 flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-6 h-6 text-[#059669]" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="font-body">New Password</Label>
                      <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters" required
                        className="rounded-xl bg-[#F9F9FB] border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669]"
                        data-testid="new-password-input" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="font-body">Confirm Password</Label>
                      <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password" required
                        className="rounded-xl bg-[#F9F9FB] border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669]"
                        data-testid="confirm-password-input" />
                    </div>
                    <Button type="submit" disabled={loading}
                      className="w-full bg-[#059669] text-white hover:bg-[#047857] rounded-full py-3 font-body font-semibold h-12"
                      data-testid="reset-password-button">
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
