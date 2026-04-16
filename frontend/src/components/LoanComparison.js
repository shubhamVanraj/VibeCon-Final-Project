import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { formatCurrency } from '../lib/api';
import { TrendingDown, CheckCircle } from 'lucide-react';

function getBestValue(loans, key, direction = 'lowest') {
  if (!loans.length) return null;
  const values = loans.map(l => l[key]).filter(v => v != null);
  return direction === 'lowest' ? Math.min(...values) : Math.max(...values);
}

export function LoanComparison({ open, onOpenChange, loans }) {
  if (!loans || loans.length < 2) return null;

  const bestRate = getBestValue(loans, 'interest_rate', 'lowest');
  const bestEmi = getBestValue(loans, 'emi', 'lowest');
  const bestTotal = getBestValue(loans, 'total_cost', 'lowest');
  const bestFee = getBestValue(loans, 'processing_fee', 'lowest');
  const bestApproval = getBestValue(loans, 'approval_probability', 'highest');

  const metrics = [
    { label: 'Interest Rate', key: 'interest_rate', best: bestRate, format: (v) => `${v}%`, dir: 'lowest' },
    { label: 'Monthly EMI', key: 'emi', best: bestEmi, format: (v) => formatCurrency(v), dir: 'lowest' },
    { label: 'Total Cost', key: 'total_cost', best: bestTotal, format: (v) => formatCurrency(v), dir: 'lowest' },
    { label: 'Processing Fee', key: 'processing_fee', best: bestFee, format: (v) => formatCurrency(v), dir: 'lowest' },
    { label: 'Foreclosure', key: 'foreclosure_charge_pct', format: (v) => v === 0 ? 'None' : `${v}%`, dir: 'lowest' },
    { label: 'Approval Chance', key: 'approval_probability', best: bestApproval, format: (v) => `${v}%`, dir: 'highest' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto p-0" data-testid="comparison-dialog">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-heading text-xl">Side-by-Side Comparison</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="table" className="p-6 pt-4">
          <TabsList className="bg-[#F3F4F6] rounded-full p-1 mb-6">
            <TabsTrigger value="table" className="rounded-full font-body text-sm data-[state=active]:bg-white" data-testid="compare-table-tab">Table View</TabsTrigger>
            <TabsTrigger value="cards" className="rounded-full font-body text-sm data-[state=active]:bg-white" data-testid="compare-cards-tab">Card View</TabsTrigger>
          </TabsList>

          {/* Table View */}
          <TabsContent value="table">
            <div className="overflow-x-auto rounded-xl border border-black/5">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F9F9FB]">
                    <th className="text-left font-body text-xs text-[#9CA3AF] uppercase tracking-wider py-3 px-4 min-w-[140px]">Metric</th>
                    {loans.map((loan, i) => (
                      <th key={loan.product_id} className="text-center py-3 px-4 min-w-[160px]">
                        <div className="font-heading font-bold text-[#0A0A0A] text-sm">{loan.bank_name}</div>
                        <div className="font-body text-xs text-[#9CA3AF]">{loan.product_name}</div>
                        {i === 0 && <Badge className="bg-[#059669] text-white text-[10px] mt-1">Best Overall</Badge>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.key} className="border-t border-black/5 hover:bg-[#F9F9FB]/50 transition-colors">
                      <td className="py-3 px-4 font-body text-sm font-medium text-[#4B5563]">{metric.label}</td>
                      {loans.map((loan) => {
                        const value = loan[metric.key];
                        const isBest = metric.best != null && value === metric.best;
                        return (
                          <td key={loan.product_id} className="py-3 px-4 text-center">
                            <span className={`font-heading font-bold text-sm inline-flex items-center gap-1 ${isBest ? 'text-[#059669]' : 'text-[#0A0A0A]'}`}>
                              {metric.format(value)}
                              {isBest && <CheckCircle className="w-3.5 h-3.5" />}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[#059669]/20 bg-[#059669]/5">
                    <td className="py-3 px-4 font-body text-sm font-bold text-[#059669]">
                      <span className="flex items-center gap-1"><TrendingDown className="w-4 h-4" /> Savings</span>
                    </td>
                    {loans.map((loan) => (
                      <td key={loan.product_id} className="py-3 px-4 text-center">
                        <span className="font-heading font-bold text-sm text-[#059669]">
                          {loan.savings > 0 ? formatCurrency(loan.savings) : '-'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Card View */}
          <TabsContent value="cards">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(loans.length, 4)}, 1fr)` }}>
              {loans.map((loan, i) => (
                <div key={loan.product_id} className={`rounded-2xl border-2 p-5 transition-all ${i === 0 ? 'border-[#059669] bg-[#059669]/5 shadow-lg' : 'border-black/5 bg-white'}`}
                  data-testid={`compare-card-${loan.product_id}`}>
                  <div className="text-center mb-4">
                    <h3 className="font-heading font-bold text-[#0A0A0A]">{loan.bank_name}</h3>
                    <p className="font-body text-xs text-[#9CA3AF]">{loan.product_name}</p>
                    {i === 0 && <Badge className="bg-[#059669] text-white text-[10px] mt-2">Best</Badge>}
                  </div>
                  <div className="space-y-3">
                    {metrics.map((metric) => {
                      const value = loan[metric.key];
                      const isBest = metric.best != null && value === metric.best;
                      return (
                        <div key={metric.key} className="flex justify-between items-center">
                          <span className="font-body text-xs text-[#9CA3AF]">{metric.label}</span>
                          <span className={`font-heading font-bold text-sm ${isBest ? 'text-[#059669]' : 'text-[#0A0A0A]'}`}>
                            {metric.format(value)}
                          </span>
                        </div>
                      );
                    })}
                    {loan.savings > 0 && (
                      <div className="pt-2 border-t border-[#059669]/20 flex justify-between items-center">
                        <span className="font-body text-xs text-[#059669] font-semibold">Savings</span>
                        <span className="font-heading font-bold text-sm text-[#059669]">{formatCurrency(loan.savings)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-black/5">
                    {loan.features?.map((f, fi) => (
                      <span key={fi} className="font-body text-[10px] bg-[#F3F4F6] text-[#4B5563] px-1.5 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
