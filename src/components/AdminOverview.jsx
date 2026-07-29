import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Users, FileText, CheckCircle, AlertCircle, Percent, Tag, Home, Store } from 'lucide-react';

export default function AdminOverview({ computations, allTransactions = [], units = [] }) {
  const { totalKasa, totalGider, totalBekleyenAidat, totalBekleyenDemirbas, totalBekleyenEkstra, totalBekleyenOzel, totalBekleyenFaiz, unitBalances } = computations;
  const totalBekleyenAlacak = totalBekleyenAidat + totalBekleyenFaiz + totalBekleyenDemirbas + totalBekleyenEkstra + totalBekleyenOzel;
  
  const debtUnits = units.map(u => ({...u, balance: unitBalances[u.id]?.balance || 0})).filter(u => u.balance > 0).sort((a,b) => b.balance - a.balance);

  const pendingPayments = [];
  units.forEach(u => {
    const balances = unitBalances[u.id];
    if(balances) {
      if(balances.dueBalance > 0) pendingPayments.push({ unitId: u.id, type: 'aidat', amount: balances.dueBalance, unitName: u.name });
      if(balances.penaltyBalance > 0) pendingPayments.push({ unitId: u.id, type: 'faiz', amount: balances.penaltyBalance, unitName: u.name });
      if(balances.fixtureBalance > 0) pendingPayments.push({ unitId: u.id, type: 'demirbas', amount: balances.fixtureBalance, unitName: u.name });
      if(balances.extraBalance > 0) pendingPayments.push({ unitId: u.id, type: 'ekstra', amount: balances.extraBalance, unitName: u.name });
      if(balances.customBalance > 0) pendingPayments.push({ unitId: u.id, type: 'ozel', amount: balances.customBalance, unitName: u.name });
    }
  });
  
  const groupedByType = pendingPayments.reduce((acc, curr) => {
    if (!acc[curr.type]) acc[curr.type] = { amount: 0, items: [] };
    acc[curr.type].amount += curr.amount;
    acc[curr.type].items.push(curr);
    return acc;
  }, {});

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const currentMonthTransactions = allTransactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const incomeThisMonth = currentMonthTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
  const expenseThisMonth = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const collectionRate = totalBekleyenAidat > 0 ? (incomeThisMonth / (incomeThisMonth + totalBekleyenAidat)) * 100 : 100;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Güncel Kasa Durumu" amount={totalKasa} icon={<Wallet size={24} className="text-blue-500" />} color="bg-blue-50 text-blue-700" />
        <StatCard title="Toplam Giderler" amount={totalGider} icon={<TrendingDown size={24} className="text-red-500" />} color="bg-red-50 text-red-700" isNegative />
        <StatCard title="Bekleyen Alacaklar (Ana Para + Demirbaş)" amount={totalBekleyenAidat + totalBekleyenDemirbas + totalBekleyenEkstra + totalBekleyenOzel} icon={<TrendingUp size={24} className="text-emerald-500" />} color="bg-emerald-50 text-emerald-700" />
        <StatCard title="Bekleyen Faiz Alacağı" amount={totalBekleyenFaiz} icon={<Percent size={24} className="text-amber-500" />} color="bg-amber-50 text-amber-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Wallet size={120} /></div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center"><TrendingUp className="mr-2 text-indigo-500"/> Aylık Performans Özeti</h3>
                <p className="text-sm text-slate-500 mt-1">{new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm shadow-sm border border-indigo-100 flex items-center">
                <CheckCircle size={16} className="mr-1.5"/>
                Tahsilat Oranı: %{collectionRate.toFixed(1)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-sm text-slate-500 font-medium mb-1">Bu Ayki Tahsilat</p>
                <div className="text-2xl font-bold text-emerald-600 flex items-center">+{incomeThisMonth.toLocaleString('tr-TR')} TL</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-sm text-slate-500 font-medium mb-1">Bu Ayki Giderler</p>
                <div className="text-2xl font-bold text-red-600 flex items-center">-{expenseThisMonth.toLocaleString('tr-TR')} TL</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center"><AlertCircle className="mr-2 text-amber-500"/> Bekleyen Tahsilat Dağılımı</h3>
                <p className="text-xs text-slate-500 mt-1">Borç kalemlerine göre dağılım ({totalBekleyenAlacak.toLocaleString('tr-TR')} TL)</p>
              </div>
            </div>
            <div className="p-6">
              {Object.keys(groupedByType).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedByType).map(([type, data]) => {
                    const percentage = ((data.amount / totalBekleyenAlacak) * 100).toFixed(1);
                    let colorClass = 'bg-blue-500';
                    let typeLabel = 'Aidat';
                    if (type === 'faiz') { colorClass = 'bg-amber-500'; typeLabel = 'Gecikme Faizi'; }
                    else if (type === 'demirbas') { colorClass = 'bg-indigo-500'; typeLabel = 'Demirbaş'; }
                    else if (type === 'ekstra') { colorClass = 'bg-purple-500'; typeLabel = 'Ekstra'; }
                    else if (type === 'ozel') { colorClass = 'bg-pink-500'; typeLabel = 'Özel'; }

                    return (
                      <div key={type}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-slate-700">{typeLabel}</span>
                          <span className="text-sm font-bold text-slate-900">{data.amount.toLocaleString('tr-TR')} TL <span className="text-slate-400 font-normal ml-1">({percentage}%)</span></span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                 <div className="text-center py-8 text-emerald-600 font-medium bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center">
                    <CheckCircle size={32} className="mb-2 opacity-80" />
                    Harika! Bekleyen tahsilat kalemi bulunmuyor.
                 </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 bg-red-50/50 flex justify-between items-center sticky top-0 z-10">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center"><Users className="mr-2 text-red-500"/> Borçlu Birimler</h3>
              <p className="text-xs text-slate-500 mt-1">Bakiyesi 0'dan büyük olanlar</p>
            </div>
            <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full text-sm">{debtUnits.length} Birim</span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[600px] p-2">
            {debtUnits.length > 0 ? (
              <div className="space-y-2">
                {debtUnits.map(unit => (
                  <div key={unit.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors bg-white">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${unit.id.includes('Daire') ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                        {unit.id.includes('Daire') ? <Home size={16} /> : <Store size={16} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 leading-tight">{unit.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{unit.residentStatus === 'tenant' ? unit.tenantName || 'Kiracı' : unit.ownerName || 'Malik'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="font-bold text-red-600">{unit.balance.toLocaleString('tr-TR')} TL</span>
                       <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex gap-1 justify-end">
                         {unitBalances[unit.id].dueBalance > 0 && <span title="Aidat Borcu">A: {unitBalances[unit.id].dueBalance.toLocaleString('tr-TR')}</span>}
                         {unitBalances[unit.id].penaltyBalance > 0 && <span title="Faiz Borcu" className="text-amber-500">F: {unitBalances[unit.id].penaltyBalance.toLocaleString('tr-TR')}</span>}
                         {unitBalances[unit.id].fixtureBalance > 0 && <span title="Demirbaş Borcu" className="text-indigo-400">D: {unitBalances[unit.id].fixtureBalance.toLocaleString('tr-TR')}</span>}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full text-emerald-600 bg-emerald-50/30 rounded-xl m-2 border border-emerald-100 border-dashed">
                 <CheckCircle size={48} className="mb-3 opacity-80" />
                 <p className="font-bold text-lg">Mükemmel!</p>
                 <p className="text-sm mt-1 opacity-80">Şu an borçlu hiçbir birim bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, amount, icon, color, isNegative }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className={`absolute top-0 right-0 -mt-4 -mr-4 p-8 rounded-full opacity-5 group-hover:scale-110 transition-transform ${color.split(' ')[0]}`}>{icon}</div>
      <div className={`inline-flex p-3 rounded-xl mb-4 ${color}`}>{icon}</div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-slate-800'}`}>
        {isNegative && amount > 0 ? '-' : ''}{amount.toLocaleString('tr-TR')} TL
      </h3>
    </div>
  );
}
