import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { ThemeToggle, SoundToggle } from '../components/ThemeToggle';
import api, { formatCurrency } from '../lib/api';
import { usePageView, useAnalytics } from '../lib/analytics';
import { BankLogo } from '../lib/bankLogos';
import { EmiCalculator } from '../components/EmiCalculator';
import { ProfileEditor } from '../components/ProfileEditor';
import { LoanComparison } from '../components/LoanComparison';
import { CreditScoreChecker } from '../components/CreditScoreChecker';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { Checkbox } from '../components/ui/checkbox';
import {
  Shield, LogOut, Send, Mic, MicOff, TrendingDown,
  ArrowRight, Ban, CreditCard, Target, Lightbulb, CheckCircle,
  XCircle, Sparkles, ChevronRight, Loader2, Settings, Scale, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  interested: 'bg-blue-100 text-blue-700',
  applied: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  disbursed: 'bg-purple-100 text-purple-700',
  revoked: 'bg-red-100 text-red-700',
};

const impactColors = {
  high: 'bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/10 text-[#059669]',
  medium: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  low: 'bg-[#6B7280]/10 text-[#64748B] dark:text-[#94A3B8]',
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  usePageView('dashboard');
  const { track } = useAnalytics();

  const [recommendations, setRecommendations] = useState([]);
  const [leads, setLeads] = useState([]);
  const [creditSuggestions, setCreditSuggestions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recommendations');

  // AI Chat
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [appFormLead, setAppFormLead] = useState(null);
  const [appForm, setAppForm] = useState({ full_name: '', phone: '', monthly_income: '', loan_amount_requested: '', loan_purpose: '', residence_type: 'owned', years_at_current_job: '' });
  const [appLoading, setAppLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const chatEndRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      // Check if user has completed onboarding first
      const recsRes = await api.get('/loans/recommendations');
      const [leadsRes, creditRes] = await Promise.all([
        api.get('/leads').catch(() => ({ data: [] })),
        api.get('/credit-builder/suggestions').catch(() => ({ data: [] })),
      ]);
      setRecommendations(recsRes.data);
      setLeads(leadsRes.data);
      setCreditSuggestions(creditRes.data);
    } catch (err) {
      if (err.response?.status === 400) {
        navigate('/onboarding');
        return;
      }
    } finally {
      setDataLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleInterested = async (rec) => {
    try {
      await api.post('/leads', {
        product_id: rec.product_id,
        bank_name: rec.bank_name,
        product_name: rec.product_name,
      });
      toast.success(`Interest registered with ${rec.bank_name}`);
      track('lead_interest', { bank: rec.bank_name, product: rec.product_name });
      const { data } = await api.get('/leads');
      setLeads(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Already expressed interest');
    }
  };

  const handleRevoke = async (leadId) => {
    try {
      await api.put(`/leads/${leadId}`, { status: 'revoked' });
      toast.success('Access revoked');
      const { data } = await api.get('/leads');
      setLeads(data);
    } catch {
      toast.error('Failed to revoke');
    }
  };

  const handleAiSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);
    try {
      const { data } = await api.post('/ai/suggest', { message: userMsg, language });
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I could not process that. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');
        try {
          const { data } = await api.post('/ai/voice', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setChatInput(data.text || '');
        } catch {
          toast.error('Voice transcription failed');
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleCompare = (rec) => {
    setCompareList(prev => {
      const exists = prev.find(r => r.product_id === rec.product_id);
      if (exists) return prev.filter(r => r.product_id !== rec.product_id);
      if (prev.length >= 4) return prev;
      return [...prev, rec];
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5] dark:bg-[#0B121C]">
        <Loader2 className="w-8 h-8 animate-spin text-[#059669]" />
      </div>
    );
  }

  const leadProductIds = new Set(leads.filter(l => l.status !== 'revoked').map(l => l.product_id));

  return (
    <div className="min-h-screen bg-[#FFFBF5] dark:bg-[#050810]" data-testid="dashboard-page">
      {/* Nav */}
      <nav className="glass-nav fixed top-0 w-full z-50" data-testid="dashboard-navbar">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2.5 cursor-pointer" data-testid="logo-home-link">
            <img src="https://static.prod-images.emergentagent.com/jobs/46236293-45eb-486f-8de9-3cfd3f7e2526/images/251ac3f41bd806cd53ef74f0a949d1a3be51ac19219729fbf89fb0dba4f12b85.png" alt="Rinkosh" className="w-7 h-7 object-contain" />
            <span className="font-heading font-bold text-lg text-[#0A1118] dark:text-[#FFFBF5] tracking-tight">Rinkosh</span>
          </a>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <SoundToggle />
            <Separator orientation="vertical" className="h-6" />
            {user?.role === 'admin' && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="text-[#334155] dark:text-[#CBD5E1] hover:text-[#059669] font-body text-xs" data-testid="admin-link">Admin</Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setProfileOpen(true)} className="text-[#334155] dark:text-[#CBD5E1] hover:text-[#059669]" data-testid="edit-profile-button">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)} className="text-[#94A3B8] dark:text-[#64748B] hover:text-red-500 hidden md:flex" data-testid="delete-account-nav" title={language === 'hi' ? 'खाता हटाएं' : 'Delete Account'}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <span className="font-body text-sm text-[#334155] dark:text-[#CBD5E1] hidden md:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[#334155] dark:text-[#CBD5E1] hover:text-red-500" data-testid="logout-button">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Welcome */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#0A1118] dark:text-[#FFFBF5] tracking-tight">
              {t.welcome}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="font-body text-[#334155] dark:text-[#CBD5E1] mt-1">
              {recommendations.length} {t.recommendations.toLowerCase()} {t.found}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/onboarding')}
            className="rounded-full font-body text-sm border-[#E5E7EB] dark:border-[#1F2A3D] hover:border-[#059669] hover:text-[#059669] px-5"
            data-testid="change-preferences-btn"
          >
            <Settings className="w-4 h-4 mr-2" />
            {language === 'hi' ? 'प्राथमिकताएं बदलें' : 'Change Preferences'}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white dark:bg-[#0B121C] border border-black/5 rounded-full p-1 h-auto flex-wrap" data-testid="dashboard-tabs">
            <TabsTrigger value="recommendations" className="rounded-full font-body data-[state=active]:bg-[#0A1118] dark:bg-[#FFB347] dark:text-[#0A1118] data-[state=active]:text-white px-4 py-2 text-sm" data-testid="tab-recommendations">{t.recommendations}</TabsTrigger>
            <TabsTrigger value="leads" className="rounded-full font-body data-[state=active]:bg-[#0A1118] dark:bg-[#FFB347] dark:text-[#0A1118] data-[state=active]:text-white px-4 py-2 text-sm" data-testid="tab-leads">{t.myLeads} {leads.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{leads.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="credit" className="rounded-full font-body data-[state=active]:bg-[#0A1118] dark:bg-[#FFB347] dark:text-[#0A1118] data-[state=active]:text-white px-4 py-2 text-sm" data-testid="tab-credit">{t.creditBuilder}</TabsTrigger>
            <TabsTrigger value="ai" className="rounded-full font-body data-[state=active]:bg-[#0A1118] dark:bg-[#FFB347] dark:text-[#0A1118] data-[state=active]:text-white px-4 py-2 text-sm" data-testid="tab-ai">{t.aiAdvisor}</TabsTrigger>
            <TabsTrigger value="tools" className="rounded-full font-body data-[state=active]:bg-[#0A1118] dark:bg-[#FFB347] dark:text-[#0A1118] data-[state=active]:text-white px-4 py-2 text-sm" data-testid="tab-tools">{t.emiCalcTitle || 'EMI Calculator'}</TabsTrigger>
          </TabsList>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4" data-testid="recommendations-content">
            {recommendations.length === 0 ? (
              <Card className="rounded-2xl border border-black/5 p-12 text-center">
                <p className="font-body text-[#334155] dark:text-[#CBD5E1]">
                  {user?.has_profile
                    ? (language === 'hi' ? 'इस लोन प्रकार के लिए अभी कोई मिलान नहीं मिला। अपनी प्रोफाइल अपडेट करें या अन्य विकल्प देखें।' : 'No matching loans found for your profile. Try updating your preferences or explore other options.')
                    : t.completeProfile}
                </p>
                <Button onClick={() => navigate(user?.has_profile ? '/onboarding' : '/onboarding')} className="mt-4 rounded-full bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] hover:bg-[#059669] dark:hover:bg-[#10B981] text-white font-body" data-testid="go-onboarding-btn">
                  {user?.has_profile
                    ? (language === 'hi' ? 'प्रोफाइल अपडेट करें' : 'Update Preferences')
                    : t.completeProfileBtn} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {recommendations.map((rec, idx) => (
                  <Card key={rec.product_id} className="rounded-2xl card-premium loan-card overflow-hidden" data-testid={`rec-card-${rec.product_id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={compareList.some(r => r.product_id === rec.product_id)}
                            onCheckedChange={() => toggleCompare(rec)}
                            className="mt-1 border-[#E5E7EB] dark:border-[#1F2A3D] data-[state=checked]:bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] data-[state=checked]:border-[#059669]"
                            data-testid={`compare-check-${rec.product_id}`}
                          />
                          <BankLogo bankName={rec.bank_name} />
                          <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading font-bold text-[#0A1118] dark:text-[#FFFBF5]">{rec.bank_name}</h3>
                            {idx === 0 && <Badge className="bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] text-white text-xs">{t.best}</Badge>}
                          </div>
                          <p className="font-body text-sm text-[#334155] dark:text-[#CBD5E1]">{rec.product_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-heading text-2xl font-bold text-[#059669]">{rec.interest_rate}%</div>
                          <span className="font-body text-xs text-[#94A3B8] dark:text-[#64748B]">{t.interestRate}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-[#FFFBF5] dark:bg-[#0B121C] rounded-xl p-3 text-center">
                          <div className="font-heading font-bold text-[#0A1118] dark:text-[#FFFBF5] text-sm">{formatCurrency(rec.emi)}</div>
                          <div className="font-body text-xs text-[#94A3B8] dark:text-[#64748B]">{t.emi}</div>
                        </div>
                        <div className="bg-[#FFFBF5] dark:bg-[#0B121C] rounded-xl p-3 text-center">
                          <div className="font-heading font-bold text-[#0A1118] dark:text-[#FFFBF5] text-sm">{formatCurrency(rec.processing_fee)}</div>
                          <div className="font-body text-xs text-[#94A3B8] dark:text-[#64748B]">{t.processingFee}</div>
                        </div>
                        <div className="bg-[#FFFBF5] dark:bg-[#0B121C] rounded-xl p-3 text-center">
                          <div className="font-heading font-bold text-[#0A1118] dark:text-[#FFFBF5] text-sm">{formatCurrency(rec.total_cost)}</div>
                          <div className="font-body text-xs text-[#94A3B8] dark:text-[#64748B]">{t.totalCost}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                          <span className="font-body text-sm text-[#334155] dark:text-[#CBD5E1]">{t.approvalChance}</span>
                        </div>
                        <span className={`font-heading font-bold text-sm ${rec.approval_probability >= 70 ? 'text-[#059669]' : rec.approval_probability >= 40 ? 'text-[#D97706]' : 'text-[#DC2626]'}`}>{rec.approval_probability}%</span>
                      </div>
                      <Progress value={rec.approval_probability} className="h-1.5 bg-[#E5E7EB] mb-2" />
                      {rec.approval_reasons && rec.approval_reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {rec.approval_reasons.map((r, ri) => (
                            <span key={ri} className={`font-body text-[10px] px-2 py-0.5 rounded-full ${r.includes('tie-up') ? 'bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/15 text-[#059669] font-semibold' : 'bg-[#F3F4F6] dark:bg-[#141C2A] text-[#334155] dark:text-[#CBD5E1]'}`}>{r}</span>
                          ))}
                        </div>
                      )}
                      {rec.corporate_tieups && rec.corporate_tieups.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {rec.corporate_tieups.map((t, ti) => (
                            <span key={ti} className="font-body text-[9px] bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/10 text-[#059669] rounded-full px-2 py-0.5 font-bold uppercase">{t}</span>
                          ))}
                        </div>
                      )}

                      {rec.savings > 0 && (
                        <div className="flex items-center gap-2 bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/5 rounded-lg p-2.5 mb-3">
                          <TrendingDown className="w-4 h-4 text-[#059669] flex-shrink-0" strokeWidth={1.5} />
                          <span className="font-body text-sm text-[#059669] font-medium">
                            {t.save} {formatCurrency(rec.savings)} {t.over} {rec.desired_tenure_months >= 12 ? `${Math.round(rec.desired_tenure_months / 12)} ${t.years}` : `${rec.desired_tenure_months} ${t.months}`} {t.vsWorst}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {rec.features?.map((f, i) => (
                          <span key={i} className="font-body text-xs bg-[#F3F4F6] dark:bg-[#141C2A] text-[#334155] dark:text-[#CBD5E1] px-2 py-0.5 rounded-full">{f}</span>
                        ))}
                        {rec.foreclosure_charge_pct === 0 && (
                          <span className="font-body text-xs bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/10 text-[#059669] px-2 py-0.5 rounded-full">No foreclosure</span>
                        )}
                      </div>

                      <Button
                        onClick={() => handleInterested(rec)}
                        disabled={leadProductIds.has(rec.product_id)}
                        className={`w-full rounded-full font-body font-semibold h-10 transition-all ${
                          leadProductIds.has(rec.product_id)
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] hover:bg-[#059669] dark:hover:bg-[#10B981] text-white btn-glow'
                        }`}
                        data-testid={`interested-btn-${rec.product_id}`}
                      >
                        {leadProductIds.has(rec.product_id) ? (
                          <><CheckCircle className="w-4 h-4 mr-2" /> {t.interestRegistered}</>
                        ) : (
                          <>{t.interested} <ChevronRight className="w-4 h-4 ml-1" /></>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Floating Compare Bar */}
            {compareList.length >= 2 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
                <Button
                  onClick={() => setCompareOpen(true)}
                  className="bg-[#0A1118] dark:bg-[#FFB347] dark:text-[#0A1118] hover:bg-[#000000] text-white rounded-full px-8 py-3 font-body font-semibold shadow-2xl h-12"
                  data-testid="open-compare-button"
                >
                  <Scale className="w-4 h-4 mr-2" />
                  Compare ({compareList.length})
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-4" data-testid="leads-content">
            {leads.length === 0 ? (
              <Card className="rounded-2xl border border-black/5 p-12 text-center">
                <Ban className="w-10 h-10 text-[#94A3B8] dark:text-[#64748B] mx-auto mb-4" />
                <p className="font-body text-[#334155] dark:text-[#CBD5E1]">{t.noLeadsExpress}</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <Card key={lead.lead_id} className="rounded-2xl border border-black/5 p-5" data-testid={`lead-${lead.lead_id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-heading font-semibold text-[#0A1118] dark:text-[#FFFBF5]">{lead.bank_name}</h3>
                          <Badge className={`text-xs ${statusColors[lead.status] || ''}`}>{lead.status}</Badge>
                        </div>
                        <p className="font-body text-sm text-[#334155] dark:text-[#CBD5E1] mt-0.5">{lead.product_name}</p>
                        <p className="font-body text-xs text-[#94A3B8] dark:text-[#64748B] mt-1">
                          Lead ID: {lead.lead_id} | {new Date(lead.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      {lead.status !== 'revoked' && (
                        <div className="flex gap-2">
                          {lead.status === 'interested' && (
                            <Button
                              size="sm"
                              onClick={() => { setAppFormLead(lead); setAppForm(f => ({ ...f, full_name: user?.name || '' })); }}
                              className="rounded-full bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] hover:bg-[#059669] dark:hover:bg-[#10B981] text-white font-body text-xs px-4"
                              data-testid={`apply-digital-${lead.lead_id}`}
                            >
                              <ArrowRight className="w-3.5 h-3.5 mr-1" />{language === 'hi' ? 'डिजिटल आवेदन' : 'Apply Digitally'}
                            </Button>
                          )}
                          <Button
                            variant="outline" size="sm"
                            onClick={() => handleRevoke(lead.lead_id)}
                            className="rounded-full text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300 font-body text-xs"
                            data-testid={`revoke-btn-${lead.lead_id}`}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> {t.revoke}
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Credit Builder Tab */}
          <TabsContent value="credit" className="space-y-4" data-testid="credit-content">
            <CreditScoreChecker />
            <div className="grid gap-4 md:grid-cols-2">
              {creditSuggestions.map((s) => (
                <Card key={s.id} className="rounded-2xl border border-black/5 p-6 loan-card" data-testid={`credit-${s.id}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/10 flex items-center justify-center flex-shrink-0">
                      {s.category === 'credit_card' ? <CreditCard className="w-5 h-5 text-[#059669]" strokeWidth={1.5} /> :
                       s.category === 'habit' ? <Target className="w-5 h-5 text-[#059669]" strokeWidth={1.5} /> :
                       s.category === 'loan' ? <TrendingDown className="w-5 h-5 text-[#059669]" strokeWidth={1.5} /> :
                       <Lightbulb className="w-5 h-5 text-[#059669]" strokeWidth={1.5} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-[#0A1118] dark:text-[#FFFBF5] text-sm">{s.title}</h3>
                      </div>
                      <p className="font-body text-sm text-[#334155] dark:text-[#CBD5E1] leading-relaxed">{s.description}</p>
                      <div className="flex gap-2 mt-3">
                        <Badge className={`text-xs ${impactColors[s.impact] || ''}`}>{s.impact} impact</Badge>
                        <Badge variant="outline" className="text-xs">{s.difficulty}</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* AI Advisor Tab */}
          <TabsContent value="ai" className="space-y-4" data-testid="ai-content">
            <Card className="rounded-2xl border border-black/5 overflow-hidden">
              <div className="bg-white dark:bg-[#0B121C] p-4 border-b border-black/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118]/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#059669]" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-[#0A1118] dark:text-[#FFFBF5]">{t.aiAdvisor}</h3>
                  <p className="font-body text-xs text-[#94A3B8] dark:text-[#64748B]">Powered by Claude AI | {language === 'hi' ? 'हिंदी' : 'English'}</p>
                </div>
              </div>

              <div className="h-[400px] overflow-y-auto custom-scroll p-4 space-y-3 bg-[#FFFBF5] dark:bg-[#0B121C]" data-testid="ai-messages">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Sparkles className="w-8 h-8 text-[#059669]/30 mx-auto mb-3" />
                    <p className="font-body text-sm text-[#94A3B8] dark:text-[#64748B]">
                      {language === 'hi' ? 'कोई भी सवाल पूछें...' : t.askAnything}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {[t.aiQ1, t.aiQ2, t.aiQ3].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setChatInput(q); }}
                          className="font-body text-xs bg-white dark:bg-[#0B121C] border border-black/5 rounded-full px-3 py-1.5 text-[#334155] dark:text-[#CBD5E1] hover:border-[#059669] transition-colors"
                          data-testid={`suggestion-${q.split(' ').slice(0,3).join('-').toLowerCase()}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} message-enter`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-[#0A1118] dark:bg-[#FFB347] dark:text-[#0A1118] text-white'
                        : 'bg-white dark:bg-[#0B121C] border border-black/5 text-[#0A1118] dark:text-[#FFFBF5]'
                    }`}>
                      <p className="font-body text-sm whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-[#0B121C] border border-black/5 rounded-2xl px-4 py-3 ai-shimmer">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] animate-bounce" style={{animationDelay: '0ms'}} />
                        <div className="w-2 h-2 rounded-full bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] animate-bounce" style={{animationDelay: '150ms'}} />
                        <div className="w-2 h-2 rounded-full bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] animate-bounce" style={{animationDelay: '300ms'}} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-white dark:bg-[#0B121C] border-t border-black/5">
                <div className="flex gap-2">
                  <Button
                    type="button" variant="outline" size="icon"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`rounded-full flex-shrink-0 ${isRecording ? 'bg-red-50 border-red-200 text-red-500 recording-pulse' : 'border-[#E5E7EB] dark:border-[#1F2A3D]'}`}
                    data-testid="voice-button"
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAiSend()}
                    placeholder={t.typeQuestion}
                    className="rounded-full bg-[#FFFBF5] dark:bg-[#0B121C] border-[#E5E7EB] dark:border-[#1F2A3D] focus:border-[#059669] focus:ring-[#059669]"
                    lang={language === 'hi' ? 'hi' : 'en'}
                    data-testid="ai-chat-input"
                  />
                  <Button
                    onClick={handleAiSend}
                    disabled={!chatInput.trim() || chatLoading}
                    className="rounded-full bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] hover:bg-[#059669] dark:hover:bg-[#10B981] text-white flex-shrink-0"
                    data-testid="ai-send-button"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* EMI Calculator Tab */}
          <TabsContent value="tools" className="space-y-4" data-testid="tools-content">
            <EmiCalculator />
          </TabsContent>
        </Tabs>
      </main>

      {/* Profile Editor Sheet */}
      <ProfileEditor open={profileOpen} onOpenChange={setProfileOpen} onSaved={fetchData} />

      {/* Loan Comparison Dialog */}
      <LoanComparison open={compareOpen} onOpenChange={setCompareOpen} loans={compareList} />

      {/* Digital Application Form Dialog */}
      {appFormLead && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => setAppFormLead(null)}>
          <div className="bg-white dark:bg-[#0B121C] w-full max-w-lg rounded-2xl overflow-y-auto max-h-[85vh]" onClick={e => e.stopPropagation()} data-testid="application-form-dialog">
            <div className="sticky top-0 bg-white dark:bg-[#0B121C] border-b border-black/5 px-6 py-4">
              <h3 className="font-heading font-bold text-lg text-[#0A1118] dark:text-[#FFFBF5]">{language === 'hi' ? 'डिजिटल लोन आवेदन' : 'Digital Loan Application'}</h3>
              <p className="font-body text-xs text-[#94A3B8] dark:text-[#64748B]">{appFormLead.bank_name} — {appFormLead.product_name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'पूरा नाम' : 'Full Name'}</Label>
                <Input value={appForm.full_name} onChange={e => setAppForm(f => ({...f, full_name: e.target.value}))} className="mt-1 rounded-xl" data-testid="app-name" />
              </div>
              <div>
                <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'फोन नंबर' : 'Phone Number'}</Label>
                <Input value={appForm.phone} onChange={e => setAppForm(f => ({...f, phone: e.target.value}))} placeholder="9876543210" className="mt-1 rounded-xl" data-testid="app-phone" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'मासिक आय' : 'Monthly Income'}</Label>
                  <Input type="number" value={appForm.monthly_income} onChange={e => setAppForm(f => ({...f, monthly_income: e.target.value}))} className="mt-1 rounded-xl" data-testid="app-income" />
                </div>
                <div>
                  <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'लोन राशि' : 'Loan Amount'}</Label>
                  <Input type="number" value={appForm.loan_amount_requested} onChange={e => setAppForm(f => ({...f, loan_amount_requested: e.target.value}))} className="mt-1 rounded-xl" data-testid="app-amount" />
                </div>
              </div>
              <div>
                <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'लोन उद्देश्य' : 'Loan Purpose'}</Label>
                <Input value={appForm.loan_purpose} onChange={e => setAppForm(f => ({...f, loan_purpose: e.target.value}))} placeholder={language === 'hi' ? 'जैसे घर नवीनीकरण' : 'e.g. Home renovation'} className="mt-1 rounded-xl" data-testid="app-purpose" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'निवास प्रकार' : 'Residence'}</Label>
                  <select value={appForm.residence_type} onChange={e => setAppForm(f => ({...f, residence_type: e.target.value}))} className="mt-1 w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#1F2A3D] text-sm px-3 font-body" data-testid="app-residence">
                    <option value="owned">{language === 'hi' ? 'स्वामित्व' : 'Owned'}</option>
                    <option value="rented">{language === 'hi' ? 'किराए पर' : 'Rented'}</option>
                    <option value="family">{language === 'hi' ? 'परिवार' : 'Family'}</option>
                  </select>
                </div>
                <div>
                  <Label className="font-body text-xs font-semibold">{language === 'hi' ? 'वर्तमान नौकरी (वर्ष)' : 'Years at Job'}</Label>
                  <Input type="number" value={appForm.years_at_current_job} onChange={e => setAppForm(f => ({...f, years_at_current_job: e.target.value}))} className="mt-1 rounded-xl" data-testid="app-years" />
                </div>
              </div>
              <Button
                className="w-full rounded-full bg-[#10B981] dark:bg-[#34D399] dark:text-[#0A1118] hover:bg-[#059669] dark:hover:bg-[#10B981] text-white font-body font-semibold h-11 mt-2"
                disabled={appLoading || !appForm.full_name || !appForm.phone}
                onClick={async () => {
                  setAppLoading(true);
                  try {
                    await api.post('/applications', {
                      lead_id: appFormLead.lead_id,
                      full_name: appForm.full_name,
                      phone: appForm.phone,
                      monthly_income: parseFloat(appForm.monthly_income) || null,
                      loan_amount_requested: parseFloat(appForm.loan_amount_requested) || null,
                      loan_purpose: appForm.loan_purpose || null,
                      residence_type: appForm.residence_type,
                      years_at_current_job: parseInt(appForm.years_at_current_job) || null,
                    });
                    toast.success(language === 'hi' ? 'आवेदन सफलतापूर्वक जमा!' : 'Application submitted successfully!');
                    setAppFormLead(null);
                    fetchData();
                  } catch (err) {
                    toast.error(err.response?.data?.detail || 'Failed');
                  } finally { setAppLoading(false); }
                }}
                data-testid="submit-application-btn"
              >
                {appLoading ? '...' : (language === 'hi' ? 'आवेदन जमा करें' : 'Submit Application')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(false)}>
          <div className="bg-white dark:bg-[#0B121C] w-full max-w-md rounded-2xl p-8" onClick={e => e.stopPropagation()} data-testid="delete-account-dialog">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-heading font-bold text-xl text-[#0A1118] dark:text-[#FFFBF5] text-center mb-2">
              {language === 'hi' ? 'खाता हटाएं?' : 'Delete Your Account?'}
            </h3>
            <p className="font-body text-sm text-[#334155] dark:text-[#CBD5E1] text-center mb-6 leading-relaxed">
              {language === 'hi'
                ? 'यह कार्रवाई अपरिवर्तनीय है। आपका सभी डेटा — प्रोफाइल, लीड, आवेदन, और एनालिटिक्स — स्थायी रूप से हटा दिया जाएगा। DPDP Act 2023 के अनुसार, इसे पूर्ववत नहीं किया जा सकता।'
                : 'This action is irreversible. All your data — profile, leads, applications, and analytics — will be permanently deleted. As per DPDP Act 2023, this cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(false)} className="flex-1 rounded-full font-body" data-testid="cancel-delete-btn">
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </Button>
              <Button
                onClick={async () => {
                  setDeleteLoading(true);
                  try {
                    await api.delete('/auth/delete-account');
                    toast.success(language === 'hi' ? 'खाता सफलतापूर्वक हटाया गया' : 'Account deleted successfully');
                    window.location.href = '/';
                  } catch (err) {
                    toast.error(err.response?.data?.detail || 'Failed to delete');
                  } finally { setDeleteLoading(false); }
                }}
                disabled={deleteLoading}
                className="flex-1 rounded-full bg-red-500 hover:bg-red-600 text-white font-body font-semibold"
                data-testid="confirm-delete-btn"
              >
                {deleteLoading ? '...' : (language === 'hi' ? 'हां, खाता हटाएं' : 'Yes, Delete Account')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
