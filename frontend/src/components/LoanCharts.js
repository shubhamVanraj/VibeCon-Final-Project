import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../lib/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

const CATEGORY_COLORS = {
  personal: '#059669', home: '#2563EB', car: '#D97706', bike: '#DC2626',
  education: '#7C3AED', refinance: '#0891B2', gold: '#CA8A04',
  used_vehicle: '#9333EA', plot: '#16A34A', mutual_funds: '#0284C7',
};

const CATEGORY_LABELS = {
  en: { personal: 'Personal', home: 'Home', car: 'Car', bike: 'Bike', education: 'Education', refinance: 'Refinance', gold: 'Gold', used_vehicle: 'Used Vehicle', plot: 'Plot', mutual_funds: 'Mutual Fund' },
  hi: { personal: 'पर्सनल', home: 'होम', car: 'कार', bike: 'बाइक', education: 'एजुकेशन', refinance: 'रीफाइनेंस', gold: 'गोल्ड', used_vehicle: 'सेकंड हैंड', plot: 'प्लॉट', mutual_funds: 'म्यू. फंड' },
};

export function LoanCharts() {
  const { language } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/loans/stats').then(({ data }) => setStats(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#059669]" /></div>;
  if (!stats) return null;

  const labels = CATEGORY_LABELS[language] || CATEGORY_LABELS.en;

  const pieData = Object.entries(stats.categories).map(([key, val]) => ({
    name: labels[key] || key,
    value: val.count,
    color: CATEGORY_COLORS[key] || '#6B7280',
  }));

  const barData = Object.entries(stats.categories)
    .map(([key, val]) => ({
      name: labels[key] || key,
      min: val.min_rate,
      avg: val.avg_rate,
      max: val.max_rate,
      fill: CATEGORY_COLORS[key] || '#6B7280',
    }))
    .sort((a, b) => a.avg - b.avg);

  const bankData = stats.top_banks.map(b => ({
    name: b.bank.length > 10 ? b.bank.substring(0, 10) + '.' : b.bank,
    fullName: b.bank,
    products: b.products,
    rate: b.avg_rate,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-black/5 px-3 py-2">
          <p className="font-heading font-bold text-xs text-[#0A0A0A]">{d.fullName || d.name}</p>
          {payload.map((p, i) => (
            <p key={i} className="font-body text-[11px] text-[#4B5563]">
              {p.name}: <span className="font-semibold text-[#0A0A0A]">{typeof p.value === 'number' ? p.value.toFixed ? p.value.toFixed(2) + '%' : p.value : p.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div data-testid="loan-charts-section">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Distribution Donut */}
        <div className="feature-card-shade rounded-2xl p-5" data-testid="chart-distribution">
          <h3 className="font-heading font-bold text-sm text-[#0A0A0A] mb-1">
            {language === 'hi' ? 'लोन श्रेणी वितरण' : 'Loan Category Distribution'}
          </h3>
          <p className="font-body text-[10px] text-[#9CA3AF] mb-3">
            {stats.total_products} {language === 'hi' ? 'उत्पाद' : 'products'}, {stats.total_banks} {language === 'hi' ? 'बैंक' : 'banks'}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontFamily: 'DM Sans' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Interest Rate Comparison */}
        <div className="feature-card-shade rounded-2xl p-5" data-testid="chart-rates">
          <h3 className="font-heading font-bold text-sm text-[#0A0A0A] mb-1">
            {language === 'hi' ? 'ब्याज दर तुलना' : 'Interest Rate Comparison'}
          </h3>
          <p className="font-body text-[10px] text-[#9CA3AF] mb-3">
            {language === 'hi' ? 'श्रेणी अनुसार औसत दर' : 'Average rate by category'}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} layout="vertical" margin={{ left: 5, right: 10, top: 0, bottom: 0 }}>
              <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 10, fontFamily: 'DM Sans' }} unit="%" />
              <YAxis type="category" dataKey="name" width={65} tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg" radius={[0, 6, 6, 0]} barSize={14}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bank Coverage Funnel */}
        <div className="feature-card-shade rounded-2xl p-5" data-testid="chart-banks">
          <h3 className="font-heading font-bold text-sm text-[#0A0A0A] mb-1">
            {language === 'hi' ? 'शीर्ष बैंक कवरेज' : 'Top Bank Coverage'}
          </h3>
          <p className="font-body text-[10px] text-[#9CA3AF] mb-3">
            {language === 'hi' ? 'उत्पाद संख्या और औसत दर' : 'Products count & avg rate'}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bankData} margin={{ left: 5, right: 10, top: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: 'DM Sans' }} interval={0} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="products" fill="#059669" radius={[6, 6, 0, 0]} barSize={20} name={language === 'hi' ? 'उत्पाद' : 'Products'} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
