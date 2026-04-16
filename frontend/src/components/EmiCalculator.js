import { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency } from '../lib/api';
import { Card } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { Calculator, ArrowRight, TrendingDown, IndianRupee } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function EmiCalculator({ showCta = false, compact = false }) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState(1000000);
  const [rate, setRate] = useState(10);
  const [tenure, setTenure] = useState(60);

  const calc = useMemo(() => {
    const p = amount;
    const r = rate / (12 * 100);
    const n = tenure;
    if (r === 0) return { emi: p / n, interest: 0, total: p };
    const emi = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const total = emi * n;
    const interest = total - p;
    return { emi: Math.round(emi), interest: Math.round(interest), total: Math.round(total) };
  }, [amount, rate, tenure]);

  const pieData = [
    { name: 'Principal', value: amount, color: '#059669' },
    { name: 'Interest', value: calc.interest, color: '#F59E0B' },
  ];

  const tenureYears = tenure >= 12 ? `${Math.round(tenure / 12)} ${t.years || 'years'}` : `${tenure} ${t.months || 'months'}`;

  return (
    <Card className={`rounded-2xl feature-card-shade overflow-hidden ${compact ? 'p-4' : 'p-6 md:p-8'}`} data-testid="emi-calculator">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#059669]/15 to-[#059669]/5 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-[#059669]" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="font-heading font-bold text-[#0A0A0A] tracking-tight">{t.emiCalcTitle || 'EMI Calculator'}</h3>
          <p className="font-body text-xs text-[#9CA3AF]">{t.emiCalcSub || 'See how much you will pay monthly'}</p>
        </div>
      </div>

      <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Inputs */}
        <div className="space-y-5">
          {/* Amount */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="font-body font-semibold text-sm text-[#0A0A0A]">{t.loanAmount || 'Loan Amount'}</Label>
              <div className="flex items-center gap-1">
                <IndianRupee className="w-3 h-3 text-[#059669]" />
                <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value) || 0)}
                  className="w-28 h-7 text-right text-sm font-heading font-bold rounded-lg border-[#E5E7EB] p-1"
                  data-testid="emi-amount-input" />
              </div>
            </div>
            <Slider value={[amount]} min={50000} max={10000000} step={50000}
              onValueChange={v => setAmount(v[0])}
              className="[&_[role=slider]]:bg-[#059669] [&_[role=slider]]:border-[#059669] [&_[role=slider]]:w-4 [&_[role=slider]]:h-4"
              data-testid="emi-amount-slider" />
            <div className="flex justify-between mt-1">
              <span className="font-body text-[10px] text-[#9CA3AF]">50K</span>
              <span className="font-body text-[10px] text-[#9CA3AF]">1Cr</span>
            </div>
          </div>

          {/* Rate */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="font-body font-semibold text-sm text-[#0A0A0A]">{t.interestRate || 'Interest Rate'}</Label>
              <div className="flex items-center">
                <Input type="number" value={rate} step={0.1} onChange={e => setRate(Number(e.target.value) || 0)}
                  className="w-16 h-7 text-right text-sm font-heading font-bold rounded-lg border-[#E5E7EB] p-1"
                  data-testid="emi-rate-input" />
                <span className="font-body text-xs text-[#9CA3AF] ml-1">%</span>
              </div>
            </div>
            <Slider value={[rate]} min={5} max={25} step={0.1}
              onValueChange={v => setRate(v[0])}
              className="[&_[role=slider]]:bg-[#059669] [&_[role=slider]]:border-[#059669] [&_[role=slider]]:w-4 [&_[role=slider]]:h-4"
              data-testid="emi-rate-slider" />
            <div className="flex justify-between mt-1">
              <span className="font-body text-[10px] text-[#9CA3AF]">5%</span>
              <span className="font-body text-[10px] text-[#9CA3AF]">25%</span>
            </div>
          </div>

          {/* Tenure */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="font-body font-semibold text-sm text-[#0A0A0A]">{t.loanTenure || 'Tenure'}</Label>
              <span className="font-heading font-bold text-sm text-[#0A0A0A]">{tenureYears}</span>
            </div>
            <Slider value={[tenure]} min={6} max={360} step={6}
              onValueChange={v => setTenure(v[0])}
              className="[&_[role=slider]]:bg-[#059669] [&_[role=slider]]:border-[#059669] [&_[role=slider]]:w-4 [&_[role=slider]]:h-4"
              data-testid="emi-tenure-slider" />
            <div className="flex justify-between mt-1">
              <span className="font-body text-[10px] text-[#9CA3AF]">6m</span>
              <span className="font-body text-[10px] text-[#9CA3AF]">30yr</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="bg-[#F9F9FB] dark:bg-[hsl(240,5%,10%)] rounded-2xl p-5">
            {/* Pie Chart */}
            <div className="h-[140px] mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={3} strokeWidth={0}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mb-4">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#059669]" /><span className="font-body text-xs text-[#4B5563]">Principal</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /><span className="font-body text-xs text-[#4B5563]">Interest</span></div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center bg-white dark:bg-[hsl(240,5%,12%)] rounded-xl p-3">
                <span className="font-body text-sm text-[#4B5563]">{t.emi || 'Monthly EMI'}</span>
                <span className="font-heading font-bold text-lg text-[#059669]" data-testid="emi-result">{formatCurrency(calc.emi)}</span>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-[hsl(240,5%,12%)] rounded-xl p-3">
                <span className="font-body text-sm text-[#4B5563]">{t.totalInterest || 'Total Interest'}</span>
                <span className="font-heading font-bold text-sm text-[#F59E0B]">{formatCurrency(calc.interest)}</span>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-[hsl(240,5%,12%)] rounded-xl p-3">
                <span className="font-body text-sm text-[#4B5563]">{t.totalCost || 'Total Repayment'}</span>
                <span className="font-heading font-bold text-sm text-[#0A0A0A]">{formatCurrency(calc.total)}</span>
              </div>
            </div>
          </div>

          {showCta && (
            <Link to="/register">
              <Button className="w-full mt-4 bg-[#059669] hover:bg-[#047857] text-white rounded-full font-body font-semibold h-12 btn-glow" data-testid="emi-cta-button">
                {t.seeBestLoans || 'See Best Loans for This EMI'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
