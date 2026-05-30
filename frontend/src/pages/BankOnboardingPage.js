import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { Building2, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

const LOAN_TYPES = ['personal','home','car','bike','education','gold','business','msme','working_capital','lap','plot','used_vehicle','mutual_funds','refinance'];

export default function BankOnboardingPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bank_name: '', contact_person: '', email: '', password: '', phone: '',
    loan_types_offered: [], branch_locations: '', corporate_tieups: '',
    min_rate: '', max_rate: '', commission_pct: '1.0', description: '',
  });

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleLoanType = (t) => update('loan_types_offered', form.loan_types_offered.includes(t) ? form.loan_types_offered.filter(x => x !== t) : [...form.loan_types_offered, t]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        branch_locations: form.branch_locations.split(',').map(s => s.trim()).filter(Boolean),
        corporate_tieups: form.corporate_tieups.split(',').map(s => s.trim()).filter(Boolean),
        min_rate: parseFloat(form.min_rate) || null,
        max_rate: parseFloat(form.max_rate) || null,
        commission_pct: parseFloat(form.commission_pct) || 1.0,
      };
      await api.post('/bank/register', payload);
      toast.success(language === 'hi' ? 'बैंक सफलतापूर्वक पंजीकृत!' : 'Bank registered successfully!');
      navigate('/bank-dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-light py-20 px-4" data-testid="bank-onboarding-page">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-[#4B5563] hover:text-[#059669] mb-8 font-body text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> {language === 'hi' ? 'होम पर वापस' : 'Back to Home'}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#059669]/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[#059669]" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#0A0A0A] tracking-tight" data-testid="bank-onboarding-title">
              {language === 'hi' ? 'बैंक पार्टनर बनें' : 'Become a Bank Partner'}
            </h1>
            <p className="font-body text-sm text-[#9CA3AF]">{language === 'hi' ? 'रिंकोश पर अपने लोन प्रोडक्ट लिस्ट करें' : 'List your loan products on Rinkosh'}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${step >= s ? 'bg-[#059669]' : 'bg-[#E5E7EB]'}`} />
          ))}
        </div>

        <Card className="rounded-2xl border border-black/5 shadow-lg">
          <CardContent className="p-6 md:p-8">
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-heading text-lg font-bold text-[#0A0A0A]">{language === 'hi' ? 'बुनियादी जानकारी' : 'Basic Information'}</h2>
                <div>
                  <Label className="font-body font-semibold text-[#0A0A0A]">{language === 'hi' ? 'बैंक का नाम' : 'Bank Name'}</Label>
                  <Input value={form.bank_name} onChange={e => update('bank_name', e.target.value)} placeholder="e.g. State Bank of India" className="mt-1.5 rounded-xl" data-testid="bank-name-input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-body font-semibold text-[#0A0A0A]">{language === 'hi' ? 'संपर्क व्यक्ति' : 'Contact Person'}</Label>
                    <Input value={form.contact_person} onChange={e => update('contact_person', e.target.value)} placeholder="Full name" className="mt-1.5 rounded-xl" data-testid="contact-person-input" />
                  </div>
                  <div>
                    <Label className="font-body font-semibold text-[#0A0A0A]">{language === 'hi' ? 'फोन' : 'Phone'}</Label>
                    <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="9876543210" className="mt-1.5 rounded-xl" data-testid="phone-input" />
                  </div>
                </div>
                <div>
                  <Label className="font-body font-semibold text-[#0A0A0A]">Email</Label>
                  <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="partner@bank.com" className="mt-1.5 rounded-xl" data-testid="bank-email-input" />
                </div>
                <div>
                  <Label className="font-body font-semibold text-[#0A0A0A]">{language === 'hi' ? 'पासवर्ड' : 'Password'}</Label>
                  <Input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min 6 characters" className="mt-1.5 rounded-xl" data-testid="bank-password-input" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-heading text-lg font-bold text-[#0A0A0A]">{language === 'hi' ? 'लोन प्रकार और क्षेत्र' : 'Loan Types & Coverage'}</h2>
                <div>
                  <Label className="font-body font-semibold text-[#0A0A0A] mb-3 block">{language === 'hi' ? 'लोन प्रकार चुनें' : 'Select Loan Types Offered'}</Label>
                  <div className="flex flex-wrap gap-2">
                    {LOAN_TYPES.map(t => (
                      <button key={t} onClick={() => toggleLoanType(t)}
                        className={`px-3 py-1.5 rounded-full font-body text-xs font-semibold transition-all ${form.loan_types_offered.includes(t) ? 'bg-[#059669] text-white' : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#059669]/10'}`}
                        data-testid={`loan-type-${t}`}
                      >{t.replace('_', ' ').toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="font-body font-semibold text-[#0A0A0A]">{language === 'hi' ? 'शाखा स्थान (कॉमा से अलग)' : 'Branch Locations (comma-separated)'}</Label>
                  <Input value={form.branch_locations} onChange={e => update('branch_locations', e.target.value)} placeholder="Mumbai, Delhi, Bokaro, Chennai" className="mt-1.5 rounded-xl" data-testid="branches-input" />
                </div>
                <div>
                  <Label className="font-body font-semibold text-[#0A0A0A]">{language === 'hi' ? 'कॉर्पोरेट टाईअप (कॉमा से अलग)' : 'Corporate Tie-ups (comma-separated)'}</Label>
                  <Input value={form.corporate_tieups} onChange={e => update('corporate_tieups', e.target.value)} placeholder="PSU, SAIL, TCS, Govt" className="mt-1.5 rounded-xl" data-testid="tieups-input" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h2 className="font-heading text-lg font-bold text-[#0A0A0A]">{language === 'hi' ? 'दर और कमीशन' : 'Rates & Commission'}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-body font-semibold text-[#0A0A0A]">{language === 'hi' ? 'न्यूनतम ब्याज दर (%)' : 'Min Interest Rate (%)'}</Label>
                    <Input type="number" step="0.1" value={form.min_rate} onChange={e => update('min_rate', e.target.value)} placeholder="8.5" className="mt-1.5 rounded-xl" data-testid="min-rate-input" />
                  </div>
                  <div>
                    <Label className="font-body font-semibold text-[#0A0A0A]">{language === 'hi' ? 'अधिकतम ब्याज दर (%)' : 'Max Interest Rate (%)'}</Label>
                    <Input type="number" step="0.1" value={form.max_rate} onChange={e => update('max_rate', e.target.value)} placeholder="14.0" className="mt-1.5 rounded-xl" data-testid="max-rate-input" />
                  </div>
                </div>
                <div>
                  <Label className="font-body font-semibold text-[#0A0A0A]">{language === 'hi' ? 'कमीशन (%)' : 'Commission Rate (%)'}</Label>
                  <Input type="number" step="0.1" value={form.commission_pct} onChange={e => update('commission_pct', e.target.value)} placeholder="1.0" className="mt-1.5 rounded-xl" data-testid="commission-input" />
                  <p className="font-body text-[10px] text-[#9CA3AF] mt-1">{language === 'hi' ? 'संवितरण पर प्लेटफॉर्म कमीशन' : 'Platform commission on disbursal'}</p>
                </div>
                <div>
                  <Label className="font-body font-semibold text-[#0A0A0A]">{language === 'hi' ? 'विवरण' : 'Description'}</Label>
                  <Input value={form.description} onChange={e => update('description', e.target.value)} placeholder="Brief about your bank..." className="mt-1.5 rounded-xl" data-testid="description-input" />
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => step === 1 ? navigate('/') : setStep(s => s - 1)} className="rounded-full px-6 font-body" data-testid="bank-back-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />{step === 1 ? (language === 'hi' ? 'होम' : 'Home') : (language === 'hi' ? 'पीछे' : 'Back')}
              </Button>
              {step < 3 ? (
                <Button onClick={() => setStep(s => s + 1)} className="bg-[#059669] hover:bg-[#047857] text-white rounded-full px-6 font-body" data-testid="bank-next-btn">
                  {language === 'hi' ? 'अगला' : 'Next'}<ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading} className="bg-[#059669] hover:bg-[#047857] text-white rounded-full px-6 font-body" data-testid="bank-submit-btn">
                  {loading ? '...' : <><CheckCircle className="w-4 h-4 mr-2" />{language === 'hi' ? 'पंजीकरण करें' : 'Register Bank'}</>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
