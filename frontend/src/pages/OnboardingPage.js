import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { Shield, ArrowLeft, ArrowRight, Home, User, Car, GraduationCap, Bike, RefreshCw, Briefcase, Building2, Store, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const loanTypes = [
  { value: "personal", label: "Personal Loan", icon: User, desc: "For any personal need" },
  { value: "home", label: "Home Loan", icon: Home, desc: "Buy or build a home" },
  { value: "car", label: "Car Loan", icon: Car, desc: "New or used vehicle" },
  { value: "bike", label: "Bike Loan", icon: Bike, desc: "Two-wheeler finance" },
  { value: "education", label: "Education Loan", icon: GraduationCap, desc: "Study in India or abroad" },
  { value: "refinance", label: "Refinance", icon: RefreshCw, desc: "Lower your existing rate" },
];

const employmentTypes = [
  { value: "salaried", label: "Salaried", icon: Briefcase },
  { value: "self_employed", label: "Self Employed", icon: Store },
  { value: "business", label: "Business Owner", icon: Building2 },
  { value: "student", label: "Student", icon: BookOpen },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    loan_type: '',
    employment_type: '',
    monthly_income: '',
    existing_loans: false,
    existing_loan_emi: '',
    credit_score_known: false,
    credit_score: '',
    desired_amount: '',
    desired_tenure_months: '',
  });

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
        monthly_income: parseFloat(form.monthly_income) || 0,
        existing_loans: form.existing_loans,
        existing_loan_emi: form.existing_loans ? (parseFloat(form.existing_loan_emi) || 0) : 0,
        credit_score_known: form.credit_score_known,
        credit_score: form.credit_score_known ? (parseInt(form.credit_score) || 0) : null,
        desired_amount: parseFloat(form.desired_amount) || 0,
        desired_tenure_months: parseInt(form.desired_tenure_months) || 60,
      };
      await api.put('/user/profile', payload);
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
    <div className="min-h-screen bg-[#F9F9FB]" data-testid="onboarding-page">
      {/* Header */}
      <div className="glass-nav fixed top-0 w-full z-50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#059669]" strokeWidth={1.5} />
            <span className="font-heading font-bold text-lg text-[#0A0A0A]">Rinkosh</span>
          </div>
          <span className="text-sm font-body text-[#9CA3AF]">Step {step} of 4</span>
        </div>
        <div className="max-w-2xl mx-auto px-6 pb-2">
          <Progress value={progress} className="h-1.5 bg-[#E5E7EB]" data-testid="onboarding-progress" />
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
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0A0A0A] tracking-tight mb-2">What type of loan are you looking for?</h2>
                  <p className="font-body text-[#4B5563] mb-8">Select the loan type that matches your need</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {loanTypes.map((lt) => (
                      <Card
                        key={lt.value}
                        className={`p-5 cursor-pointer transition-all duration-200 rounded-2xl border-2 ${
                          form.loan_type === lt.value
                            ? 'border-[#059669] bg-[#059669]/5 shadow-md'
                            : 'border-black/5 hover:border-[#059669]/30 hover:shadow-sm'
                        }`}
                        onClick={() => update('loan_type', lt.value)}
                        data-testid={`loan-type-${lt.value}`}
                      >
                        <lt.icon className={`w-7 h-7 mb-3 ${form.loan_type === lt.value ? 'text-[#059669]' : 'text-[#4B5563]'}`} strokeWidth={1.5} />
                        <h3 className="font-heading font-semibold text-[#0A0A0A] text-sm">{lt.label}</h3>
                        <p className="font-body text-xs text-[#9CA3AF] mt-1">{lt.desc}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Employment */}
              {step === 2 && (
                <div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0A0A0A] tracking-tight mb-2">Employment Details</h2>
                  <p className="font-body text-[#4B5563] mb-8">This helps us find the right options for you</p>
                  <div className="space-y-6">
                    <div>
                      <Label className="font-body font-semibold text-[#0A0A0A] mb-3 block">Employment Type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {employmentTypes.map((et) => (
                          <Card
                            key={et.value}
                            className={`p-4 cursor-pointer transition-all duration-200 rounded-xl border-2 flex items-center gap-3 ${
                              form.employment_type === et.value
                                ? 'border-[#059669] bg-[#059669]/5'
                                : 'border-black/5 hover:border-[#059669]/30'
                            }`}
                            onClick={() => update('employment_type', et.value)}
                            data-testid={`employment-${et.value}`}
                          >
                            <et.icon className={`w-5 h-5 ${form.employment_type === et.value ? 'text-[#059669]' : 'text-[#4B5563]'}`} strokeWidth={1.5} />
                            <span className="font-body text-sm font-medium text-[#0A0A0A]">{et.label}</span>
                          </Card>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="income" className="font-body font-semibold text-[#0A0A0A]">Monthly Income (Rs.)</Label>
                      <Input
                        id="income" type="number" value={form.monthly_income}
                        onChange={(e) => update('monthly_income', e.target.value)}
                        placeholder="e.g. 50000"
                        className="mt-2 rounded-xl bg-white border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669]"
                        data-testid="monthly-income-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Credit Info */}
              {step === 3 && (
                <div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0A0A0A] tracking-tight mb-2">Credit Information</h2>
                  <p className="font-body text-[#4B5563] mb-8">Helps us estimate your approval probability</p>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-black/5">
                      <div>
                        <Label className="font-body font-semibold text-[#0A0A0A]">Do you have existing loans?</Label>
                        <p className="font-body text-xs text-[#9CA3AF] mt-0.5">Active EMIs you're currently paying</p>
                      </div>
                      <Switch
                        checked={form.existing_loans}
                        onCheckedChange={(v) => update('existing_loans', v)}
                        data-testid="existing-loans-switch"
                      />
                    </div>
                    {form.existing_loans && (
                      <div>
                        <Label htmlFor="emi" className="font-body font-semibold text-[#0A0A0A]">Total Monthly EMI (Rs.)</Label>
                        <Input
                          id="emi" type="number" value={form.existing_loan_emi}
                          onChange={(e) => update('existing_loan_emi', e.target.value)}
                          placeholder="e.g. 15000"
                          className="mt-2 rounded-xl bg-white border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669]"
                          data-testid="existing-emi-input"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-black/5">
                      <div>
                        <Label className="font-body font-semibold text-[#0A0A0A]">Do you know your credit score?</Label>
                        <p className="font-body text-xs text-[#9CA3AF] mt-0.5">CIBIL, Experian, or Equifax score</p>
                      </div>
                      <Switch
                        checked={form.credit_score_known}
                        onCheckedChange={(v) => update('credit_score_known', v)}
                        data-testid="credit-score-known-switch"
                      />
                    </div>
                    {form.credit_score_known && (
                      <div>
                        <Label htmlFor="cscore" className="font-body font-semibold text-[#0A0A0A]">Your Credit Score</Label>
                        <Input
                          id="cscore" type="number" value={form.credit_score} min={300} max={900}
                          onChange={(e) => update('credit_score', e.target.value)}
                          placeholder="e.g. 750"
                          className="mt-2 rounded-xl bg-white border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669]"
                          data-testid="credit-score-input"
                        />
                        <p className="font-body text-xs text-[#9CA3AF] mt-1">Score between 300-900</p>
                      </div>
                    )}
                    {!form.credit_score_known && (
                      <div className="bg-[#059669]/5 rounded-xl p-4 border border-[#059669]/20">
                        <p className="font-body text-sm text-[#059669]">
                          No worries! You can check your free credit score on CIBIL.com or through your bank's app. We'll still show recommendations based on other factors.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Loan Details */}
              {step === 4 && (
                <div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0A0A0A] tracking-tight mb-2">Loan Details</h2>
                  <p className="font-body text-[#4B5563] mb-8">How much do you need and for how long?</p>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="amount" className="font-body font-semibold text-[#0A0A0A]">Loan Amount (Rs.)</Label>
                      <Input
                        id="amount" type="number" value={form.desired_amount}
                        onChange={(e) => update('desired_amount', e.target.value)}
                        placeholder="e.g. 500000"
                        className="mt-2 rounded-xl bg-white border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669]"
                        data-testid="desired-amount-input"
                      />
                    </div>
                    <div>
                      <Label className="font-body font-semibold text-[#0A0A0A]">Loan Tenure</Label>
                      <RadioGroup
                        value={form.desired_tenure_months}
                        onValueChange={(v) => update('desired_tenure_months', v)}
                        className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3"
                      >
                        {[
                          { value: "12", label: "1 Year" },
                          { value: "36", label: "3 Years" },
                          { value: "60", label: "5 Years" },
                          { value: "120", label: "10 Years" },
                          { value: "180", label: "15 Years" },
                          { value: "240", label: "20 Years" },
                          { value: "300", label: "25 Years" },
                          { value: "360", label: "30 Years" },
                        ].map((t) => (
                          <Label
                            key={t.value}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              form.desired_tenure_months === t.value
                                ? 'border-[#059669] bg-[#059669]/5'
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
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="rounded-full px-6 font-body border-[#E5E7EB] hover:border-[#111827]"
              data-testid="onboarding-back-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canGoNext()}
                className="bg-[#111827] text-white hover:bg-[#000000] rounded-full px-6 font-body font-semibold"
                data-testid="onboarding-next-button"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canGoNext() || loading}
                className="bg-[#059669] text-white hover:bg-[#047857] rounded-full px-8 font-body font-semibold"
                data-testid="onboarding-submit-button"
              >
                {loading ? 'Saving...' : 'Get Recommendations'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
