import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import api, { formatCurrency } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Building2, Users, TrendingUp, ArrowRight, Plus, MapPin, Target, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const FUNNEL_COLORS = { interested: '#3B82F6', applied: '#F59E0B', approved: '#059669', disbursed: '#7C3AED', revoked: '#DC2626' };

export default function BankDashboardPage() {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ product_name: '', loan_type: 'personal', interest_rate: '', processing_fee_pct: '1', max_amount: '', features: '' });

  useEffect(() => {
    api.get('/bank/dashboard').then(r => setData(r.data)).catch(() => toast.error('Failed to load dashboard')).finally(() => setLoading(false));
  }, []);

  const handleAddProduct = async () => {
    try {
      await api.post('/bank/products', {
        ...newProduct,
        interest_rate: parseFloat(newProduct.interest_rate),
        processing_fee_pct: parseFloat(newProduct.processing_fee_pct),
        max_amount: parseFloat(newProduct.max_amount),
        features: newProduct.features.split(',').map(s => s.trim()).filter(Boolean),
      });
      toast.success('Product added!');
      setAddingProduct(false);
      setNewProduct({ product_name: '', loan_type: 'personal', interest_rate: '', processing_fee_pct: '1', max_amount: '', features: '' });
      api.get('/bank/dashboard').then(r => setData(r.data));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add product');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#059669]" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center font-body text-[#4B5563]">Failed to load</div>;

  const funnelData = Object.entries(data.funnel).filter(([k]) => k !== 'revoked').map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v, fill: FUNNEL_COLORS[k] }));
  const regionData = Object.entries(data.region_breakdown).map(([k, v]) => ({ name: k, value: v }));
  const REGION_COLORS = ['#059669', '#3B82F6', '#F59E0B', '#7C3AED', '#DC2626', '#0891B2', '#CA8A04'];

  return (
    <div className="min-h-screen bg-[#F9F9FB]" data-testid="bank-dashboard-page">
      {/* Nav */}
      <nav className="glass-nav fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="https://static.prod-images.emergentagent.com/jobs/46236293-45eb-486f-8de9-3cfd3f7e2526/images/251ac3f41bd806cd53ef74f0a949d1a3be51ac19219729fbf89fb0dba4f12b85.png" alt="Rinkosh" className="w-8 h-8 object-contain" />
            <span className="font-heading font-bold text-lg text-[#0A0A0A]">Rinkosh</span>
            <Badge className="bg-[#059669]/10 text-[#059669] text-[10px] font-bold">{language === 'hi' ? 'बैंक पोर्टल' : 'Bank Portal'}</Badge>
          </a>
          <div className="flex items-center gap-3">
            <span className="font-body text-sm text-[#4B5563]">{data.bank_name}</span>
            <Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate('/'); }} className="text-[#4B5563]"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: language === 'hi' ? 'कुल लीड' : 'Total Leads', value: data.total_leads, icon: Users, color: '#3B82F6' },
            { label: language === 'hi' ? 'रूपांतरण दर' : 'Conversion Rate', value: `${data.conversion.overall}%`, icon: Target, color: '#059669' },
            { label: language === 'hi' ? 'औसत लोन राशि' : 'Avg Loan Amount', value: formatCurrency(data.avg_loan_amount), icon: TrendingUp, color: '#F59E0B' },
            { label: language === 'hi' ? 'उत्पाद' : 'Products', value: data.products_count, icon: Building2, color: '#7C3AED' },
          ].map((s, i) => (
            <Card key={i} className="rounded-2xl border border-black/5 p-5" data-testid={`stat-${i}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <div className="font-heading font-bold text-xl text-[#0A0A0A]">{s.value}</div>
                  <div className="font-body text-xs text-[#9CA3AF]">{s.label}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="funnel" className="space-y-6">
          <TabsList className="bg-white border border-black/5 rounded-full p-1">
            <TabsTrigger value="funnel" className="rounded-full font-body text-sm data-[state=active]:bg-[#059669] data-[state=active]:text-white">{language === 'hi' ? 'फ़नल' : 'Lead Funnel'}</TabsTrigger>
            <TabsTrigger value="leads" className="rounded-full font-body text-sm data-[state=active]:bg-[#059669] data-[state=active]:text-white">{language === 'hi' ? 'लीड्स' : 'Leads'}</TabsTrigger>
            <TabsTrigger value="applications" className="rounded-full font-body text-sm data-[state=active]:bg-[#059669] data-[state=active]:text-white">{language === 'hi' ? 'आवेदन' : 'Applications'}</TabsTrigger>
            <TabsTrigger value="products" className="rounded-full font-body text-sm data-[state=active]:bg-[#059669] data-[state=active]:text-white">{language === 'hi' ? 'उत्पाद' : 'Products'}</TabsTrigger>
          </TabsList>

          {/* Funnel Tab */}
          <TabsContent value="funnel">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-2xl border border-black/5 p-6" data-testid="funnel-chart">
                <h3 className="font-heading font-bold text-sm text-[#0A0A0A] mb-4">{language === 'hi' ? 'लीड फ़नल' : 'Lead Funnel'}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funnelData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                      {funnelData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Conversion rates */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: language === 'hi' ? 'रुचि → आवेदन' : 'Interest → Applied', value: data.conversion.interested_to_applied },
                    { label: language === 'hi' ? 'आवेदन → स्वीकृत' : 'Applied → Approved', value: data.conversion.applied_to_approved },
                    { label: language === 'hi' ? 'स्वीकृत → संवितरित' : 'Approved → Disbursed', value: data.conversion.approved_to_disbursed },
                  ].map((c, i) => (
                    <div key={i} className="bg-[#F3F4F6] rounded-xl p-3 text-center">
                      <div className="font-heading font-bold text-lg text-[#0A0A0A]">{c.value}%</div>
                      <div className="font-body text-[10px] text-[#9CA3AF]">{c.label}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="space-y-6">
                {/* Region Breakdown */}
                <Card className="rounded-2xl border border-black/5 p-6" data-testid="region-chart">
                  <h3 className="font-heading font-bold text-sm text-[#0A0A0A] mb-4">{language === 'hi' ? 'क्षेत्र वितरण' : 'Region Breakdown'}</h3>
                  {regionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={regionData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                          {regionData.map((_, i) => <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="font-body text-sm text-[#9CA3AF] text-center py-8">{language === 'hi' ? 'अभी कोई डेटा नहीं' : 'No data yet'}</p>
                  )}
                </Card>

                {/* Platform Comparison */}
                <Card className="rounded-2xl border border-black/5 p-6" data-testid="platform-comparison">
                  <h3 className="font-heading font-bold text-sm text-[#0A0A0A] mb-4">{language === 'hi' ? 'प्लेटफॉर्म तुलना' : 'Platform Comparison'}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-body text-xs text-[#4B5563]">{language === 'hi' ? 'आपकी रूपांतरण दर' : 'Your Conversion'}</span>
                      <span className="font-heading font-bold text-sm text-[#059669]">{data.conversion.overall}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-body text-xs text-[#4B5563]">{language === 'hi' ? 'प्लेटफॉर्म औसत' : 'Platform Average'}</span>
                      <span className="font-heading font-bold text-sm text-[#4B5563]">{data.platform_comparison.conversion_rate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-body text-xs text-[#4B5563]">{language === 'hi' ? 'कुल प्लेटफॉर्म लीड' : 'Total Platform Leads'}</span>
                      <span className="font-heading font-bold text-sm text-[#4B5563]">{data.platform_comparison.total_leads}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-body text-xs text-[#4B5563]">{language === 'hi' ? 'सक्रिय बैंक' : 'Active Banks'}</span>
                      <span className="font-heading font-bold text-sm text-[#4B5563]">{data.platform_comparison.total_banks}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <Card className="rounded-2xl border border-black/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F3F4F6]">
                    <tr>
                      <th className="text-left px-4 py-3 font-body text-xs text-[#4B5563] font-medium">{language === 'hi' ? 'लीड ID' : 'Lead ID'}</th>
                      <th className="text-left px-4 py-3 font-body text-xs text-[#4B5563] font-medium">{language === 'hi' ? 'उत्पाद' : 'Product'}</th>
                      <th className="text-left px-4 py-3 font-body text-xs text-[#4B5563] font-medium">{language === 'hi' ? 'स्थिति' : 'Status'}</th>
                      <th className="text-left px-4 py-3 font-body text-xs text-[#4B5563] font-medium">{language === 'hi' ? 'तिथि' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_leads.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 font-body text-sm text-[#9CA3AF]">{language === 'hi' ? 'अभी कोई लीड नहीं' : 'No leads yet'}</td></tr>
                    )}
                    {data.recent_leads.map((lead) => (
                      <tr key={lead.lead_id} className="border-t border-black/5 hover:bg-[#F9F9FB]">
                        <td className="px-4 py-3 font-body text-xs text-[#0A0A0A]">{lead.lead_id?.slice(-8)}</td>
                        <td className="px-4 py-3 font-body text-xs text-[#4B5563]">{lead.product_name}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[10px] rounded-full ${lead.status === 'disbursed' ? 'bg-[#059669]/10 text-[#059669]' : lead.status === 'approved' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : lead.status === 'revoked' ? 'bg-[#DC2626]/10 text-[#DC2626]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`}>
                            {lead.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-body text-xs text-[#9CA3AF]">{lead.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card className="rounded-2xl border border-black/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F3F4F6]">
                    <tr>
                      <th className="text-left px-4 py-3 font-body text-xs text-[#4B5563] font-medium">{language === 'hi' ? 'आवेदन ID' : 'App ID'}</th>
                      <th className="text-left px-4 py-3 font-body text-xs text-[#4B5563] font-medium">{language === 'hi' ? 'नाम' : 'Name'}</th>
                      <th className="text-left px-4 py-3 font-body text-xs text-[#4B5563] font-medium">{language === 'hi' ? 'फोन' : 'Phone'}</th>
                      <th className="text-left px-4 py-3 font-body text-xs text-[#4B5563] font-medium">{language === 'hi' ? 'राशि' : 'Amount'}</th>
                      <th className="text-left px-4 py-3 font-body text-xs text-[#4B5563] font-medium">{language === 'hi' ? 'उद्देश्य' : 'Purpose'}</th>
                      <th className="text-left px-4 py-3 font-body text-xs text-[#4B5563] font-medium">{language === 'hi' ? 'स्थिति' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data.applications || data.applications.length === 0) && (
                      <tr><td colSpan={6} className="text-center py-8 font-body text-sm text-[#9CA3AF]">{language === 'hi' ? 'अभी कोई आवेदन नहीं' : 'No applications yet'}</td></tr>
                    )}
                    {(data.applications || []).map((app) => (
                      <tr key={app.application_id} className="border-t border-black/5 hover:bg-[#F9F9FB]">
                        <td className="px-4 py-3 font-body text-xs text-[#0A0A0A]">{app.application_id?.slice(-8)}</td>
                        <td className="px-4 py-3 font-body text-xs text-[#0A0A0A] font-medium">{app.full_name}</td>
                        <td className="px-4 py-3 font-body text-xs text-[#4B5563]">{app.phone}</td>
                        <td className="px-4 py-3 font-body text-xs text-[#0A0A0A] font-medium">{app.loan_amount_requested ? formatCurrency(app.loan_amount_requested) : '—'}</td>
                        <td className="px-4 py-3 font-body text-xs text-[#4B5563]">{app.loan_purpose || '—'}</td>
                        <td className="px-4 py-3"><Badge className="text-[10px] rounded-full bg-[#3B82F6]/10 text-[#3B82F6]">{app.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading font-bold text-sm text-[#0A0A0A]">{language === 'hi' ? 'आपके लोन उत्पाद' : 'Your Loan Products'}</h3>
              <Button size="sm" onClick={() => setAddingProduct(!addingProduct)} className="bg-[#059669] hover:bg-[#047857] text-white rounded-full px-4 text-xs font-body" data-testid="add-product-btn">
                <Plus className="w-3 h-3 mr-1" />{language === 'hi' ? 'उत्पाद जोड़ें' : 'Add Product'}
              </Button>
            </div>
            {addingProduct && (
              <Card className="rounded-2xl border border-[#059669]/20 p-5 mb-4 bg-[#059669]/5" data-testid="add-product-form">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <div>
                    <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'उत्पाद नाम' : 'Product Name'}</Label>
                    <Input value={newProduct.product_name} onChange={e => setNewProduct(p => ({...p, product_name: e.target.value}))} placeholder="e.g. Personal Loan" className="mt-1 rounded-lg text-sm h-9" />
                  </div>
                  <div>
                    <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'लोन प्रकार' : 'Loan Type'}</Label>
                    <select value={newProduct.loan_type} onChange={e => setNewProduct(p => ({...p, loan_type: e.target.value}))} className="mt-1 w-full h-9 rounded-lg border border-[#E5E7EB] text-sm px-3 font-body">
                      {['personal','home','car','business','msme','gold','education','lap','working_capital','plot','bike','used_vehicle','mutual_funds','refinance'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'ब्याज दर (%)' : 'Interest Rate (%)'}</Label>
                    <Input type="number" step="0.1" value={newProduct.interest_rate} onChange={e => setNewProduct(p => ({...p, interest_rate: e.target.value}))} placeholder="10.5" className="mt-1 rounded-lg text-sm h-9" />
                  </div>
                  <div>
                    <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'प्रोसेसिंग फीस (%)' : 'Processing Fee (%)'}</Label>
                    <Input type="number" step="0.1" value={newProduct.processing_fee_pct} onChange={e => setNewProduct(p => ({...p, processing_fee_pct: e.target.value}))} className="mt-1 rounded-lg text-sm h-9" />
                  </div>
                  <div>
                    <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'अधिकतम राशि' : 'Max Amount'}</Label>
                    <Input type="number" value={newProduct.max_amount} onChange={e => setNewProduct(p => ({...p, max_amount: e.target.value}))} placeholder="5000000" className="mt-1 rounded-lg text-sm h-9" />
                  </div>
                  <div>
                    <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'विशेषताएं (कॉमा)' : 'Features (comma)'}</Label>
                    <Input value={newProduct.features} onChange={e => setNewProduct(p => ({...p, features: e.target.value}))} placeholder="Quick approval, Low rate" className="mt-1 rounded-lg text-sm h-9" />
                  </div>
                </div>
                <Button size="sm" onClick={handleAddProduct} className="bg-[#059669] hover:bg-[#047857] text-white rounded-full px-5 text-xs font-body" data-testid="save-product-btn">
                  {language === 'hi' ? 'सहेजें' : 'Save Product'}
                </Button>
              </Card>
            )}
            <p className="font-body text-xs text-[#9CA3AF]">{data.products_count} {language === 'hi' ? 'सक्रिय उत्पाद' : 'active products'}</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
