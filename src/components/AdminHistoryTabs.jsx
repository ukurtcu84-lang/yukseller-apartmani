import React, { useState, useMemo } from 'react';
import { History, Printer, Search, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { getTypeBadge } from '../App';

export default function AdminHistoryTabs({ transactions, sysLogs, onDeleteTransaction, onDeleteTransactionGroup, onDeleteMultipleTransactions }) {
  const [activeTab, setActiveTab] = useState('txs'); 
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Yazdırma Fonksiyonu (Bu dosyaya özel)
  const handlePrint = (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Yazdır - Yükseller Apartmanı</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: A4 portrait; margin: 12mm; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11pt; }
                .no-print { display: none !important; }
                .print-only { display: block !important; }
                table { page-break-inside: auto; font-size: 10pt; width: 100%; min-width: auto !important; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                th, td { padding: 6px 8px !important; }
              }
            </style>
          </head>
          <body>${el.innerHTML}<script>setTimeout(() => {window.print(); window.close();}, 1000);</script></body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleGroupSelection = (item) => {
    const newSet = new Set(selectedIds);
    const allSelected = item.subItems.every(sub => newSet.has(sub.id));
    item.subItems.forEach(sub => {
      if (allSelected) newSet.delete(sub.id); else newSet.add(sub.id);
    });
    setSelectedIds(newSet);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set();
      groupedList.forEach(item => {
        if (item.isGroup && item.type !== 'system_marker') {
          item.subItems.forEach(sub => allIds.add(sub.id));
        } else if (!item.isGroup && item.type !== 'system_marker') {
          allIds.add(item.transactionId);
        }
      });
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleGroup = (groupId) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupId)) newSet.delete(groupId); else newSet.add(groupId);
    setExpandedGroups(newSet);
  };

  const groupedList = useMemo(() => {
    const list = [];
    transactions.forEach(t => {
      if (t.groupId) {
        let groupInfo = list.find(x => x.isGroup && x.groupId === t.groupId);
        if (!groupInfo) {
          groupInfo = { id: t.groupId, isGroup: true, date: t.date, description: t.description, type: t.type, count: 0, amount: 0, groupId: t.groupId, subItems: [] };
          list.push(groupInfo);
        }
        groupInfo.count += 1; groupInfo.amount += t.amount; groupInfo.subItems.push(t);
      } else {
        list.push({ id: t.id, isGroup: false, date: t.date, description: t.description, type: t.type, amount: t.amount, unitId: t.unitId, transactionId: t.id });
      }
    });

    return list.filter(item => {
      const matchSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || (item.unitId && item.unitId.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchType = filterType === 'all' || item.type === filterType;
      return matchSearch && matchType;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, searchTerm, filterType]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full" id="history-print-table">
      
      <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 no-print">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><History className="text-slate-500"/> Kayıtlar & Sistem İzi</h2>
        <button onClick={() => handlePrint('history-print-table')} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition hover:bg-slate-900 shadow-sm">
          <Printer size={18} /> Yazdır
        </button>
      </div>

      <div className="print-only mb-6 text-center border-b-2 border-slate-800 pb-4 mt-4">
        <h2 className="text-2xl font-bold uppercase">{activeTab === 'txs' ? 'İşlem Geçmişi Dökümü' : 'Sistem Logları (Denetim İzi) Raporu'}</h2>
        <p className="text-slate-600">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
      </div>

      <div className="flex border-b border-slate-200 no-print">
        <button onClick={() => setActiveTab('txs')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'txs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>Aktif İşlemler Listesi</button>
        <button onClick={() => setActiveTab('logs')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>Sistem Logları (Denetim İzi)</button>
      </div>

      <div className="p-0 overflow-x-auto print-area">
        {activeTab === 'txs' && (
          <>
            <div className="flex flex-wrap gap-2 p-4 bg-slate-50/50 border-b border-slate-100 no-print items-center justify-between">
              <div className="flex gap-2 w-full sm:w-auto">
                <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="all">Tüm Türler</option><option value="payment">Tahsilatlar</option><option value="due">Aidat Borcu</option><option value="fixture">Demirbaş Borcu</option><option value="penalty">Faizler</option><option value="expense">Giderler</option>
                </select>
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Açıklama/Birim ara..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
              
              {selectedIds.size > 0 && (
                <button onClick={() => { onDeleteMultipleTransactions(Array.from(selectedIds)); setSelectedIds(new Set()); }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 animate-in fade-in">
                  <Trash2 size={16} /> Seçilenleri Sil ({selectedIds.size})
                </button>
              )}
            </div>

            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-4 w-12 no-print"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0} className="w-4 h-4 cursor-pointer rounded border-slate-300 text-blue-600" /></th>
                  <th className="p-4 font-semibold">Tarih</th><th className="p-4 font-semibold">İşlem Türü</th><th className="p-4 font-semibold">Açıklama</th><th className="p-4 font-semibold">Birim / Kapsam</th><th className="p-4 font-semibold text-right">Tutar</th><th className="p-4 font-semibold text-center no-print">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedList.length === 0 ? <tr><td colSpan="7" className="p-6 text-center text-slate-500">İşlem kaydı bulunamadı.</td></tr> : null}
                {groupedList.map(item => (
                  <React.Fragment key={item.id}>
                    <tr className={`hover:bg-slate-50 transition-colors ${expandedGroups.has(item.groupId) ? 'bg-blue-50/30' : ''} ${item.type === 'system_marker' ? 'opacity-60 bg-slate-50' : ''}`}>
                      <td className="p-4 no-print">
                        {item.type !== 'system_marker' && (
                          <input type="checkbox" className="w-4 h-4 cursor-pointer rounded border-slate-300 text-blue-600" 
                            checked={item.isGroup ? item.subItems.every(sub => selectedIds.has(sub.id)) : selectedIds.has(item.transactionId)} 
                            onChange={() => item.isGroup ? toggleGroupSelection(item) : toggleSelection(item.transactionId)} 
                          />
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-600">{new Date(item.date).toLocaleDateString('tr-TR')}</td>
                      <td className="p-4">{getTypeBadge(item.type)}</td>
                      <td className="p-4"><span className="font-medium text-slate-800">{item.description}</span>{item.isGroup && item.type !== 'system_marker' && <span className="ml-2 text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Toplu İşlem</span>}</td>
                      <td className="p-4 text-slate-600">{item.isGroup ? <span className="font-medium">{item.count} Adet Kayıt</span> : <span>{item.unitId ? item.unitId.replace('-', ' ') : 'Genel (Kasa)'}</span>}</td>
                      <td className="p-4 text-right font-medium text-slate-800">{item.amount.toLocaleString('tr-TR')} TL</td>
                      <td className="p-4 text-center space-x-2 no-print">
                        {item.isGroup && item.type !== 'system_marker' && (
                          <button onClick={() => toggleGroup(item.groupId)} className="text-blue-500 hover:bg-blue-100 p-2 rounded-lg transition-colors inline-flex items-center" title="Detayları Gör">{expandedGroups.has(item.groupId) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                        )}
                        <button onClick={() => item.isGroup ? onDeleteTransactionGroup(item.groupId) : onDeleteTransaction(item.transactionId)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors inline-flex items-center" title="Sil"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                    {item.isGroup && expandedGroups.has(item.groupId) && item.subItems.map(subItem => (
                      <tr key={subItem.id} className="bg-slate-50/50 border-t border-slate-100/50 text-sm">
                        <td className="p-3 pl-6 no-print"><input type="checkbox" checked={selectedIds.has(subItem.id)} onChange={() => toggleSelection(subItem.id)} className="w-3 h-3 cursor-pointer rounded border-slate-300 text-blue-600" /></td>
                        <td className="p-3 pl-2 text-slate-500">↳ {new Date(subItem.date).toLocaleDateString('tr-TR')}</td>
                        <td className="p-3 opacity-70">{getTypeBadge(subItem.type)}</td><td className="p-3 text-slate-600">{subItem.description}</td>
                        <td className="p-3 font-medium text-slate-700">{subItem.unitId ? subItem.unitId.replace('-', ' ') : 'Genel'}</td>
                        <td className="p-3 text-right text-slate-600">{subItem.amount.toLocaleString('tr-TR')} TL</td>
                        <td className="p-3 text-center no-print"><button onClick={() => onDeleteTransaction(subItem.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg transition-colors" title="Sil"><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </>
        )}

        {activeTab === 'logs' && (
          <>
            <div className="bg-indigo-50 text-indigo-800 p-4 text-sm font-medium border-b border-indigo-100 flex items-start gap-3 no-print">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <p>Bu alandaki veriler sistem güvenliği gereği silinemez. Sistemde yapılan tüm ekleme, silme ve düzenleme işlemleri saat ve kullanıcı bilgisiyle kalıcı olarak saklanır.</p>
            </div>
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-600">
                <tr><th className="p-4 font-semibold w-32">Tarih / Saat</th><th className="p-4 font-semibold w-32">Aksiyon</th><th className="p-4 font-semibold w-24">Kullanıcı</th><th className="p-4 font-semibold">Detaylar</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sysLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(log.date).toLocaleDateString('tr-TR')} <br/> 
                      <span className="font-medium">{new Date(log.date).toLocaleTimeString('tr-TR')}</span>
                    </td>
                    <td className="p-4">
                      {log.action.includes('SİLME') && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{log.action}</span>}
                      {log.action.includes('EKLEME') && <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">{log.action}</span>}
                      {log.action.includes('DÜZENLEME') && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{log.action}</span>}
                      {log.action.includes('UNDO') && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">{log.action}</span>}
                      {!['SİLME', 'EKLEME', 'DÜZENLEME', 'UNDO'].some(a => log.action.includes(a)) && <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold">{log.action}</span>}
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{log.user}</td>
                    <td className="p-4 text-slate-700 leading-relaxed">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
```eof
