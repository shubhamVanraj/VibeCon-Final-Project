import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../components/ui/sheet';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const loanTypeOptions = [
  { value: 'personal', label: 'Personal Loan' },
  { value: 'home', label: 'Home Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'bike', label: 'Bike Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'refinance', label: 'Refinance' },
];

const employmentOptions = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self Employed' },
  { value: 'business', label: 'Business Owner' },
  { value: 'student', label: 'Student' },
];

export function ProfileEditor({ open, onOpenChange, onSaved }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.get('/user/profile').then(({ data }) => {
        setProfile(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [open]);

  const update = (key, value) => setProfile(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/user/profile', {
        loan_type: profile.loan_type,
        monthly_income: parseFloat(profile.monthly_income) || 0,
        employment_type: profile.employment_type,
        existing_loans: profile.existing_loans || false,
        existing_loan_emi: profile.existing_loans ? (parseFloat(profile.existing_loan_emi) || 0) : 0,
        credit_score_known: profile.credit_score_known || false,
        credit_score: profile.credit_score_known ? (parseInt(profile.credit_score) || null) : null,
        desired_amount: parseFloat(profile.desired_amount) || 0,
        desired_tenure_months: parseInt(profile.desired_tenure_months) || 60,
      });
      toast.success('Profile updated! Refreshing recommendations...');
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg" data-testid="profile-editor-sheet">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl">Edit Profile</SheetTitle>
          <SheetDescription className="font-body">Update your loan preferences to get better recommendations</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#059669]" /></div>
        ) : profile ? (
          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label className="font-body font-semibold text-[#0A0A0A]">Loan Type</Label>
              <Select value={profile.loan_type || ''} onValueChange={(v) => update('loan_type', v)}>
                <SelectTrigger className="rounded-xl border-[#E5E7EB]" data-testid="profile-loan-type"><SelectValue placeholder="Select loan type" /></SelectTrigger>
                <SelectContent>{loanTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-body font-semibold text-[#0A0A0A]">Employment Type</Label>
              <Select value={profile.employment_type || ''} onValueChange={(v) => update('employment_type', v)}>
                <SelectTrigger className="rounded-xl border-[#E5E7EB]" data-testid="profile-employment-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{employmentOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-body font-semibold text-[#0A0A0A]">Monthly Income (Rs.)</Label>
              <Input type="number" value={profile.monthly_income || ''} onChange={(e) => update('monthly_income', e.target.value)}
                className="rounded-xl border-[#E5E7EB]" placeholder="e.g. 50000" data-testid="profile-income" />
            </div>

            <div className="flex items-center justify-between bg-[#F9F9FB] p-3 rounded-xl">
              <Label className="font-body font-semibold text-[#0A0A0A]">Existing Loans</Label>
              <Switch checked={!!profile.existing_loans} onCheckedChange={(v) => update('existing_loans', v)} data-testid="profile-existing-loans" />
            </div>

            {profile.existing_loans && (
              <div className="space-y-2">
                <Label className="font-body font-semibold text-[#0A0A0A]">Monthly EMI (Rs.)</Label>
                <Input type="number" value={profile.existing_loan_emi || ''} onChange={(e) => update('existing_loan_emi', e.target.value)}
                  className="rounded-xl border-[#E5E7EB]" data-testid="profile-existing-emi" />
              </div>
            )}

            <div className="flex items-center justify-between bg-[#F9F9FB] p-3 rounded-xl">
              <Label className="font-body font-semibold text-[#0A0A0A]">Credit Score Known</Label>
              <Switch checked={!!profile.credit_score_known} onCheckedChange={(v) => update('credit_score_known', v)} data-testid="profile-credit-known" />
            </div>

            {profile.credit_score_known && (
              <div className="space-y-2">
                <Label className="font-body font-semibold text-[#0A0A0A]">Credit Score</Label>
                <Input type="number" value={profile.credit_score || ''} min={300} max={900}
                  onChange={(e) => update('credit_score', e.target.value)}
                  className="rounded-xl border-[#E5E7EB]" placeholder="300-900" data-testid="profile-credit-score" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-body font-semibold text-[#0A0A0A]">Loan Amount (Rs.)</Label>
              <Input type="number" value={profile.desired_amount || ''} onChange={(e) => update('desired_amount', e.target.value)}
                className="rounded-xl border-[#E5E7EB]" placeholder="e.g. 500000" data-testid="profile-amount" />
            </div>

            <div className="space-y-2">
              <Label className="font-body font-semibold text-[#0A0A0A]">Tenure (months)</Label>
              <Input type="number" value={profile.desired_tenure_months || ''} onChange={(e) => update('desired_tenure_months', e.target.value)}
                className="rounded-xl border-[#E5E7EB]" placeholder="e.g. 60" data-testid="profile-tenure" />
            </div>

            <Button onClick={handleSave} disabled={saving}
              className="w-full bg-[#059669] hover:bg-[#047857] text-white rounded-full font-body font-semibold h-12 mt-2"
              data-testid="profile-save-button">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : 'Save & Refresh Recommendations'}
            </Button>
          </div>
        ) : (
          <p className="font-body text-[#4B5563] py-12 text-center">Could not load profile</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
