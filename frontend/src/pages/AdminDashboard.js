import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import api, { formatCurrency } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import {
  Shield, LogOut, Users, FileText, TrendingUp, IndianRupee,
  ArrowUpRight, ArrowLeft, Loader2, CheckCircle, Clock, XCircle, Banknote
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const STATUS_COLORS = {
  interested: '#3B82F6',
  applied: '#F59E0B',
  approved: '#10B981',
  disbursed: '#8B5CF6',
  revoked: '#EF4444',
};

const PIE_COLORS = ['#059669', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#F97316'];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/analytics');
      setAnalytics(data);
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Admin access required');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const handleStatusUpdate = async (leadId, newStatus) => {
    try {
      await api.put(`/admin/leads/${leadId}`, { status: newStatus });
      toast.success(`Lead updated to ${newStatus}`);
      fetchAnalytics();
    } catch {
      toast.error('Failed to update lead');
    }
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9FB]">
        <Loader2 className="w-8 h-8 animate-spin text-[#059669]" />
      </div>
    );
  }

  if (!analytics) return null;

  const funnelData = [
    { name: 'Interested', value: analytics.leads_by_status?.interested || 0, fill: STATUS_COLORS.interested },
    { name: 'Applied', value: analytics.leads_by_status?.applied || 0, fill: STATUS_COLORS.applied },
    { name: 'Approved', value: analytics.leads_by_status?.approved || 0, fill: STATUS_COLORS.approved },
    { name: 'Disbursed', value: analytics.leads_by_status?.disbursed || 0, fill: STATUS_COLORS.disbursed },
    { name: 'Revoked', value: analytics.leads_by_status?.revoked || 0, fill: STATUS_COLORS.revoked },
  ];

  const bankData = (analytics.leads_by_bank || []).slice(0, 8);
  const cs = analytics.commission_summary || {};

  return (
    <div className="min-h-screen bg-[#F9F9FB]" data-testid="admin-dashboard">
      {/* Nav */}
      <nav className="glass-nav fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#059669]" strokeWidth={1.5} />
              <span className="font-heading font-bold text-lg text-[#0A0A0A]">Rinkosh</span>
            </div>
            <Badge className="bg-[#111827] text-white text-xs">Admin</Badge>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-[#4B5563] font-body text-sm" data-testid="back-to-dashboard">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[#4B5563] hover:text-red-500" data-testid="admin-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#0A0A0A] tracking-tight mb-8" data-testid="admin-title">
          {t.adminDashboard || 'Admin Analytics'}
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: t.totalUsers || 'Total Users', value: analytics.total_users, icon: Users, color: '#3B82F6' },
            { label: t.totalLeads || 'Total Leads', value: analytics.total_leads, icon: FileText, color: '#059669' },
            { label: t.disbursedLeads || 'Disbursed', value: cs.total_disbursed || 0, icon: CheckCircle, color: '#8B5CF6' },
            { label: t.estCommission || 'Est. Commission', value: formatCurrency(cs.estimated_commission || 0), icon: IndianRupee, color: '#F59E0B' },
          ].map((stat, i) => (
            <Card key={i} className="rounded-2xl border border-black/5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] loan-card" data-testid={`stat-card-${i}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-body text-xs text-[#9CA3AF] uppercase tracking-wider">{stat.label}</p>
                    <p className="font-heading text-2xl font-bold text-[#0A0A0A] mt-1">{stat.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} strokeWidth={1.5} />
                  </div>
                </div>
                {i === 3 && cs.conversion_rate > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#059669]" />
                    <span className="font-body text-xs text-[#059669]">{cs.conversion_rate}% conversion</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Lead Funnel */}
          <Card className="rounded-2xl border border-black/5 p-6" data-testid="lead-funnel-chart">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="font-heading text-lg">{t.leadFunnel || 'Lead Funnel'}</CardTitle>
            </CardHeader>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 12, fontFamily: 'Manrope' }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fontFamily: 'Manrope' }} />
                  <Tooltip contentStyle={{ fontFamily: 'Manrope', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {funnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Leads by Bank */}
          <Card className="rounded-2xl border border-black/5 p-6" data-testid="leads-by-bank-chart">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="font-heading text-lg">{t.leadsByBank || 'Leads by Bank'}</CardTitle>
            </CardHeader>
            <div className="h-[260px]">
              {bankData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bankData} dataKey="count" nameKey="bank_name" cx="50%" cy="50%"
                      outerRadius={90} innerRadius={50} paddingAngle={3} label={({ bank_name, count }) => `${bank_name}: ${count}`}
                      labelLine={false} fontSize={11} fontFamily="Manrope">
                      {bankData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontFamily: 'Manrope', borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[#9CA3AF] font-body text-sm">No lead data yet</div>
              )}
            </div>
          </Card>
        </div>

        {/* Commission Tracking */}
        <Card className="rounded-2xl border border-black/5 p-6 mb-8 bg-gradient-to-r from-white to-[#059669]/5" data-testid="commission-card">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#059669]/10 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-[#059669]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#0A0A0A]">{t.commissionTracking || 'Commission Tracking'}</h3>
                <p className="font-body text-sm text-[#4B5563]">Track revenue from successful loan disbursals (1% avg commission rate)</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="font-heading text-2xl font-bold text-[#059669]">{formatCurrency(cs.estimated_commission || 0)}</div>
                <div className="font-body text-xs text-[#9CA3AF]">Est. Revenue</div>
              </div>
              <div className="text-center">
                <div className="font-heading text-2xl font-bold text-[#0A0A0A]">{cs.conversion_rate || 0}%</div>
                <div className="font-body text-xs text-[#9CA3AF]">Conversion</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Leads Table */}
        <Card className="rounded-2xl border border-black/5 overflow-hidden" data-testid="recent-leads-table">
          <CardHeader className="p-6 pb-3">
            <CardTitle className="font-heading text-lg">{t.recentLeads || 'Recent Leads'}</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-black/5 bg-[#F9F9FB]">
                  <th className="text-left font-body text-xs text-[#9CA3AF] uppercase tracking-wider py-3 px-6">Lead ID</th>
                  <th className="text-left font-body text-xs text-[#9CA3AF] uppercase tracking-wider py-3 px-4">Bank</th>
                  <th className="text-left font-body text-xs text-[#9CA3AF] uppercase tracking-wider py-3 px-4">Product</th>
                  <th className="text-left font-body text-xs text-[#9CA3AF] uppercase tracking-wider py-3 px-4">Status</th>
                  <th className="text-left font-body text-xs text-[#9CA3AF] uppercase tracking-wider py-3 px-4">Date</th>
                  <th className="text-left font-body text-xs text-[#9CA3AF] uppercase tracking-wider py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {(analytics.recent_leads || []).map((lead) => (
                  <tr key={lead.lead_id} className="border-t border-black/5 hover:bg-[#F9F9FB]/50 transition-colors" data-testid={`admin-lead-${lead.lead_id}`}>
                    <td className="py-3 px-6 font-body text-xs text-[#4B5563]">{lead.lead_id}</td>
                    <td className="py-3 px-4 font-heading font-semibold text-sm text-[#0A0A0A]">{lead.bank_name}</td>
                    <td className="py-3 px-4 font-body text-sm text-[#4B5563]">{lead.product_name}</td>
                    <td className="py-3 px-4">
                      <Badge className="text-xs" style={{
                        backgroundColor: `${STATUS_COLORS[lead.status]}20`,
                        color: STATUS_COLORS[lead.status]
                      }}>{lead.status}</Badge>
                    </td>
                    <td className="py-3 px-4 font-body text-xs text-[#9CA3AF]">
                      {new Date(lead.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      {lead.status !== 'disbursed' && lead.status !== 'revoked' && (
                        <Select onValueChange={(v) => handleStatusUpdate(lead.lead_id, v)}>
                          <SelectTrigger className="h-8 w-[120px] rounded-lg text-xs font-body" data-testid={`status-select-${lead.lead_id}`}>
                            <SelectValue placeholder="Update" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="disbursed">Disbursed</SelectItem>
                            <SelectItem value="revoked">Revoked</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
                {(!analytics.recent_leads || analytics.recent_leads.length === 0) && (
                  <tr><td colSpan={6} className="py-12 text-center font-body text-[#9CA3AF]">No leads yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
