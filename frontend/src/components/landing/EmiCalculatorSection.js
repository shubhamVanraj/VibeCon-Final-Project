import { useState, useMemo } from 'react';
import { ArrowRight, Calculator } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { calcEmi, fmtRs } from './utils';

export function EmiCalculatorSection({ t }) {
  const [calcAmt, setCalcAmt] = useState(1000000);
  const [calcRate, setCalcRate] = useState(10);
  const [calcTenure, setCalcTenure] = useState(60);
  const calcResult = useMemo(() => calcEmi(calcAmt, calcRate, calcTenure), [calcAmt, calcRate, calcTenure]);
  const pieData = [
    { name: t.principal, value: calcAmt, color: '#0A1118' },
    { name: t.interest, value: calcResult.interest, color: '#FFB347' },
  ];

  return (
    <section id="emi-calculator" className="py-20 px-6 lg:px-8 relative bg-[#FAF5EA] dark:bg-[#0B121C]" data-testid="emi-calculator-section">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 cap text-[#C8860A] mb-2">
            <Calculator className="w-3.5 h-3.5" /> {t.emiCalcKicker}
          </div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#0A1118] dark:text-[#FFFBF5] tracking-tight">
            {t.emiCalcHeader} <span className="hero-headline accent">{t.emiCalcHeaderAccent}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Sliders */}
          <div className="bismuth-tile p-8">
            <div className="relative z-10 space-y-7">
              <div>
                <label className="font-heading font-semibold text-sm text-[#0A1118] dark:text-[#FFFBF5] mb-3 flex items-center justify-between">
                  <span>{t.howMuchNeed}</span>
                  <span className="data-large text-lg text-[#C8860A]">{fmtRs(calcAmt)}</span>
                </label>
                <Slider value={[calcAmt]} min={50000} max={10000000} step={50000} onValueChange={([v]) => setCalcAmt(v)} className="mb-2" />
                <div className="flex justify-between font-body text-[10px] text-[#94A3B8] dark:text-[#64748B]"><span>₹50K</span><span>₹1 Cr</span></div>
              </div>
              <div>
                <label className="font-heading font-semibold text-sm text-[#0A1118] dark:text-[#FFFBF5] mb-3 flex items-center justify-between">
                  <span>{t.expectedRate}</span>
                  <span className="data-large text-lg text-[#C8860A]">{calcRate}%</span>
                </label>
                <Slider value={[calcRate]} min={5} max={24} step={0.25} onValueChange={([v]) => setCalcRate(v)} className="mb-2" />
                <div className="flex justify-between font-body text-[10px] text-[#94A3B8] dark:text-[#64748B]"><span>5%</span><span>24%</span></div>
              </div>
              <div>
                <label className="font-heading font-semibold text-sm text-[#0A1118] dark:text-[#FFFBF5] mb-3 flex items-center justify-between">
                  <span>{t.forHowLong}</span>
                  <span className="data-large text-lg text-[#C8860A]">{calcTenure >= 12 ? `${Math.round(calcTenure/12)} yr` : `${calcTenure} mo`}</span>
                </label>
                <Slider value={[calcTenure]} min={6} max={360} step={6} onValueChange={([v]) => setCalcTenure(v)} className="mb-2" />
                <div className="flex justify-between font-body text-[10px] text-[#94A3B8] dark:text-[#64748B]"><span>6 mo</span><span>30 yr</span></div>
              </div>

              <div className="pt-2">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#0A1118]" /><span className="font-body text-xs text-[#334155] dark:text-[#CBD5E1]">{t.principal}</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#FFB347]" /><span className="font-body text-xs text-[#334155] dark:text-[#CBD5E1]">{t.interest}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="bismuth-tile bismuth-tile-best p-7">
              <div className="relative z-10">
                <div className="cap text-[#C8860A]">{t.monthlyEMI}</div>
                <div className="data-large text-5xl text-[#0A1118] dark:text-[#FFFBF5] mt-1">{fmtRs(calcResult.emi)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bismuth-tile p-6">
                <div className="relative z-10">
                  <div className="cap">{t.totalInterestLabel}</div>
                  <div className="data-large text-2xl text-[#C8860A] mt-1">{fmtRs(calcResult.interest)}</div>
                </div>
              </div>
              <div className="bismuth-tile p-6">
                <div className="relative z-10">
                  <div className="cap">{t.totalRepayment}</div>
                  <div className="data-large text-2xl text-[#0A1118] dark:text-[#FFFBF5] mt-1">{fmtRs(calcResult.total)}</div>
                </div>
              </div>
            </div>
            <a href="#browse-loans">
              <Button className="snap-press w-full bg-[#0A1118] text-white hover:bg-[#1B2D45] rounded-xl h-14 font-body font-bold text-base mt-2 shadow-[0_8px_24px_rgba(10,17,24,0.18)]" data-testid="emi-see-loans-btn">
                {t.seeLoansMatchEmi} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
