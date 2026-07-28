import React, { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, AlertCircle, Tag, Search, Printer, History, Users } from 'lucide-react';

export default function AdminOverview({ computations, allTransactions, units }) {
  const { totalKasa, totalGider, totalBekleyenAidat, totalBekleyenDemirbas, totalBekleyenEkstra, totalBekleyenOzel, totalBekleyenFaiz, unitBalances } = computations;
  const totalBekleyenTumu = totalBekleyenAidat + totalBekleyenDemirbas + totalBekleyenEkstra + totalBekleyenOzel + totalBekleyenFaiz;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredTransactions = allTransactions
    .filter(t => t.type !== 'system_marker')
    .filter(t => {
      const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || (t.unitId && t.unitId.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchType = filterType === 'all' || t.type === filterType;
      return matchSearch && matchType;
    })
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .slice(0, searchTerm || filterType !== 'all' ? 100 : 8); 

  // --- KAPSAYICI RAPOR HESAPLAMALARI ---
  const totalTahsilat = allTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
  const totalBorcTahakkuk = allTransactions.filter(t => ['due', 'fixture', 'extra', 'custom', 'penalty'].includes(t.type)).reduce((sum, t) => sum + t.amount, 0);
  const tahsilatOrani = totalBorcTahakkuk > 0 ? ((totalTahsilat / totalBorcTahakkuk) * 100).toFixed(1) : 0;

  const expensesByCategory = allTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => {
    const cat = curr.category || 'Diğer';
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {});

  let debtorsCount = 0;
  let debtFreeCount = 0;
  units.forEach(u => {
     if ((unitBalances[u.id]?.balance || 0) > 0) debtorsCount++;
     else debtFreeCount++;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <StatCard title="Kasa Durumu" amount={totalKasa} type={totalKasa >= 0 ? 'positive' : 'negative'} icon={<Wallet />} />
        <StatCard title="Bekleyen Alacaklar" amount={totalBekleyenTumu} type="warning" icon={<AlertCircle />} />
        <StatCard title="Toplam Giderler" amount={totalGider} type="negative" icon={<TrendingDown />} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden" id="overview-print">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6 border-b-2 border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-wide text-slate-800">Genel Durum ve Finansal Analiz Raporu</h2>
              <p className="text-slate-600 mt-1">Yükseller Apartmanı • Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR')}</p>
            </div>
            <button onClick={() => handlePrint('overview-print')} className="no-print bg-slate-800 text-white px-5 py-2.5 rounded-lg flex items-center hover:bg-slate-900 font-bold transition-colors shadow-sm"><Printer size={18} className="mr-2"/> Raporu Yazdır</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mevcut Kasa</p>
              <p className="text-2xl font-bold text-slate-800">{totalKasa.toLocaleString('tr-TR')} TL</p>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Genel Tahsilat Oranı</p>
              <p className="text-2xl font-bold text-emerald-700">%{tahsilatOrani}</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Toplam Gider</p>
              <p className="text-2xl font-bold text-red-700">{totalGider.toLocaleString('tr-TR')} TL</p>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-center">
              <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Toplam Alacak</p>
              <p className="text-2xl font-bold text-orange-700">{totalBekleyenTumu.toLocaleString('tr-TR')} TL</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center border-b border-slate-200 pb-2"><AlertCircle className="mr-2 text-orange-500" size={20}/> Bekleyen Alacak Dağılımı</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-600 font-medium">Aidat Borçları:</span><span className="font-bold text-slate-800">{totalBekleyenAidat.toLocaleString('tr-TR')} TL</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600 font-medium">Demirbaş Borçları:</span><span className="font-bold text-slate-800">{totalBekleyenDemirbas.toLocaleString('tr-TR')} TL</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600 font-medium">Gecikme Faizleri:</span><span className="font-bold text-slate-800">{totalBekleyenFaiz.toLocaleString('tr-TR')} TL</span></div>
                  {(totalBekleyenEkstra + totalBekleyenOzel) > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-slate-600 font-medium">Ekstra / Özel Borçlar:</span><span className="font-bold text-slate-800">{(totalBekleyenEkstra + totalBekleyenOzel).toLocaleString('tr-TR')} TL</span></div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-100 mt-2"><span className="text-slate-800 font-bold">Toplam Alacak:</span><span className="font-bold text-orange-600">{totalBekleyenTumu.toLocaleString('tr-TR')} TL</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center border-b border-slate-200 pb-2"><Users className="mr-2 text-blue-500" size={20}/> Kat Maliki / Sakin Durumu</h3>
                <div className="flex gap-4">
                  <div className="flex-1 bg-white border border-slate-200 p-3 rounded-lg text-center shadow-sm">
                     <p className="text-3xl font-bold text-red-500">{debtorsCount}</p>
                     <p className="text-xs font-medium text-slate-500 mt-1 uppercase">Borçlu Birim</p>
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 p-3 rounded-lg text-center shadow-sm">
                     <p className="text-3xl font-bold text-emerald-500">{debtFreeCount}</p>
                     <p className="text-xs font-medium text-slate-500 mt-1 uppercase">Borçsuz Birim</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center border-b border-slate-200 pb-2"><TrendingDown className="mr-2 text-red-500" size={20}/> Gider Kalemleri Dağılımı</h3>
              {Object.keys(expensesByCategory).length === 0 ? (
                <p className="text-sm text-slate-500 italic">Henüz gider kaydı bulunmamaktadır.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(expensesByCategory).sort((a,b) => b[1]-a[1]).map(([cat, total]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 font-medium">{cat}</span>
                        <span className="font-bold text-slate-800">{total.toLocaleString('tr-TR')} TL</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min((total / totalGider) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-3 border-t border-slate-100 mt-3">
                    <span className="text-slate-800 font-bold">Toplam Gider:</span>
                    <span className="font-bold text-red-600">{totalGider.toLocaleString('tr-TR')} TL</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="no-print border-t border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center"><History className="mr-2 text-slate-500" size={18}/> Son İşlemler (Sadece Ekranda Görünür)</h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">Tüm Türler</option>
                <option value="payment">Tahsilatlar</option>
                <option value="expense">Giderler</option>
                <option value="due">Aidat Borçlandırması</option>
                <option value="penalty">Faizler</option>
              </select>
              <div className="relative flex-1 min-w-[150px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Açıklama veya Birim ara..." className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredTransactions.map(t => (
              <div key={t.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 gap-2">
                <div>
                  <p className="font-medium text-slate-800 flex items-center">
                    {t.type === 'expense' && <Tag size={14} className="mr-1 text-slate-400"/>}
                    {t.type === 'penalty' && <Percent size={14} className="mr-1 text-red-500"/>}
                    {t.description}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(t.date).toLocaleDateString('tr-TR')} 
                    {t.unitId && ` • ${t.unitId.replace('-', ' ')}`}
                    {t.category && ` • Kategori: ${t.category}`}
                  </p>
                </div>
                <div className={`font-semibold sm:text-right ${['expense', 'penalty'].includes(t.type) ? 'text-red-600' : t.type === 'payment' ? 'text-green-600' : 'text-slate-600'}`}>
                  {t.type === 'expense' ? '-' : t.type === 'payment' ? '+' : ''}{t.amount.toLocaleString('tr-TR')} TL
                  {t.type === 'due' && <span className="block text-xs font-normal text-slate-400">(Aidat)</span>}
                  {t.type === 'fixture' && <span className="block text-xs font-normal text-slate-400">(Demirbaş)</span>}
                  {t.type === 'extra' && <span className="block text-xs font-normal text-slate-400">(Ekstra)</span>}
                  {t.type === 'custom' && <span className="block text-xs font-normal text-slate-400">(Özel)</span>}
                  {t.type === 'penalty' && <span className="block text-xs font-normal text-red-400">(Faiz)</span>}
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && <div className="p-6 text-center text-slate-500">Kriterlere uygun işlem bulunamadı.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}