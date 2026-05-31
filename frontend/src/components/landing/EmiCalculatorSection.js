import { useState, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { calcEmi, fmtRs } from './utils';

export function EmiCalculatorSection({ t }) {
  const [calcAmt, setCalcAmt] = useState(1000000);
  const [calcRate, setCalcRate] = useState(10);
  const [calcTenure, setCalcTenure] = useState(60);
  const calcResult = useMemo(() => calcEmi(calcAmt, calcRate, calcTenure), [calcAmt, calcRate, calcTenure]);
  const pieData = [
    { name: t.principal, value: calcAmt, color: '#0D1B2A' },
    { name: t.interest, value: calcResult.interest, color: '#C8860A' },
  ];

  return (
    <section id="emi-calculator" className="py-16 md:py-20 px-6 lg:px-8 bg-[#F8F9FA]" data-testid="emi-calculator-section">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-8">
            <div>
              <label className="font-heading font-semibold text-sm text-[#0D1B2A] mb-3 block">{t.howMuchNeed}</label>
              <Slider value={[calcAmt]} min={50000} max={10000000} step={50000} onValueChange={([v]) => setCalcAmt(v)} className="mb-2" />
              <div className="flex justify-between font-body text-xs text-[#94A3B8]"><span>₹50K</span><span className="font-semibold text-[#0D1B2A]">{fmtRs(calcAmt)}</span><span>₹1 Cr</span></div>
            </div>
            <div>
              <label className="font-heading font-semibold text-sm text-[#0D1B2A] mb-3 block">{t.expectedRate}</label>
              <Slider value={[calcRate]} min={5} max={24} step={0.25} onValueChange={([v]) => setCalcRate(v)} className="mb-2" />
              <div className="flex justify-between font-body text-xs text-[#94A3B8]"><span>5%</span><span className="font-semibold text-[#0D1B2A]">{calcRate}%</span><span>24%</span></div>
            </div>
            <div>
              <label className="font-heading font-semibold text-sm text-[#0D1B2A] mb-3 block">{t.forHowLong}</label>
              <Slider value={[calcTenure]} min={6} max={360} step={6} onValueChange={([v]) => setCalcTenure(v)} className="mb-2" />
              <div className="flex justify-between font-body text-xs text-[#94A3B8]"><span>6 mo</span><span className="font-semibold text-[#0D1B2A]">{calcTenure >= 12 ? `${Math.round(calcTenure/12)} yr` : `${calcTenure} mo`}</span><span>30 yr</span></div>
            </div>
            <div className="flex justify-center">
              <ResponsiveContainer width={250} height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#0D1B2A]" /><span className="font-body text-xs text-[#64748B]">{t.principal}</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#C8860A]" /><span className="font-body text-xs text-[#64748B]">{t.interest}</span></div>
            </div>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <Card className="rounded-xl border border-[#E5E7EB] p-6">
                <div className="font-body text-xs text-[#94A3B8] uppercase tracking-wider mb-1">{t.monthlyEMI}</div>
                <div className="font-heading font-bold text-3xl text-[#0D1B2A]">{fmtRs(calcResult.emi)}</div>
              </Card>
              <Card className="rounded-xl border border-[#E5E7EB] p-6">
                <div className="font-body text-xs text-[#94A3B8] uppercase tracking-wider mb-1">{t.totalInterestLabel}</div>
                <div className="font-heading font-bold text-3xl text-[#C8860A]">{fmtRs(calcResult.interest)}</div>
              </Card>
              <Card className="rounded-xl border border-[#E5E7EB] p-6">
                <div className="font-body text-xs text-[#94A3B8] uppercase tracking-wider mb-1">{t.totalRepayment}</div>
                <div className="font-heading font-bold text-3xl text-[#0D1B2A]">{fmtRs(calcResult.total)}</div>
              </Card>
            </div>
            <a href="#browse-loans">
              <Button className="w-full bg-[#0D1B2A] text-white hover:bg-[#1B2D45] rounded-lg h-12 font-body font-bold text-base mt-4 shadow-md hover:shadow-lg transition-shadow" data-testid="emi-see-loans-btn">
                {t.seeLoansMatchEmi} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
