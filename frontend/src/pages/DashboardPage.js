import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { formatCurrency } from '../lib/api';
import { translations } from '../lib/translations';
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
  XCircle, Sparkles, ChevronRight, Loader2, Settings, Scale
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
  high: 'bg-[#059669]/10 text-[#059669]',
  medium: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  low: 'bg-[#6B7280]/10 text-[#6B7280]',
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(user?.language || 'en');
  const t = translations[language] || translations.en;

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
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const chatEndRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [recsRes, leadsRes, creditRes] = await Promise.all([
        api.get('/loans/recommendations').catch(() => ({ data: [] })),
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

  const handleLanguageToggle = async (checked) => {
    const lang = checked ? 'hi' : 'en';
    setLanguage(lang);
    try { await api.put('/user/language', { language: lang }); } catch {}
  };

  const handleInterested = async (rec) => {
    try {
      await api.post('/leads', {
        product_id: rec.product_id,
        bank_name: rec.bank_name,
        product_name: rec.product_name,
      });
      toast.success(`Interest registered with ${rec.bank_name}`);
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
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9FB]">
        <Loader2 className="w-8 h-8 animate-spin text-[#059669]" />
      </div>
    );
  }

  const leadProductIds = new Set(leads.filter(l => l.status !== 'revoked').map(l => l.product_id));

  return (
    <div className="min-h-screen bg-[#F9F9FB]" data-testid="dashboard-page">
      {/* Nav */}
      <nav className="glass-nav fixed top-0 w-full z-50" data-testid="dashboard-navbar">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#059669]" strokeWidth={1.5} />
            <span className="font-heading font-bold text-lg text-[#0A0A0A]">Rinkosh</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-body">
              <span className={language === 'en' ? 'text-[#0A0A0A] font-semibold' : 'text-[#9CA3AF]'}>EN</span>
              <Switch checked={language === 'hi'} onCheckedChange={handleLanguageToggle} data-testid="language-toggle" />
              <span className={language === 'hi' ? 'text-[#0A0A0A] font-semibold' : 'text-[#9CA3AF]'}>HI</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="sm" onClick={() => setProfileOpen(true)} className="text-[#4B5563] hover:text-[#059669]" data-testid="edit-profile-button">
              <Settings className="w-4 h-4" />
            </Button>
            <span className="font-body text-sm text-[#4B5563] hidden md:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[#4B5563] hover:text-red-500" data-testid="logout-button">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#0A0A0A] tracking-tight">
            {t.welcome}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="font-body text-[#4B5563] mt-1">
            {recommendations.length} {t.recommendations.toLowerCase()} found
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-black/5 rounded-full p-1 h-auto flex-wrap" data-testid="dashboard-tabs">
            <TabsTrigger value="recommendations" className="rounded-full font-body data-[state=active]:bg-[#111827] data-[state=active]:text-white px-4 py-2 text-sm" data-testid="tab-recommendations">{t.recommendations}</TabsTrigger>
            <TabsTrigger value="leads" className="rounded-full font-body data-[state=active]:bg-[#111827] data-[state=active]:text-white px-4 py-2 text-sm" data-testid="tab-leads">{t.myLeads} {leads.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{leads.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="credit" className="rounded-full font-body data-[state=active]:bg-[#111827] data-[state=active]:text-white px-4 py-2 text-sm" data-testid="tab-credit">{t.creditBuilder}</TabsTrigger>
            <TabsTrigger value="ai" className="rounded-full font-body data-[state=active]:bg-[#111827] data-[state=active]:text-white px-4 py-2 text-sm" data-testid="tab-ai">{t.aiAdvisor}</TabsTrigger>
          </TabsList>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4" data-testid="recommendations-content">
            {recommendations.length === 0 ? (
              <Card className="rounded-2xl border border-black/5 p-12 text-center">
                <p className="font-body text-[#4B5563]">No recommendations yet. Complete your profile to get started.</p>
                <Button onClick={() => navigate('/onboarding')} className="mt-4 rounded-full bg-[#059669] hover:bg-[#047857] text-white font-body" data-testid="go-onboarding-btn">
                  Complete Profile <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {recommendations.map((rec, idx) => (
                  <Card key={rec.product_id} className="rounded-2xl border border-black/5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] loan-card overflow-hidden" data-testid={`rec-card-${rec.product_id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={compareList.some(r => r.product_id === rec.product_id)}
                            onCheckedChange={() => toggleCompare(rec)}
                            className="mt-1 border-[#E5E7EB] data-[state=checked]:bg-[#059669] data-[state=checked]:border-[#059669]"
                            data-testid={`compare-check-${rec.product_id}`}
                          />
                          <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading font-bold text-[#0A0A0A]">{rec.bank_name}</h3>
                            {idx === 0 && <Badge className="bg-[#059669] text-white text-xs">Best</Badge>}
                          </div>
                          <p className="font-body text-sm text-[#4B5563]">{rec.product_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-heading text-2xl font-bold text-[#059669]">{rec.interest_rate}%</div>
                          <span className="font-body text-xs text-[#9CA3AF]">{t.interestRate}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-[#F9F9FB] rounded-xl p-3 text-center">
                          <div className="font-heading font-bold text-[#0A0A0A] text-sm">{formatCurrency(rec.emi)}</div>
                          <div className="font-body text-xs text-[#9CA3AF]">{t.emi}</div>
                        </div>
                        <div className="bg-[#F9F9FB] rounded-xl p-3 text-center">
                          <div className="font-heading font-bold text-[#0A0A0A] text-sm">{formatCurrency(rec.processing_fee)}</div>
                          <div className="font-body text-xs text-[#9CA3AF]">{t.processingFee}</div>
                        </div>
                        <div className="bg-[#F9F9FB] rounded-xl p-3 text-center">
                          <div className="font-heading font-bold text-[#0A0A0A] text-sm">{formatCurrency(rec.total_cost)}</div>
                          <div className="font-body text-xs text-[#9CA3AF]">{t.totalCost}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                          <span className="font-body text-sm text-[#4B5563]">{t.approvalChance}</span>
                        </div>
                        <span className="font-heading font-bold text-sm text-[#059669]">{rec.approval_probability}%</span>
                      </div>
                      <Progress value={rec.approval_probability} className="h-1.5 bg-[#E5E7EB] mb-3" />

                      {rec.savings > 0 && (
                        <div className="flex items-center gap-2 bg-[#059669]/5 rounded-lg p-2 mb-3">
                          <TrendingDown className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                          <span className="font-body text-sm text-[#059669] font-medium">
                            {t.save} {formatCurrency(rec.savings)} vs worst option
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {rec.features?.map((f, i) => (
                          <span key={i} className="font-body text-xs bg-[#F3F4F6] text-[#4B5563] px-2 py-0.5 rounded-full">{f}</span>
                        ))}
                        {rec.foreclosure_charge_pct === 0 && (
                          <span className="font-body text-xs bg-[#059669]/10 text-[#059669] px-2 py-0.5 rounded-full">No foreclosure</span>
                        )}
                      </div>

                      <Button
                        onClick={() => handleInterested(rec)}
                        disabled={leadProductIds.has(rec.product_id)}
                        className={`w-full rounded-full font-body font-semibold h-10 ${
                          leadProductIds.has(rec.product_id)
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-[#059669] hover:bg-[#047857] text-white'
                        }`}
                        data-testid={`interested-btn-${rec.product_id}`}
                      >
                        {leadProductIds.has(rec.product_id) ? (
                          <><CheckCircle className="w-4 h-4 mr-2" /> Interest Registered</>
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
                  className="bg-[#111827] hover:bg-[#000000] text-white rounded-full px-8 py-3 font-body font-semibold shadow-2xl h-12"
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
                <Ban className="w-10 h-10 text-[#9CA3AF] mx-auto mb-4" />
                <p className="font-body text-[#4B5563]">No leads yet. Express interest in a loan to see it here.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <Card key={lead.lead_id} className="rounded-2xl border border-black/5 p-5" data-testid={`lead-${lead.lead_id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-heading font-semibold text-[#0A0A0A]">{lead.bank_name}</h3>
                          <Badge className={`text-xs ${statusColors[lead.status] || ''}`}>{lead.status}</Badge>
                        </div>
                        <p className="font-body text-sm text-[#4B5563] mt-0.5">{lead.product_name}</p>
                        <p className="font-body text-xs text-[#9CA3AF] mt-1">
                          Lead ID: {lead.lead_id} | {new Date(lead.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      {lead.status !== 'revoked' && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => handleRevoke(lead.lead_id)}
                          className="rounded-full text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300 font-body text-xs"
                          data-testid={`revoke-btn-${lead.lead_id}`}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> {t.revoke}
                        </Button>
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
                    <div className="w-10 h-10 rounded-xl bg-[#059669]/10 flex items-center justify-center flex-shrink-0">
                      {s.category === 'credit_card' ? <CreditCard className="w-5 h-5 text-[#059669]" strokeWidth={1.5} /> :
                       s.category === 'habit' ? <Target className="w-5 h-5 text-[#059669]" strokeWidth={1.5} /> :
                       s.category === 'loan' ? <TrendingDown className="w-5 h-5 text-[#059669]" strokeWidth={1.5} /> :
                       <Lightbulb className="w-5 h-5 text-[#059669]" strokeWidth={1.5} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-[#0A0A0A] text-sm">{s.title}</h3>
                      </div>
                      <p className="font-body text-sm text-[#4B5563] leading-relaxed">{s.description}</p>
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
              <div className="bg-white p-4 border-b border-black/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#059669]/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#059669]" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-[#0A0A0A]">{t.aiAdvisor}</h3>
                  <p className="font-body text-xs text-[#9CA3AF]">Powered by Claude AI | {language === 'hi' ? 'हिंदी' : 'English'}</p>
                </div>
              </div>

              <div className="h-[400px] overflow-y-auto custom-scroll p-4 space-y-3 bg-[#F9F9FB]" data-testid="ai-messages">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Sparkles className="w-8 h-8 text-[#059669]/30 mx-auto mb-3" />
                    <p className="font-body text-sm text-[#9CA3AF]">
                      {language === 'hi' ? 'कोई भी सवाल पूछें...' : 'Ask me anything about loans, credit scores, or financial planning...'}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {['What loan is best for me?', 'How to improve my credit score?', 'Explain processing fees'].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setChatInput(q); }}
                          className="font-body text-xs bg-white border border-black/5 rounded-full px-3 py-1.5 text-[#4B5563] hover:border-[#059669] transition-colors"
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
                        ? 'bg-[#111827] text-white'
                        : 'bg-white border border-black/5 text-[#0A0A0A]'
                    }`}>
                      <p className="font-body text-sm whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-black/5 rounded-2xl px-4 py-3 ai-shimmer">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#059669] animate-bounce" style={{animationDelay: '0ms'}} />
                        <div className="w-2 h-2 rounded-full bg-[#059669] animate-bounce" style={{animationDelay: '150ms'}} />
                        <div className="w-2 h-2 rounded-full bg-[#059669] animate-bounce" style={{animationDelay: '300ms'}} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-black/5">
                <div className="flex gap-2">
                  <Button
                    type="button" variant="outline" size="icon"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`rounded-full flex-shrink-0 ${isRecording ? 'bg-red-50 border-red-200 text-red-500 recording-pulse' : 'border-[#E5E7EB]'}`}
                    data-testid="voice-button"
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAiSend()}
                    placeholder={language === 'hi' ? 'अपना सवाल लिखें...' : 'Ask about loans, credit scores...'}
                    className="rounded-full bg-[#F9F9FB] border-[#E5E7EB] focus:border-[#059669] focus:ring-[#059669]"
                    data-testid="ai-chat-input"
                  />
                  <Button
                    onClick={handleAiSend}
                    disabled={!chatInput.trim() || chatLoading}
                    className="rounded-full bg-[#059669] hover:bg-[#047857] text-white flex-shrink-0"
                    data-testid="ai-send-button"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Profile Editor Sheet */}
      <ProfileEditor open={profileOpen} onOpenChange={setProfileOpen} onSaved={fetchData} />

      {/* Loan Comparison Dialog */}
      <LoanComparison open={compareOpen} onOpenChange={setCompareOpen} loans={compareList} />
    </div>
  );
}
