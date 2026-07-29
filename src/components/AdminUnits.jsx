import React, { useState } from 'react';
import { Home, Store, Users, Search, Printer, Filter, Plus, Upload, Phone, Edit, History, FileText, PlusCircle, Trash2, X, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { getTypeBadge } from './utils';

export default function AdminUnits({ units, unitBalances, lastBilledMonth, transactions, onAddTransaction, onAddBulkTransactions, onAddBulkDue, onDeleteTransaction, onEditTransaction, onUpdateUnit, onUpdateBulkUnits }) {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkType, setBulkType] = useState('due'); 
  const [daireAmount, setDaireAmount] = useState('');
  const [dukkanAmounts, setDukkanAmounts] = useState({});
  const [bulkDesc, setBulkDesc] = useState('');

  const [sysMessage, setSysMessage] = useState(null);
  const showMessage = (text, type = 'success') => { setSysMessage({ text, type }); setTimeout(() => setSysMessage(null), 4000); };

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState(null);

  const [showUnitImportModal, setShowUnitImportModal] = useState(false);
  const [unitImportText, setUnitImportText] = useState('');
  const [unitImportPreview, setUnitImportPreview] = useState(null);

  const [activeAction, setActiveAction] = useState(null); 
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [editFormData, setEditFormData] = useState({});
  const [pastBalanceAmount, setPastBalanceAmount] = useState('');
  const [pastBalanceType, setPastBalanceType] = useState('due');
  const [pastBalanceDate, setPastBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [addDueAmount, setAddDueAmount] = useState('');
  const [addDueType, setAddDueType] = useState('due');
  const [addDueDesc, setAddDueDesc] = useState('');
  const [addDueDate, setAddDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxFormData, setEditTxFormData] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); 
  const [ekstreSearchTerm, setEkstreSearchTerm] = useState('');
  const [ekstreFilterType, setEkstreFilterType] = useState('all');
  const [ekstreStartDate, setEkstreStartDate] = useState('');
  const [ekstreEndDate, setEkstreEndDate] = useState('');

  const filteredUnits = units.filter(unit => {
    const balance = unitBalances[unit.id]?.balance || 0;
    const searchMatch = unit.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (unit.ownerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (unit.tenantName || '').toLowerCase().includes(searchTerm.toLowerCase());
    let statusMatch = true;
    if (filterStatus === 'debt') statusMatch = balance > 0;
    if (filterStatus === 'nodebt') statusMatch = balance <= 0;
    return searchMatch && statusMatch;
  });

  const startEditingTx = (tx) => {
    setEditingTxId(tx.id);
    setEditTxFormData({ date: new Date(tx.date).toISOString().split('T')[0], type: tx.type, description: tx.description, amount: tx.amount });
  };
  const saveEditedTx = () => {
    if (!editTxFormData.amount || !editTxFormData.description) return showMessage("Tutar ve açıklama boş bırakılamaz!", "error");
    onEditTransaction(editingTxId, { ...editTxFormData, amount: Number(editTxFormData.amount), date: new Date(editTxFormData.date).toISOString() });
    setEditingTxId(null); showMessage("İşlem başarıyla güncellendi.");
  };
  const cancelEditingTx = () => setEditingTxId(null);

  const handleBulkSubmit = (e) => {
    e.preventDefault();
    if(daireAmount && bulkDesc) {
      onAddBulkDue(bulkType, daireAmount, dukkanAmounts, bulkDesc);
      setShowBulkModal(false); setBulkType('due'); setDaireAmount(''); setDukkanAmounts({}); setBulkDesc('');
      showMessage("Tüm birimlere borçlandırma başarıyla eklendi.");
    }
  };

  const openInlineAction = (unit, type) => {
    setActiveAction({ unitId: unit.id, type });
    if (type === 'edit') setEditFormData({ ...unit });
    if (type === 'payment') { setPaymentAmount(''); setPaymentDate(new Date().toISOString().split('T')[0]); }
    if (type === 'pastBalance') { setPastBalanceAmount(''); setPastBalanceType('due'); setPastBalanceDate(new Date().toISOString().split('T')[0]); }
    if (type === 'addDue') { setAddDueAmount(''); setAddDueType('due'); setAddDueDesc(''); setAddDueDate(new Date().toISOString().split('T')[0]); }
    if (type === 'history') { setEditingTxId(null); setEkstreSearchTerm(''); setEkstreFilterType('all'); setEkstreStartDate(''); setEkstreEndDate(''); }
  };
  const closeInlineAction = () => setActiveAction(null);

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if(paymentAmount && paymentDate && activeAction) {
      onAddTransaction({ type: 'payment', amount: Number(paymentAmount), unitId: activeAction.unitId, description: 'Elden / Havale Tahsilat', date: paymentDate });
      closeInlineAction(); showMessage("Tahsilat başarıyla kaydedildi.");
    }
  };

  const handlePastBalanceSubmit = (e) => {
    e.preventDefault();
    if(pastBalanceAmount && pastBalanceDate && activeAction) {
      onAddTransaction({ type: pastBalanceType, amount: Number(pastBalanceAmount), unitId: activeAction.unitId, description: pastBalanceType === 'due' ? 'Geçmiş Dönem Devir Borcu' : 'Geçmiş Dönem Devir Alacağı', date: pastBalanceDate });
      closeInlineAction(); showMessage("Geçmiş bakiye başarıyla kaydedildi.");
    }
  };

  const handleEditSubmit = async (e) => { 
    e.preventDefault(); 
    const success = await onUpdateUnit(editFormData); 
    if (success) {
      closeInlineAction(); 
      showMessage("Birim bilgileri ve şifre başarıyla güncellendi."); 
    } else {
      showMessage("Firebase izin hatası! Kaydedilemedi.", "error");
    }
  };
  
  const handleAddDueSubmit = (e) => {
    e.preventDefault();
    if(addDueAmount && addDueDesc && activeAction) {
      onAddTransaction({ type: addDueType, amount: Number(addDueAmount), unitId: activeAction.unitId, description: addDueDesc, date: addDueDate });
      closeInlineAction(); showMessage("Birim özel borçlandırma başarıyla kaydedildi.");
    }
  };

  const handleParseImport = () => {
    if(!importText.trim()) return;
    const lines = importText.split('\n'); const parsed = [];
    lines.forEach((line, index) => {
      if(!line.trim()) return;
      const cols = line.split(/\t|;/);
      if (cols.length >= 3) {
        let rawUnit = cols[0].trim(), rawDate = cols[1].trim(), rawAmount = cols[2].trim();
        const matchedUnit = units.find(u => u.name.toLowerCase() === rawUnit.toLowerCase() || u.id.toLowerCase() === rawUnit.toLowerCase().replace(' ', '-') || u.name.toLowerCase().replace(' ', '') === rawUnit.toLowerCase().replace(' ', ''));
        let formattedDate = rawDate;
        if (rawDate.includes('.')) { const parts = rawDate.split('.'); if(parts.length === 3) formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; }
        let cleanVal = rawAmount.replace('TL', '').replace('₺', '').trim();
        if (cleanVal.includes(',') && cleanVal.includes('.')) {
          if (cleanVal.lastIndexOf(',') > cleanVal.lastIndexOf('.')) cleanVal = cleanVal.replace(/\./g, '').replace(',', '.'); else cleanVal = cleanVal.replace(/,/g, ''); 
        } else if (cleanVal.includes(',')) cleanVal = cleanVal.replace(',', '.'); 
        let amount = parseFloat(cleanVal.replace(/[^0-9.-]+/g,""));
        parsed.push({ id: index, rawUnit, rawDate, rawAmount, unitId: matchedUnit ? matchedUnit.id : null, unitName: matchedUnit ? matchedUnit.name : 'Bilinmiyor / Hata', date: formattedDate, amount: isNaN(amount) ? 0 : amount, isValid: !!matchedUnit && !isNaN(amount) && amount > 0 && formattedDate.length >= 8 });
      }
    });
    setImportPreview(parsed);
  };

  const handleImportSubmit = () => {
    const validTxs = importPreview.filter(p => p.isValid).map(p => ({ type: 'payment', amount: p.amount, unitId: p.unitId, description: 'Banka / Excel Toplu Tahsilat', date: p.date }));
    if(validTxs.length > 0) {
      onAddBulkTransactions(validTxs); showMessage(`${validTxs.length} adet tahsilat başarıyla hesaba işlendi.`);
      setShowImportModal(false); setImportText(''); setImportPreview(null);
    } else showMessage("İşlenecek geçerli kayıt bulunamadı. Lütfen kırmızı hataları kontrol edin.", "error");
  };

  const handleParseUnitImport = () => {
    if(!unitImportText.trim()) return;
    const lines = unitImportText.split('\n'); const parsed = [];
    lines.forEach((line, index) => {
      if(!line.trim()) return;
      const cols = line.split(/\t|;/);
      while(cols.length < 6) cols.push('');

      let rawUnit = cols[0].trim();
      let rawOwnerName = cols[1].trim();
      let rawOwnerPhone = cols[2].trim();
      let rawTenantName = cols[3].trim();
      let rawTenantPhone = cols[4].trim();
      let rawPass = cols[5].trim();
      
      const matchedUnit = units.find(u => u.name.toLowerCase() === rawUnit.toLowerCase() || u.id.toLowerCase() === rawUnit.toLowerCase().replace(' ', '-') || u.name.toLowerCase().replace(' ', '') === rawUnit.toLowerCase().replace(' ', ''));
      let residentStatus = rawTenantName.length > 0 ? 'tenant' : 'owner';
      
      parsed.push({ 
        id: index, rawUnit, unitId: matchedUnit ? matchedUnit.id : null, unitName: matchedUnit ? matchedUnit.name : 'Bilinmiyor', residentStatus, ownerName: rawOwnerName, ownerPhone: rawOwnerPhone, tenantName: rawTenantName, tenantPhone: rawTenantPhone, password: rawPass || '1234', isValid: !!matchedUnit && (rawOwnerName.length > 0 || rawTenantName.length > 0)
      });
    });
    setUnitImportPreview(parsed);
  };

  const handleUnitImportSubmit = async () => {
    const validUnits = unitImportPreview.filter(p => p.isValid).map(p => {
      const existingUnit = units.find(u => u.id === p.unitId);
      return { 
        ...existingUnit, residentStatus: p.residentStatus, ownerName: p.ownerName, ownerPhone: p.ownerPhone, tenantName: p.tenantName, tenantPhone: p.tenantPhone, password: p.password 
      };
    });

    if(validUnits.length > 0) {
      const success = await onUpdateBulkUnits(validUnits); 
      if(success) {
        showMessage(`${validUnits.length} adet birimin bilgileri başarıyla güncellendi.`);
        setShowUnitImportModal(false); setUnitImportText(''); setUnitImportPreview(null);
      } else {
        showMessage("Firebase izin hatası! Kaydedilemedi.", "error");
      }
    } else showMessage("Güncellenecek geçerli kayıt bulunamadı.", "error");
  };

  return (
    <div className="space-y-6 relative">
      {sysMessage && (
        <div className={`p-4 rounded-lg flex items-center shadow-md mb-4 ${sysMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {sysMessage.type === 'error' ? <AlertCircle className="mr-2" size={20} /> : <CheckCircle className="mr-2" size={20} />}<span className="font-medium">{sysMessage.text}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Daireler ve Dükkanlar</h2>
          <p className="text-sm text-slate-500 mt-1">Sistemdeki son borçlandırma: <strong className="text-slate-700">{lastBilledMonth}</strong></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowUnitImportModal(true)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors font-medium border border-indigo-200"><Users size={18} className="mr-2" /> Kişileri Yükle</button>
          <button onClick={() => setShowImportModal(true)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors font-medium border border-emerald-200"><Upload size={18} className="mr-2" /> Toplu Tahsilat</button>
          <button onClick={() => setShowBulkModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors"><Plus size={18} className="mr-2" /> Toplu Borç Ekle</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100 no-print">
        <Filter size={18} className="text-slate-400" />
        <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Tüm Birimler</option>
          <option value="debt">Sadece Borcu Olanlar</option>
          <option value="nodebt">Borcu Olmayanlar / Alacaklılar</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Birim, Malik veya Kiracı ara..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {showImportModal && ( 
        <div className="bg-white p-6 rounded-xl shadow-lg border border-emerald-200 mb-6 no-print">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-emerald-800 flex items-center"><Upload size={20} className="mr-2"/> Banka Ekstresi / Excel'den Tahsilat Yükle</h3>
            <button onClick={() => { setShowImportModal(false); setImportPreview(null); setImportText(''); }} className="text-slate-400 hover:text-slate-600">&times;</button>
          </div>
          
          {!importPreview ? (
            <div>
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg text-sm mb-4 border border-emerald-100">
                <p className="font-semibold mb-2">Nasıl Yüklenir?</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Excel dosyanızda şu 3 sütunu yan yana getirin: <strong>Birim Adı</strong> | <strong>Tarih</strong> | <strong>Tutar</strong></li>
                  <li>Örnek Format: <code className="bg-white px-2 py-0.5 rounded text-slate-700">Daire 1   05.11.2023   1500,50</code></li>
                  <li>İlgili hücreleri farenizle seçip Kopyalayın (Ctrl+C).</li>
                  <li>Aşağıdaki kutuya Yapıştırın (Ctrl+V) ve Kontrol Et butonuna basın.</li>
                </ol>
              </div>
              <textarea 
                className="w-full h-40 border border-slate-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Örnek:&#10;Daire 1    12.11.2023    500&#10;Dükkan 2   15.11.2023    750.50"
                value={importText} onChange={e => setImportText(e.target.value)}
              ></textarea>
              <div className="flex justify-end mt-4"><button onClick={handleParseImport} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-medium">Verileri Kontrol Et (Önizleme)</button></div>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm text-slate-600">Lütfen aktarılacak verileri kontrol edin. Yalnızca <span className="text-emerald-600 font-bold">Geçerli</span> olanlar işlenecektir.</p>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg mb-4">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 sticky top-0"><tr><th className="p-2 border-b">Birim Eşleşmesi</th><th className="p-2 border-b">Tarih</th><th className="p-2 border-b">Tutar</th><th className="p-2 border-b text-center">Durum</th></tr></thead>
                  <tbody>
                    {importPreview.map((row) => (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="p-2"><span className="text-xs text-slate-400 block">{row.rawUnit} (Okunan)</span><span className={row.unitId ? 'font-medium text-slate-800' : 'font-medium text-red-500'}>{row.unitName}</span></td>
                        <td className="p-2">{row.date}</td><td className="p-2 font-mono">{row.amount} TL</td>
                        <td className="p-2 text-center">{row.isValid ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Geçerli</span> : <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Hatalı</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-sm font-medium">Toplam <span className="text-emerald-600">{importPreview.filter(p => p.isValid).length} geçerli</span> bulundu.</div>
                <div className="flex gap-2">
                  <button onClick={() => setImportPreview(null)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300">Geri Dön</button>
                  <button onClick={handleImportSubmit} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-bold shadow-sm">Onayla ve İşle</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showUnitImportModal && ( 
        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-200 mb-6 no-print animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-indigo-800 flex items-center"><Users size={20} className="mr-2"/> Excel'den Toplu Kişi ve Şifre Yükle</h3>
            <button onClick={() => { setShowUnitImportModal(false); setUnitImportPreview(null); setUnitImportText(''); }} className="text-slate-400 hover:text-slate-600">&times;</button>
          </div>
          
          {!unitImportPreview ? (
            <div>
              <div className="bg-indigo-50 text-indigo-800 p-4 rounded-lg text-sm mb-4 border border-indigo-100">
                <p className="font-semibold mb-2">Nasıl Yüklenir?</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Excel dosyanızda şu 6 sütunu yan yana getirin: <strong>Birim Adı</strong> | <strong>Malik Adı</strong> | <strong>Malik Tel</strong> | <strong>Kiracı Adı</strong> | <strong>Kiracı Tel</strong> | <strong>Şifre</strong></li>
                  <li>Örnek Format: <code className="bg-white px-2 py-0.5 rounded text-slate-700">Daire 1   Ahmet Yılmaz   0532111   Ayşe Demir   0555222   1234</code></li>
                  <li>Eğer dairede kiracı yoksa, kiracı alanlarını boş bırakın. Sistem otomatik olarak "Mal Sahibi" kaydedecektir.</li>
                  <li>Kopyalayıp aşağıdaki kutuya yapıştırın ve Kontrol Et butonuna basın.</li>
                </ol>
              </div>
              <textarea 
                className="w-full h-40 border border-slate-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none whitespace-pre"
                placeholder="Örnek:&#10;Daire 1    Ahmet Yılmaz    0532111    Ayşe Demir    0555222    1234"
                value={unitImportText} onChange={e => setUnitImportText(e.target.value)}
              ></textarea>
              <div className="flex justify-end mt-4"><button onClick={handleParseUnitImport} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm">Verileri Kontrol Et</button></div>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm text-slate-600">Lütfen aktarılacak verileri kontrol edin.</p>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg mb-4">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 sticky top-0"><tr><th className="p-2 border-b">Birim</th><th className="p-2 border-b">Durum</th><th className="p-2 border-b">Malik Bilgisi</th><th className="p-2 border-b">Kiracı Bilgisi</th><th className="p-2 border-b">Şifre</th><th className="p-2 border-b text-center">Kontrol</th></tr></thead>
                  <tbody>
                    {unitImportPreview.map((row) => (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="p-2"><span className="text-xs text-slate-400 block">{row.rawUnit}</span><span className={row.unitId ? 'font-medium text-slate-800' : 'font-medium text-red-500'}>{row.unitName}</span></td>
                        <td className="p-2"><span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.residentStatus === 'tenant' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{row.residentStatus === 'tenant' ? 'Kiracı' : 'Mal Sahibi'}</span></td>
                        <td className="p-2"><div className="font-medium text-slate-800">{row.ownerName || '-'}</div><div className="text-xs text-slate-500">{row.ownerPhone}</div></td>
                        <td className="p-2"><div className="font-medium text-slate-800">{row.tenantName || '-'}</div><div className="text-xs text-slate-500">{row.tenantPhone}</div></td>
                        <td className="p-2 font-mono text-xs">{row.password}</td>
                        <td className="p-2 text-center">{row.isValid ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Geçerli</span> : <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Hatalı</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-sm font-medium">Toplam <span className="text-indigo-600">{unitImportPreview.filter(p => p.isValid).length} geçerli</span> bulundu.</div>
                <div className="flex gap-2">
                  <button onClick={() => setUnitImportPreview(null)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300">Geri Dön</button>
                  <button onClick={handleUnitImportSubmit} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-sm">Onayla ve Kaydet</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showBulkModal && ( 
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-6 no-print">
          <h3 className="font-bold text-lg mb-4">Toplu Borçlandırma Ekle</h3>
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-4 mb-4">
              <label className="flex items-center cursor-pointer text-slate-700"><input type="radio" name="bulkType" value="due" checked={bulkType === 'due'} onChange={(e) => setBulkType(e.target.value)} className="mr-2" /> Normal Aidat</label>
              <label className="flex items-center cursor-pointer text-slate-700"><input type="radio" name="bulkType" value="fixture" checked={bulkType === 'fixture'} onChange={(e) => setBulkType(e.target.value)} className="mr-2" /> Demirbaş</label>
              <label className="flex items-center cursor-pointer text-slate-700"><input type="radio" name="bulkType" value="extra" checked={bulkType === 'extra'} onChange={(e) => setBulkType(e.target.value)} className="mr-2" /> Ekstra/Acil Toplama</label>
            </div>
            <input type="text" required placeholder="Açıklama / Ay (Örn: Kasım Aidatı)" className="w-full border border-slate-300 rounded-lg px-4 py-2" value={bulkDesc} onChange={e => setBulkDesc(e.target.value)} />
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="font-semibold text-slate-700 mb-3 flex items-center"><Home size={16} className="mr-2"/> Daireler (Toplu Tutar)</h4>
              <input type="number" required placeholder="Tüm daireler için tutar (TL)" className="w-full sm:w-64 border border-slate-300 rounded-lg px-4 py-2" value={daireAmount} onChange={e => setDaireAmount(e.target.value)} />
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="font-semibold text-slate-700 mb-3 flex items-center"><Store size={16} className="mr-2"/> Dükkanlar (Ayrı Tutarlar)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {units.filter(u => u.type === 'dukkan').map(dukkan => (
                  <div key={dukkan.id} className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-100">
                    <label className="text-sm font-medium text-slate-600 w-20">{dukkan.name}</label>
                    <input type="number" required placeholder="Tutar" className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm" value={dukkanAmounts[dukkan.id] || ''} onChange={e => setDukkanAmounts({...dukkanAmounts, [dukkan.id]: e.target.value})} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">Borçlandır</button>
              <button type="button" onClick={() => setShowBulkModal(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg">İptal</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
              <th className="p-4 font-medium">Birim</th><th className="p-4 font-medium">Sakin / Durum</th><th className="p-4 font-medium">İletişim</th><th className="p-4 font-medium">Bakiye</th><th className="p-4 font-medium text-right no-print">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUnits.map(unit => {
              const details = unitBalances[unit.id] || { balance: 0, dueBalance: 0, penaltyBalance: 0 };
              const isTenant = unit.residentStatus === 'tenant';
              const residentName = isTenant ? (unit.tenantName || 'Belirtilmemiş') : unit.ownerName;
              const isActionActive = activeAction?.unitId === unit.id;

              return (
                <React.Fragment key={unit.id}>
                  <tr className={`hover:bg-slate-50 transition-colors ${isActionActive ? 'bg-blue-50/40' : ''}`}>
                    <td className="p-4"><div className="font-medium text-slate-800 flex items-center">{unit.type === 'daire' ? <Home size={16} className="text-slate-400 mr-2"/> : <Store size={16} className="text-slate-400 mr-2"/>}{unit.name}</div></td>
                    <td className="p-4">
                      <div className="font-medium text-slate-700">{residentName}</div>
                      <div className="flex items-center mt-1"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isTenant ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{isTenant ? 'Kiracı Oturuyor' : 'Mal Sahibi'}</span></div>
                    </td>
                    <td className="p-4"><div className="text-sm text-slate-600 flex items-center">{isTenant ? unit.tenantPhone : unit.ownerPhone ? <><Phone size={12} className="mr-1"/> {unit.ownerPhone}</> : <span className="text-slate-400 italic">Eksik Bilgi</span>}</div></td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${details.balance > 0 ? 'bg-red-100 text-red-700' : details.balance < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {details.balance > 0 ? `${details.balance.toLocaleString('tr-TR')} TL Borçlu` : details.balance < 0 ? `${Math.abs(details.balance).toLocaleString('tr-TR')} TL Alacaklı` : 'Borcu Yok'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2 no-print">
                      <button onClick={() => openInlineAction(unit, 'edit')} className={`p-2 rounded-lg transition-colors inline-flex ${isActionActive && activeAction.type === 'edit' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`} title="Düzenle"><Edit size={16} /></button>
                      <button onClick={() => openInlineAction(unit, 'pastBalance')} className={`p-2 rounded-lg transition-colors inline-flex ${isActionActive && activeAction.type === 'pastBalance' ? 'bg-orange-500 text-white' : 'text-orange-500 hover:bg-orange-100'}`} title="Geçmiş Bakiye"><History size={16} /></button>
                      <button onClick={() => openInlineAction(unit, 'history')} className={`p-2 rounded-lg transition-colors inline-flex ${isActionActive && activeAction.type === 'history' ? 'bg-indigo-600 text-white' : 'text-indigo-500 hover:bg-indigo-100'}`} title="Ekstre"><FileText size={16} /></button>
                      <button onClick={() => openInlineAction(unit, 'addDue')} className={`p-2 rounded-lg transition-colors inline-flex ${isActionActive && activeAction.type === 'addDue' ? 'bg-red-600 text-white' : 'text-red-500 hover:bg-red-100'}`} title="Borçlandır"><PlusCircle size={16} /></button>
                      <button onClick={() => openInlineAction(unit, 'payment')} className={`text-sm px-3 py-1.5 rounded-lg transition-colors font-medium ${isActionActive && activeAction.type === 'payment' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-200'}`}>Tahsilat</button>
                    </td>
                  </tr>

                  {isActionActive && (
                    <tr className="bg-slate-50 border-b-2 border-slate-200 shadow-inner no-print">
                      <td colSpan="5" className="p-0">
                        <div className="p-4 sm:p-6 bg-white m-3 rounded-xl border border-slate-200 relative shadow-sm">
                          <button onClick={closeInlineAction} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1">&times; Kapat</button>
                          
                          {activeAction.type === 'payment' && (
                            <div className="pr-12"><h3 className="font-bold text-lg mb-4 text-emerald-800">Tahsilat Gir: {unit.name}</h3><form onSubmit={handlePaymentSubmit} className="flex flex-col sm:flex-row gap-4"><input type="date" required className="w-full sm:w-40 border border-slate-300 rounded-lg px-4 py-2" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /><input type="number" required placeholder="Tutar (TL)" className="flex-1 sm:w-32 border border-slate-300 rounded-lg px-4 py-2" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /><div className="flex gap-2"><button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">Tahsil Et</button><button type="button" onClick={closeInlineAction} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg">İptal</button></div></form></div>
                          )}

                          {activeAction.type === 'pastBalance' && (
                            <div className="pr-12"><h3 className="font-bold text-lg mb-4 text-orange-800">Geçmiş Bakiye Gir: {unit.name}</h3><form onSubmit={handlePastBalanceSubmit} className="flex flex-col sm:flex-row gap-4 flex-wrap"><input type="date" required className="w-full sm:w-40 border border-slate-300 rounded-lg px-4 py-2" value={pastBalanceDate} onChange={e => setPastBalanceDate(e.target.value)} /><select value={pastBalanceType} onChange={e => setPastBalanceType(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2 flex-1"><option value="due">Devreden Aidat Borcu (+)</option><option value="fixture">Devreden Demirbaş Borcu (+)</option><option value="extra">Devreden Ekstra Borç (+)</option><option value="payment">Devreden Alacak (-)</option></select><input type="number" required placeholder="Tutar" className="flex-1 sm:w-32 border border-slate-300 rounded-lg px-4 py-2" value={pastBalanceAmount} onChange={e => setPastBalanceAmount(e.target.value)} /><div className="flex gap-2"><button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-lg">Kaydet</button></div></form></div>
                          )}

                          {activeAction.type === 'addDue' && (
                            <div className="pr-12"><h3 className="font-bold text-lg mb-4 text-red-800">Özel Borç Ekle: {unit.name}</h3><form onSubmit={handleAddDueSubmit} className="flex flex-col sm:flex-row gap-4 flex-wrap"><input type="date" required className="w-full sm:w-40 border border-slate-300 rounded-lg px-4 py-2" value={addDueDate} onChange={e => setAddDueDate(e.target.value)} /><select value={addDueType} onChange={e => setAddDueType(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2 flex-1"><option value="due">Normal Aidat</option><option value="fixture">Demirbaş</option><option value="extra">Ekstra</option></select><input type="text" required placeholder="Açıklama" className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-4 py-2" value={addDueDesc} onChange={e => setAddDueDesc(e.target.value)} /><input type="number" required placeholder="Tutar" className="w-full sm:w-32 border border-slate-300 rounded-lg px-4 py-2" value={addDueAmount} onChange={e => setAddDueAmount(e.target.value)} /><div className="flex gap-2"><button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg">Borçlandır</button></div></form></div>
                          )}

                          {activeAction.type === 'edit' && (
                            <div className="pr-12">
                              <h3 className="font-bold text-lg mb-4 text-blue-800">{unit.name} Düzenle</h3>
                              <form onSubmit={handleEditSubmit} className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">Mülkte Kim Oturuyor?</label>
                                  <div className="flex space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200"><input type="radio" name="rs" value="owner" checked={editFormData.residentStatus === 'owner'} onChange={(e) => setEditFormData({...editFormData, residentStatus: e.target.value})} className="w-4 h-4" /><span>Mal Sahibi</span></label>
                                    <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200"><input type="radio" name="rs" value="tenant" checked={editFormData.residentStatus === 'tenant'} onChange={(e) => setEditFormData({...editFormData, residentStatus: e.target.value})} className="w-4 h-4" /><span>Kiracı</span></label>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                                    <h4 className="font-semibold text-slate-700">Mal Sahibi Bilgileri</h4>
                                    <input type="text" placeholder="Ad Soyad" required value={editFormData.ownerName || ''} onChange={(e) => setEditFormData({...editFormData, ownerName: e.target.value})} className="border border-slate-300 rounded-lg px-3 py-2 w-full bg-white" />
                                    <input type="text" placeholder="Telefon" value={editFormData.ownerPhone || ''} onChange={(e) => setEditFormData({...editFormData, ownerPhone: e.target.value})} className="border border-slate-300 rounded-lg px-3 py-2 w-full bg-white" />
                                  </div>
                                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                                    <h4 className="font-semibold text-blue-800">Kiracı Bilgileri</h4>
                                    <input type="text" placeholder="Ad Soyad" value={editFormData.tenantName || ''} onChange={(e) => setEditFormData({...editFormData, tenantName: e.target.value})} className="border border-blue-300 rounded-lg px-3 py-2 w-full bg-white" />
                                    <input type="text" placeholder="Telefon" value={editFormData.tenantPhone || ''} onChange={(e) => setEditFormData({...editFormData, tenantPhone: e.target.value})} className="border border-blue-300 rounded-lg px-3 py-2 w-full bg-white" />
                                  </div>
                                  <div className="bg-amber-50 p-4 rounded-lg space-y-3 border border-amber-200 md:col-span-2">
                                    <h4 className="font-semibold text-amber-800 flex items-center"><Lock size={16} className="mr-2"/> Şifre</h4>
                                    <input type="text" required value={editFormData.password || ''} onChange={(e) => setEditFormData({...editFormData, password: e.target.value})} className="border border-slate-300 rounded-lg px-3 py-1.5 w-48 bg-white font-mono" />
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-slate-100">
                                  <button type="submit" className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-medium">Kaydet</button>
                                  <button type="button" onClick={closeInlineAction} className="bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg">İptal</button>
                                </div>
                              </form>
                            </div>
                          )}

                          {activeAction.type === 'history' && (() => {
                            const filteredEkstre = transactions.filter(t => t.unitId === unit.id && t.type !== 'system_marker').filter(t => {
                               const matchSearch = t.description.toLowerCase().includes(ekstreSearchTerm.toLowerCase());
                               const matchType = ekstreFilterType === 'all' || t.type === ekstreFilterType;
                               return matchSearch && matchType;
                            }).sort((a,b) => new Date(b.date) - new Date(a.date));

                            return (
                              <div className="pr-12">
                                <h3 className="font-bold text-lg text-indigo-800 mb-4">{unit.name} Hesap Hareketleri</h3>
                                <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                                  <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                      <tr><th className="p-3">Tarih</th><th className="p-3">Tür</th><th className="p-3">Açıklama</th><th className="p-3 text-right">Tutar</th><th className="p-3 text-center no-print">İşlem</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {filteredEkstre.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50">
                                          <td className="p-3 text-slate-600">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                                          <td className="p-3">{getTypeBadge(t.type)}</td>
                                          <td className="p-3 text-slate-800 font-medium">{t.description}</td>
                                          <td className={`p-3 text-right font-bold ${t.type === 'payment' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'payment' ? '+' : '-'}{t.amount.toLocaleString('tr-TR')} TL</td>
                                          <td className="p-3 text-center no-print"><button onClick={() => onDeleteTransaction(t.id)} className="text-red-500 p-1"><Trash2 size={16}/></button></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}