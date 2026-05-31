import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { useAnalytics, usePageView } from '../lib/analytics';
import api, { formatIndianNumber, parseIndianNumber } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { Shield, ArrowLeft, ArrowRight, Home, User, Car, GraduationCap, Bike, RefreshCw, Briefcase, Building2, Store, BookOpen, CheckCircle, Gem, Repeat, LandPlot, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const { t, language } = useLanguage();
  const { track } = useAnalytics();
  usePageView('onboarding');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const loanTypes = [
    { value: "personal", label: t.personalLoan, icon: User, desc: t.forAnyNeed },
    { value: "home", label: t.homeLoan, icon: Home, desc: t.buyHome },
    { value: "car", label: t.carLoan, icon: Car, desc: t.newUsedVehicle },
    { value: "bike", label: t.bikeLoan, icon: Bike, desc: t.twoWheeler },
    { value: "education", label: t.educationLoan, icon: GraduationCap, desc: t.studyAbroad },
    { value: "refinance", label: t.refinance, icon: RefreshCw, desc: t.lowerRate },
    { value: "gold", label: t.goldLoan || 'Gold Loan', icon: Gem, desc: t.goldLoanDesc || 'Loan against your gold' },
    { value: "used_vehicle", label: t.usedVehicleLoan || '2nd Hand Vehicle', icon: Repeat, desc: t.usedVehicleDesc || 'Pre-owned car or bike' },
    { value: "plot", label: t.plotLoan || 'Plot Loan', icon: LandPlot, desc: t.plotLoanDesc || 'Buy land or plot' },
    { value: "mutual_funds", label: t.mfLoan || 'Loan Against MF', icon: BarChart3, desc: t.mfLoanDesc || 'Loan against mutual funds' },
    { value: "business", label: language === 'hi' ? 'बिज़नेस लोन' : 'Business Loan', icon: Building2, desc: language === 'hi' ? 'व्यापार विस्तार हेतु' : 'For business expansion' },
    { value: "msme", label: language === 'hi' ? 'MSME/मुद्रा लोन' : 'MSME/Mudra Loan', icon: Store, desc: language === 'hi' ? 'सूक्ष्म एवं लघु उद्यम' : 'Micro & small enterprise' },
    { value: "working_capital", label: language === 'hi' ? 'वर्किंग कैपिटल' : 'Working Capital', icon: Briefcase, desc: language === 'hi' ? 'दैनिक व्यापार खर्चे' : 'Day-to-day operations' },
    { value: "lap", label: language === 'hi' ? 'प्रॉपर्टी पर लोन' : 'Loan Against Property', icon: Home, desc: language === 'hi' ? 'प्रॉपर्टी गिरवी रखकर लोन' : 'Mortgage your property' },
  ];

  const employmentTypes = [
    { value: "salaried", label: t.salaried, icon: Briefcase },
    { value: "self_employed", label: t.selfEmployed, icon: Store },
    { value: "business", label: t.businessOwner, icon: Building2 },
    { value: "student", label: t.student, icon: BookOpen },
  ];

  const [form, setForm] = useState({
    loan_type: '',
    employment_type: '',
    employer_name: '',
    employer_type: '',
    city: '',
    state: '',
    monthly_income: '',
    existing_loans: false,
    existing_loan_emi: '',
    credit_score_known: false,
    credit_score: '',
    desired_amount: '',
    desired_tenure_months: '',
  });

  // Auto-select loan type from URL param and skip to step 2
  useEffect(() => {
    const urlLoanType = searchParams.get('loan_type');
    if (urlLoanType && loanTypes.some(lt => lt.value === urlLoanType)) {
      setForm(prev => ({ ...prev, loan_type: urlLoanType }));
      setStep(2);
      track('onboarding_auto_select', { loan_type: urlLoanType });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const progress = (step / 4) * 100;

  const canGoNext = () => {
    if (step === 1) return !!form.loan_type;
    if (step === 2) return !!form.employment_type && !!form.monthly_income;
    if (step === 3) return true;
    if (step === 4) return !!form.desired_amount && !!form.desired_tenure_months;
    return false;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        loan_type: form.loan_type,
        employment_type: form.employment_type,
        employer_name: form.employer_name || null,
        employer_type: form.employer_type || null,
        city: form.city || null,
        state: form.state || null,
        monthly_income: parseFloat(parseIndianNumber(form.monthly_income)) || 0,
        existing_loans: form.existing_loans,
        existing_loan_emi: form.existing_loans ? (parseFloat(parseIndianNumber(form.existing_loan_emi)) || 0) : 0,
        credit_score_known: form.credit_score_known,
        credit_score: form.credit_score_known ? (parseInt(form.credit_score) || 0) : null,
        desired_amount: parseFloat(parseIndianNumber(form.desired_amount)) || 0,
        desired_tenure_months: parseInt(form.desired_tenure_months) || 60,
      };
      await api.put('/user/profile', payload);
      track('onboarding_complete', { loan_type: form.loan_type, income: form.monthly_income });
      updateUser({ has_profile: true });
      toast.success('Profile complete! Getting your recommendations...');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] dark:bg-[#050810]" data-testid="onboarding-page">
      {/* Header */}
      <div className="glass-nav fixed top-0 w-full z-50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#059669]" strokeWidth={1.5} />
            <span className="font-heading font-bold text-lg text-[#0A1118] dark:text-[#FFFBF5]">Rinkosh</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle compact />
            <span className="text-sm font-body text-[#94A3B8] dark:text-[#64748B]">{t.stepOf} {step} {t.of} 4</span>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 pb-2">
          <Progress value={progress} className="h-1.5 bg-[#E5E7EB]" data-testid="onboarding-progress" />
          {/* Step Labels */}
          <div className="flex justify-between mt-3">
            {[
              { label: t.personalLoan ? t.loanTypeQ?.split('?')[0]?.slice(0,12) || 'Loan Type' : 'Loan Type', icon: '1' },
              { label: t.employmentDetails || 'Employment', icon: '2' },
              { label: t.creditInformation || 'Credit', icon: '3' },
              { label: t.loanDetails || 'Details', icon: '4' },
            ].map((s, i) => (
              <div key={i} className={`flex items-center gap-1.5 transition-all ${step > i ? 'text-[#059669]' : step === i + 1 ? 'text-[#0A1118] dark:text-[#FFFBF5]' : 'text-[#D1D5DB]'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-heading font-bold border-2 transition-all ${step > i ? 'bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] border-[#059669] text-white' : step === i + 1 ? 'border-[#059669] text-[#059669]' : 'border-[#D1D5DB] dark:border-[#374151]'}`}>
                  {step > i ? <CheckCircle className="w-3.5 h-3.5" /> : s.icon}
                </div>
                <span className="font-body text-[10px] hidden sm:inline">{s.label.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-28 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              {/* Step 1: Loan Type */}
              {step === 1 && (
                <div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0A1118] dark:text-[#FFFBF5] tracking-tight mb-2">What type of loan are you looking for?</h2>
                  <p className="font-body text-[#334155] dark:text-[#CBD5E1] mb-8">Select the loan type that matches your need</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {loanTypes.map((lt) => (
                      <Card
                        key={lt.value}
                        className={`p-5 cursor-pointer transition-all duration-200 rounded-2xl border-2 ${
                          form.loan_type === lt.value
                            ? 'border-[#059669] bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/5 shadow-md'
                            : 'border-black/5 hover:border-[#059669]/30 hover:shadow-sm'
                        }`}
                        onClick={() => {
                          update('loan_type', lt.value);
                          // Auto-advance to step 2 on selection
                          setTimeout(() => setStep(2), 200);
                        }}
                        data-testid={`loan-type-${lt.value}`}
                      >
                        <lt.icon className={`w-7 h-7 mb-3 ${form.loan_type === lt.value ? 'text-[#059669]' : 'text-[#334155] dark:text-[#CBD5E1]'}`} strokeWidth={1.5} />
                        <h3 className="font-heading font-semibold text-[#0A1118] dark:text-[#FFFBF5] text-sm">{lt.label}</h3>
                        <p className="font-body text-xs text-[#94A3B8] dark:text-[#64748B] mt-1">{lt.desc}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Employment */}
              {step === 2 && (
                <div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0A1118] dark:text-[#FFFBF5] tracking-tight mb-2">{t.employmentDetails}</h2>
                  <p className="font-body text-[#334155] dark:text-[#CBD5E1] mb-8">{t.employmentHelp}</p>
                  <div className="space-y-6">
                    <div>
                      <Label className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5] mb-3 block">{t.employmentType}</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {employmentTypes.map((et) => (
                          <Card
                            key={et.value}
                            className={`p-4 cursor-pointer transition-all duration-200 rounded-xl border-2 flex items-center gap-3 ${
                              form.employment_type === et.value
                                ? 'border-[#059669] bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/5'
                                : 'border-black/5 hover:border-[#059669]/30'
                            }`}
                            onClick={() => update('employment_type', et.value)}
                            data-testid={`employment-${et.value}`}
                          >
                            <et.icon className={`w-5 h-5 ${form.employment_type === et.value ? 'text-[#059669]' : 'text-[#334155] dark:text-[#CBD5E1]'}`} strokeWidth={1.5} />
                            <span className="font-body text-sm font-medium text-[#0A1118] dark:text-[#FFFBF5]">{et.label}</span>
                          </Card>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="employer" className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5]">{language === 'hi' ? 'नियोक्ता / कंपनी' : 'Employer / Company'}</Label>
                      <Input
                        id="employer" type="text" value={form.employer_name}
                        onChange={(e) => update('employer_name', e.target.value)}
                        placeholder={language === 'hi' ? 'जैसे SAIL, TCS, SBI' : 'e.g. SAIL, TCS, SBI'}
                        className="mt-2 rounded-xl bg-white dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#059669] focus:ring-[#059669]"
                        data-testid="employer-name-input"
                      />
                    </div>
                    <div>
                      <Label className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5] mb-3 block">{language === 'hi' ? 'नियोक्ता प्रकार' : 'Employer Type'}</Label>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {[
                          { value: 'psu', label: 'PSU' },
                          { value: 'govt', label: language === 'hi' ? 'सरकारी' : 'Govt' },
                          { value: 'gcc', label: 'GCC' },
                          { value: 'private', label: language === 'hi' ? 'प्राइवेट' : 'Private' },
                          { value: 'defence', label: language === 'hi' ? 'रक्षा' : 'Defence' },
                        ].map((et) => (
                          <button key={et.value}
                            onClick={() => update('employer_type', et.value)}
                            className={`px-3 py-2 rounded-lg font-body text-xs font-semibold transition-all ${
                              form.employer_type === et.value ? 'bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] text-white' : 'bg-[#F3F4F6] dark:bg-[#141C2A] text-[#334155] dark:text-[#CBD5E1] hover:bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/10'
                            }`}
                            data-testid={`employer-type-${et.value}`}
                          >{et.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="city" className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5]">{language === 'hi' ? 'शहर' : 'City'}</Label>
                        <Input
                          id="city" type="text" value={form.city}
                          onChange={(e) => update('city', e.target.value)}
                          placeholder={language === 'hi' ? 'जैसे बोकारो, मुंबई' : 'e.g. Bokaro, Mumbai'}
                          className="mt-2 rounded-xl bg-white dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#059669] focus:ring-[#059669]"
                          data-testid="city-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state" className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5]">{language === 'hi' ? 'राज्य' : 'State'}</Label>
                        <Input
                          id="state" type="text" value={form.state}
                          onChange={(e) => update('state', e.target.value)}
                          placeholder={language === 'hi' ? 'जैसे झारखंड' : 'e.g. Jharkhand'}
                          className="mt-2 rounded-xl bg-white dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#059669] focus:ring-[#059669]"
                          data-testid="state-input"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="income" className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5]">{t.monthlyIncome}</Label>
                      <Input
                        id="income" type="text" inputMode="numeric" value={formatIndianNumber(form.monthly_income)}
                        onChange={(e) => { const raw = parseIndianNumber(e.target.value).replace(/[^0-9]/g, ''); update('monthly_income', raw); }}
                        placeholder="e.g. 50000"
                        className="mt-2 rounded-xl bg-white dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#059669] focus:ring-[#059669]"
                        data-testid="monthly-income-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Credit Info */}
              {step === 3 && (
                <div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0A1118] dark:text-[#FFFBF5] tracking-tight mb-2">{t.creditInformation}</h2>
                  <p className="font-body text-[#334155] dark:text-[#CBD5E1] mb-8">{t.creditHelp}</p>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between bg-white dark:bg-[#0B121C] p-4 rounded-xl border border-black/5">
                      <div>
                        <Label className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5]">{t.existingLoansQ}</Label>
                        <p className="font-body text-xs text-[#94A3B8] dark:text-[#64748B] mt-0.5">{t.existingLoansDesc}</p>
                      </div>
                      <Switch
                        checked={form.existing_loans}
                        onCheckedChange={(v) => update('existing_loans', v)}
                        data-testid="existing-loans-switch"
                      />
                    </div>
                    {form.existing_loans && (
                      <div>
                        <Label htmlFor="emi" className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5]">Total Monthly EMI (Rs.)</Label>
                        <Input
                          id="emi" type="text" inputMode="numeric" value={formatIndianNumber(form.existing_loan_emi)}
                          onChange={(e) => { const raw = parseIndianNumber(e.target.value).replace(/[^0-9]/g, ''); update('existing_loan_emi', raw); }}
                          placeholder="e.g. 15000"
                          className="mt-2 rounded-xl bg-white dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#059669] focus:ring-[#059669]"
                          data-testid="existing-emi-input"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between bg-white dark:bg-[#0B121C] p-4 rounded-xl border border-black/5">
                      <div>
                        <Label className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5]">{t.knowCreditScore}</Label>
                        <p className="font-body text-xs text-[#94A3B8] dark:text-[#64748B] mt-0.5">{t.creditScoreDesc}</p>
                      </div>
                      <Switch
                        checked={form.credit_score_known}
                        onCheckedChange={(v) => update('credit_score_known', v)}
                        data-testid="credit-score-known-switch"
                      />
                    </div>
                    {form.credit_score_known && (
                      <div>
                        <Label htmlFor="cscore" className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5]">{t.yourCreditScore}</Label>
                        <Input
                          id="cscore" type="number" value={form.credit_score} min={300} max={900}
                          onChange={(e) => update('credit_score', e.target.value)}
                          placeholder="e.g. 750"
                          className="mt-2 rounded-xl bg-white dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#059669] focus:ring-[#059669]"
                          data-testid="credit-score-input"
                        />
                        <p className="font-body text-xs text-[#94A3B8] dark:text-[#64748B] mt-1">{t.scoreBetween}</p>
                      </div>
                    )}
                    {!form.credit_score_known && (
                      <div className="bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/5 rounded-xl p-4 border border-[#059669]/20">
                        <p className="font-body text-sm text-[#059669]">
                          {t.noWorries}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Loan Details */}
              {step === 4 && (
                <div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0A1118] dark:text-[#FFFBF5] tracking-tight mb-2">{t.loanDetails}</h2>
                  <p className="font-body text-[#334155] dark:text-[#CBD5E1] mb-8">{t.loanDetailsHelp}</p>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="amount" className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5]">{t.loanAmount}</Label>
                      <Input
                        id="amount" type="text" inputMode="numeric" value={formatIndianNumber(form.desired_amount)}
                        onChange={(e) => { const raw = parseIndianNumber(e.target.value).replace(/[^0-9]/g, ''); update('desired_amount', raw); }}
                        placeholder="e.g. 5,00,000"
                        className="mt-2 rounded-xl bg-white dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#059669] focus:ring-[#059669]"
                        data-testid="desired-amount-input"
                      />
                    </div>
                    <div>
                      <Label className="font-body font-semibold text-[#0A1118] dark:text-[#FFFBF5]">Loan Tenure</Label>
                      <RadioGroup
                        value={form.desired_tenure_months}
                        onValueChange={(v) => update('desired_tenure_months', v)}
                        className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3"
                      >
                        {[
                          { value: "12", label: t.yr1 },
                          { value: "36", label: t.yr3 },
                          { value: "60", label: t.yr5 },
                          { value: "120", label: t.yr10 },
                          { value: "180", label: t.yr15 },
                          { value: "240", label: t.yr20 },
                          { value: "300", label: t.yr25 },
                          { value: "360", label: t.yr30 },
                        ].map((t) => (
                          <Label
                            key={t.value}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              form.desired_tenure_months === t.value
                                ? 'border-[#059669] bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/5'
                                : 'border-black/5 hover:border-[#059669]/30'
                            }`}
                            data-testid={`tenure-${t.value}`}
                          >
                            <RadioGroupItem value={t.value} className="text-[#059669]" />
                            <span className="font-body text-sm">{t.label}</span>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-10">
            <Button
              variant="outline"
              onClick={() => step === 1 ? navigate('/') : setStep(s => s - 1)}
              className="rounded-full px-6 font-body border-[#E5E7EB] dark:border-[#1F2A3D] hover:border-[#111827]"
              data-testid="onboarding-back-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {step === 1 ? (language === 'hi' ? 'होम पर वापस' : 'Back to Home') : t.back}
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canGoNext()}
                className="bg-[#0A1118] dark:bg-[#FFB347] dark:text-[#0A1118] text-white hover:bg-[#000000] rounded-full px-6 font-body font-semibold"
                data-testid="onboarding-next-button"
              >
                {t.next}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canGoNext() || loading}
                className="bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] text-white hover:bg-[#059669] dark:hover:bg-[#10B981] rounded-full px-8 font-body font-semibold"
                data-testid="onboarding-submit-button"
              >
                {loading ? t.saving : t.getRecommendations}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
