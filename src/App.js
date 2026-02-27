import React, { useState, useMemo, useEffect, useRef, useReducer } from 'react';
import { 
  Building, Store, Home, Users, Wallet, TrendingUp, TrendingDown, 
  LogOut, Plus, FileText, CheckCircle, AlertCircle, Edit, Phone, User, 
  PieChart, Tag, Percent, History, Printer, BookOpen, ClipboardList, 
  Upload, Trash2, List, ChevronDown, ChevronUp, PlusCircle, X, Undo, Cpu,
  Search, Filter, Lock, Calculator, Settings, Info
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdzNfCoIg_AKWZyRST7XsLnik18O6UjOE",
  authDomain: "apartmanyonetimi-e3686.firebaseapp.com",
  projectId: "apartmanyonetimi-e3686",
  storageBucket: "apartmanyonetimi-e3686.firebasestorage.app",
  messagingSenderId: "922643542877",
  appId: "1:922643542877:web:d91e1a2efb95eb4cc36eb4",
  measurementId: "G-FE2B13P1CN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- MOCK DATA OLUŞTURUCULAR ---
const generateUnits = () => {
  const units = [];
  // Konutlar (1-44) - Arsa Payı: 110
  for (let i = 1; i <= 44; i++) {
    units.push({ id: `Daire-${i}`, name: `Daire ${i}`, type: 'daire', residentStatus: 'owner', ownerName: `Malik ${i}`, ownerPhone: '', tenantName: '', tenantPhone: '', password: '1234', arsaPayi: 110 });
  }
  // Dükkanlar (45-51) - Arsa Payları Değişken
  const dukkanPaylari = { 45: 140, 46: 140, 47: 70, 48: 70, 49: 70, 50: 90, 51: 321 };
  for (let i = 45; i <= 51; i++) {
    units.push({ id: `Dükkan-${i}`, name: `Dükkan ${i}`, type: 'dukkan', residentStatus: 'owner', ownerName: `Dükkan Sahibi ${i}`, ownerPhone: '', tenantName: '', tenantPhone: '', password: '1234', arsaPayi: dukkanPaylari[i] });
  }
  return units;
};

const EXPENSE_CATEGORIES = ['Elektrik', 'Su', 'Asansör', 'Temizlik', 'Maaş/SGK', 'Kıdem Tazminatı Fonu', 'Bakım/Onarım', 'Diğer'];

const initialTransactions = [];

const initialSettings = {
  grossMinimumWage: '',
  sgkEmployerRate: 16.75,
  unemploymentRate: 2,
  defaultInflationRate: ''
};

// ==========================================
// CENTRAL REDUCER (MERKEZİ DURUM YÖNETİMİ)
// ==========================================
const appReducer = (state, action) => {
  const createLog = (actionName, details, user) => ({ id: Date.now() + Math.random(), date: new Date().toISOString(), action: actionName, details, user });

  switch (action.type) {
    case 'SET_TRANSACTIONS': {
      return { ...state, transactions: action.payload };
    }
    case 'ADD_TRANSACTION': {
      const { transaction, user } = action.payload;
      const typeName = transaction.type === 'due' ? 'Borçlandırma' : transaction.type === 'payment' ? 'Tahsilat' : 'Gider';
      return {
        ...state,
        transactions: [{ id: Date.now() + Math.random(), ...transaction, date: transaction.date || new Date().toISOString() }, ...state.transactions],
        sysLogs: [createLog('EKLEME', `Yeni ${typeName} işlendi. Tutar: ${transaction.amount} TL. Açıklama: ${transaction.description}`, user), ...state.sysLogs]
      };
    }
    case 'ADD_BULK_TRANSACTIONS': {
      const { transactions, user } = action.payload;
      const groupId = `import-${Date.now()}`;
      const newTxs = transactions.map((tx, i) => ({ id: Date.now() + Math.random() + i, ...tx, groupId, date: tx.date || new Date().toISOString() }));
      return {
        ...state,
        transactions: [...newTxs, ...state.transactions],
        sysLogs: [createLog('TOPLU YÜKLEME', `${transactions.length} adet işlem Excel/Banka yoluyla toplu eklendi.`, user), ...state.sysLogs]
      };
    }
    case 'ADD_BULK_DUE': {
      const { type, daireAmount, dukkanAmounts, description, user } = action.payload;
      const groupId = `bulk-${Date.now()}`;
      const newTransactions = state.units.map((unit, index) => {
        const amount = unit.type === 'daire' ? Number(daireAmount) : Number(dukkanAmounts[unit.id] || 0);
        return { id: Date.now() + index, date: new Date().toISOString(), type, amount, unitId: unit.id, description, groupId };
      });
      return {
        ...state,
        transactions: [...newTransactions, ...state.transactions],
        sysLogs: [createLog('TOPLU BORÇLANDIRMA', `Tüm birimlere ${type} tipinde toplu borç yansıtıldı. Açıklama: ${description}`, user), ...state.sysLogs]
      };
    }
    case 'DELETE_TRANSACTION': {
      const { id, user } = action.payload;
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return state;
      const typeName = tx.type === 'due' ? 'Borçlandırma' : tx.type === 'payment' ? 'Tahsilat' : 'Gider';
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== id),
        sysLogs: [createLog('SİLME', `${typeName} kaydı tamamen silindi. Tutar: ${tx.amount} TL. Açıklama: ${tx.description}`, user), ...state.sysLogs]
      };
    }
    case 'DELETE_TRANSACTION_GROUP': {
      const { groupId, user } = action.payload;
      return {
        ...state,
        transactions: state.transactions.filter(t => t.groupId !== groupId),
        sysLogs: [createLog('SİLME (TOPLU)', `Bir işlem grubu (grup ID: ${groupId}) ve içerdiği tüm kayıtlar silindi.`, user), ...state.sysLogs]
      };
    }
    case 'EDIT_TRANSACTION': {
      const { id, updatedData, user } = action.payload;
      return {
        ...state,
        transactions: state.transactions.map(t => t.id === id ? { ...t, ...updatedData } : t),
        sysLogs: [createLog('DÜZENLEME', `Bir işlemin detayları (Tutar/Tarih vb.) güncellendi.`, user), ...state.sysLogs]
      };
    }
    case 'UPDATE_UNIT': {
      const { updatedUnit, user } = action.payload;
      return {
        ...state,
        units: state.units.map(u => u.id === updatedUnit.id ? updatedUnit : u),
        sysLogs: [createLog('BİRİM GÜNCELLEME', `${updatedUnit.name} biriminin sakin/iletişim bilgileri güncellendi.`, user), ...state.sysLogs]
      };
    }
    case 'UPDATE_BULK_UNITS': {
      const { updatedUnits, user } = action.payload;
      const unitMap = updatedUnits.reduce((acc, curr) => { acc[curr.id] = curr; return acc; }, {});
      return {
        ...state,
        units: state.units.map(u => unitMap[u.id] ? { ...u, ...unitMap[u.id] } : u),
        sysLogs: [createLog('TOPLU BİRİM GÜNCELLEME', `${updatedUnits.length} adet birimin bilgileri (Kişi/Şifre) Excel'den toplu olarak güncellendi.`, user), ...state.sysLogs]
      };
    }
    case 'UPDATE_SETTINGS': {
      const { newSettings, user } = action.payload;
      return {
        ...state,
        settings: { ...state.settings, ...newSettings },
        sysLogs: [createLog('AYAR GÜNCELLEME', `Sistem bütçe ve maaş parametreleri güncellendi.`, user), ...state.sysLogs]
      };
    }
    case 'ADD_AUTO_TRANSACTIONS': {
      return { ...state, transactions: [...state.transactions, ...action.payload] };
    }
    default: return state;
  }
};


// --- MERKEZİ YAZDIRMA (PRINT) MOTORU ---
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
              h1, h2, h3 { page-break-after: avoid; margin-top: 0 !important; }
              .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl { box-shadow: none !important; }
              .overflow-x-auto, .overflow-y-auto { overflow: visible !important; max-height: none !important; }
              .text-sm { font-size: 9pt !important; }
              .text-xs { font-size: 8pt !important; }
            }
            @media screen {
              .print-only { display: none !important; }
            }
            body { padding: 0; background: white; color: black; font-family: sans-serif; }
          </style>
        </head>
        <body>
          ${el.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 1000);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } else {
    el.classList.add('print-target');
    try { window.print(); } catch(e) {}
    setTimeout(() => el.classList.remove('print-target'), 500);
  }
};

// --- MERKEZİ HESAPLAMA MOTORU ---
const getBalances = (txs, units) => {
  let totalKasa = 0, totalGider = 0, totalBekleyenAidat = 0, totalBekleyenFaiz = 0, totalBekleyenDemirbas = 0, totalBekleyenEkstra = 0, totalBekleyenOzel = 0; 
  const unitBalances = {};

  units.forEach(u => unitBalances[u.id] = { due: 0, penalty: 0, payment: 0, fixture: 0, extra: 0, custom: 0, balance: 0, dueBalance: 0, penaltyBalance: 0, fixtureBalance: 0, extraBalance: 0, customBalance: 0 });

  txs.forEach(t => {
    if (t.type === 'expense') { totalGider += t.amount; totalKasa -= t.amount; }
    else if (t.type === 'payment') { totalKasa += t.amount; if (t.unitId && unitBalances[t.unitId]) unitBalances[t.unitId].payment += t.amount; }
    else if (t.type === 'due') { if (t.unitId && unitBalances[t.unitId]) unitBalances[t.unitId].due += t.amount; }
    else if (t.type === 'fixture') { if (t.unitId && unitBalances[t.unitId]) unitBalances[t.unitId].fixture += t.amount; }
    else if (t.type === 'extra') { if (t.unitId && unitBalances[t.unitId]) unitBalances[t.unitId].extra += t.amount; }
    else if (t.type === 'custom') { if (t.unitId && unitBalances[t.unitId]) unitBalances[t.unitId].custom += t.amount; }
    else if (t.type === 'penalty') { if (t.unitId && unitBalances[t.unitId]) unitBalances[t.unitId].penalty += t.amount; }
  });

  Object.values(unitBalances).forEach(details => {
    let remainingPayment = details.payment;

    if (remainingPayment >= details.penalty) { details.penaltyBalance = 0; remainingPayment -= details.penalty; }
    else { details.penaltyBalance = details.penalty - remainingPayment; remainingPayment = 0; }

    if (remainingPayment >= details.due) { details.dueBalance = 0; remainingPayment -= details.due; }
    else { details.dueBalance = details.due - remainingPayment; remainingPayment = 0; }
    
    if (remainingPayment >= details.fixture) { details.fixtureBalance = 0; remainingPayment -= details.fixture; }
    else { details.fixtureBalance = details.fixture - remainingPayment; remainingPayment = 0; }

    if (remainingPayment >= details.extra) { details.extraBalance = 0; remainingPayment -= details.extra; }
    else { details.extraBalance = details.extra - remainingPayment; remainingPayment = 0; }

    if (remainingPayment >= details.custom) { details.customBalance = 0; remainingPayment -= details.custom; }
    else { details.customBalance = details.custom - remainingPayment; remainingPayment = 0; }

    details.balance = details.dueBalance + details.fixtureBalance + details.extraBalance + details.customBalance + details.penaltyBalance;

    if (details.dueBalance > 0) totalBekleyenAidat += details.dueBalance;
    if (details.fixtureBalance > 0) totalBekleyenDemirbas += details.fixtureBalance;
    if (details.extraBalance > 0) totalBekleyenEkstra += details.extraBalance;
    if (details.customBalance > 0) totalBekleyenOzel += details.customBalance;
    if (details.penaltyBalance > 0) totalBekleyenFaiz += details.penaltyBalance;
  });

  return { totalKasa, totalGider, totalBekleyenAidat, totalBekleyenDemirbas, totalBekleyenEkstra, totalBekleyenOzel, totalBekleyenFaiz, unitBalances };
};

// --- OTONOM FAİZ MOTORU ---
const runAutoPenalties = (currentTransactions, currentUnits) => {
  if (currentTransactions.length === 0) return [];
  const sortedTxs = [...currentTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const earliestDate = new Date(sortedTxs[0].date);
  const now = new Date();
  
  let checkDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth() + 1, 1);
  const newPenalties = [];
  let simulatedTxs = [...currentTransactions];
  
  while (checkDate <= now) {
    const year = checkDate.getFullYear();
    const month = String(checkDate.getMonth() + 1).padStart(2, '0');
    const groupId = `auto-penalty-${year}-${month}`;
    const penaltyApplicationDate = new Date(year, checkDate.getMonth(), 5, 12, 0, 0);
    
    if (penaltyApplicationDate > now) break;

    const alreadyProcessed = simulatedTxs.some(t => t.groupId === groupId);
    
    if (!alreadyProcessed) {
      const pastTxs = simulatedTxs.filter(t => new Date(t.date) <= penaltyApplicationDate);
      const { unitBalances } = getBalances(pastTxs, currentUnits);
      let monthHasPenalty = false;
      
      currentUnits.forEach((unit) => {
        const b = unitBalances[unit.id];
        const principal = (b.dueBalance || 0) + (b.fixtureBalance || 0) + (b.extraBalance || 0) + (b.customBalance || 0);
        
        if (principal > 0) {
          const pAmount = Number((principal * 0.05).toFixed(2));
          const pTx = {
            id: `auto-${year}-${month}-${unit.id}-${Math.random()}`,
            date: penaltyApplicationDate.toISOString(), type: 'penalty', amount: pAmount, unitId: unit.id, description: `Oto. Gecikme Tazminatı (%5) - ${month}/${year}`, groupId: groupId
          };
          newPenalties.push(pTx); simulatedTxs.push(pTx); monthHasPenalty = true;
        }
      });
      
      if (!monthHasPenalty) {
         const marker = { id: `marker-${year}-${month}-${Math.random()}`, date: penaltyApplicationDate.toISOString(), type: 'system_marker', amount: 0, unitId: null, description: `Sistem Kontrolü (Faizlik Borç Bulunmadı) - ${month}/${year}`, groupId: groupId };
         newPenalties.push(marker); simulatedTxs.push(marker);
      }
    }
    checkDate = new Date(year, checkDate.getMonth() + 1, 1);
  }
  return newPenalties;
};

// --- OTONOM HATIRLATMA MOTORU ---
const runAutoReminders = (currentTransactions, currentUnits) => {
  if (currentTransactions.length === 0) return [];
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  
  if (now.getDate() === lastDayOfMonth && now.getHours() >= 12) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const groupId = `auto-reminder-${year}-${month}`;
    
    const alreadyProcessed = currentTransactions.some(t => t.groupId === groupId);
    
    if (!alreadyProcessed) {
      const { unitBalances } = getBalances(currentTransactions, currentUnits);
      let debtorsCount = 0;
      currentUnits.forEach((unit) => { if (unitBalances[unit.id].balance > 0) debtorsCount++; });
      
      if (debtorsCount > 0) {
        return [{ id: `reminder-${year}-${month}-${Math.random()}`, date: now.toISOString(), type: 'system_marker', amount: 0, unitId: null, description: `Sistem Bildirimi: ${debtorsCount} borçlu malikin cihazına (Telefon/Bilgisayar) son gün ödeme bildirimi gönderildi.`, groupId: groupId }];
      }
    }
  }
  return [];
};

const getTypeBadge = (type) => {
  switch(type) {
    case 'payment': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Tahsilat</span>;
    case 'expense': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Gider</span>;
    case 'due': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Aidat Borcu</span>;
    case 'fixture': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Demirbaş Borcu</span>;
    case 'extra': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Ekstra Borç</span>;
    case 'custom': return <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Özel Borç</span>;
    case 'penalty': return <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Faiz / Ceza</span>;
    case 'system_marker': return <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Sistem Kontrolü</span>;
    default: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{type}</span>;
  }
};


export default function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [autoToast, setAutoToast] = useState(null);

  const [state, dispatch] = useReducer(appReducer, {
    units: generateUnits(),
    transactions: initialTransactions,
    sysLogs: [{ id: 1, date: new Date().toISOString(), action: 'SİSTEM BAŞLATILDI', details: 'Apartman yönetim sistemi aktif edildi.', user: 'Sistem' }],
    settings: initialSettings
  });

  const { units, transactions, sysLogs, settings } = state;

  useEffect(() => {
    const handleWheel = () => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur(); 
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "transactions"));
        const fetchedTxs = [];
        querySnapshot.forEach((doc) => {
          fetchedTxs.push({ id: doc.id, ...doc.data() });
        });
        
        // Verileri tarihe göre yeniden eskiye sıralayalım
        fetchedTxs.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        dispatch({ type: 'SET_TRANSACTIONS', payload: fetchedTxs });
      } catch (e) {
        console.error("Buluttan veriler çekilemedi:", e);
      }
    };

    fetchTransactions();
  }, []);

  const computations = useMemo(() => getBalances(transactions, units), [transactions, units]);

  const lastBilledMonth = useMemo(() => {
    const latestDue = transactions.find(t => t.type === 'due');
    return latestDue ? latestDue.description : 'Henüz borçlandırma yapılmadı';
  }, [transactions]);

  const handleLogin = (userId) => {
    setCurrentUser(userId);
    
    const newPenalties = runAutoPenalties(transactions, units);
    const newReminders = runAutoReminders(transactions, units);
    
    if (newPenalties.length > 0 || newReminders.length > 0) {
      dispatch({ type: 'ADD_AUTO_TRANSACTIONS', payload: [...newPenalties, ...newReminders] });
      
      let msgs = [];
      const penaltyCount = newPenalties.filter(t => t.type === 'penalty').length;
      if (penaltyCount > 0) msgs.push(`Geçmiş aylara ait ${penaltyCount} adet gecikme faizi yansıtıldı.`);
      if (newReminders.length > 0) msgs.push(`Borçlu maliklere son gün ödeme hatırlatması gönderildi.`);
      
      if (msgs.length > 0) {
        setAutoToast(`Sistem taraması: ${msgs.join(' | ')}`);
        setTimeout(() => setAutoToast(null), 7000);
      }
    }
  };
  
  const handleLogout = () => setCurrentUser(null);
  const getUserName = () => currentUser === 'admin' ? 'Yönetici' : currentUser;

  const addTransaction = async (transaction) => {
    try {
      // 1. Önce Firebase'e (Buluta) kaydet
      const docRef = await addDoc(collection(db, "transactions"), {
        ...transaction,
        date: transaction.date || new Date().toISOString(),
        addedBy: getUserName()
      });

      // 2. Sonra anında ekranda görünmesi için sistemi güncelle
      const newTx = { ...transaction, id: docRef.id };
      dispatch({ type: 'ADD_TRANSACTION', payload: { transaction: newTx, user: getUserName() }});
      
    } catch (e) {
      console.error("Buluta kaydederken hata oluştu: ", e);
      alert("Kayıt sırasında bir hata oluştu, internet bağlantınızı kontrol edin.");
    }
  };
  const addBulkTransactions = (txsArray) => dispatch({ type: 'ADD_BULK_TRANSACTIONS', payload: { transactions: txsArray, user: getUserName() }});
  const addBulkDue = (type, daireAmount, dukkanAmounts, description) => dispatch({ type: 'ADD_BULK_DUE', payload: { type, daireAmount, dukkanAmounts, description, user: getUserName() }});
  const onUpdateUnit = (updatedUnit) => dispatch({ type: 'UPDATE_UNIT', payload: { updatedUnit, user: getUserName() }});
  const onUpdateBulkUnits = (updatedUnits) => dispatch({ type: 'UPDATE_BULK_UNITS', payload: { updatedUnits, user: getUserName() }});
  const onEditTransaction = async (id, updatedData) => {
    try {
      await updateDoc(doc(db, "transactions", id), updatedData);
      dispatch({ type: 'EDIT_TRANSACTION', payload: { id, updatedData, user: getUserName() }});
    } catch (e) {
      console.error("Bulutta güncellenirken hata:", e);
    }
  };
  const onUpdateSettings = (newSettings) => dispatch({ type: 'UPDATE_SETTINGS', payload: { newSettings, user: getUserName() }});

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, isGroup: false });
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const deleteTransaction = (id) => { setDeleteDialog({ isOpen: true, id, isGroup: false }); setAdminPassword(''); setPasswordError(''); };
  const deleteTransactionGroup = (groupId) => { setDeleteDialog({ isOpen: true, id: groupId, isGroup: true }); setAdminPassword(''); setPasswordError(''); };
  const deleteMultipleTransactions = (ids) => { setDeleteDialog({ isOpen: true, id: ids, isGroup: false }); setAdminPassword(''); setPasswordError(''); };
  const executeDelete = async (e) => {
    e.preventDefault();
    if (adminPassword === "200584") {
      try {
        if (deleteDialog.isGroup) {
          const q = query(collection(db, "transactions"), where("groupId", "==", deleteDialog.id));
          const snapshot = await getDocs(q);
          snapshot.forEach(async (docItem) => {
            await deleteDoc(doc(db, "transactions", docItem.id));
          });
          dispatch({ type: 'DELETE_TRANSACTION_GROUP', payload: { groupId: deleteDialog.id, user: getUserName() } });
        } else if (Array.isArray(deleteDialog.id)) {
          // YENİ: ÇOKLU SİLME İŞLEMİ
          for (const tId of deleteDialog.id) {
            await deleteDoc(doc(db, "transactions", tId));
            dispatch({ type: 'DELETE_TRANSACTION', payload: { id: tId, user: getUserName() } });
          }
        } else {
          await deleteDoc(doc(db, "transactions", deleteDialog.id));
          dispatch({ type: 'DELETE_TRANSACTION', payload: { id: deleteDialog.id, user: getUserName() } });
        }
        setDeleteDialog({ isOpen: false, id: null, isGroup: false });
      } catch (error) {
        console.error("Buluttan silerken hata:", error);
      }
    } else setPasswordError("Hatalı şifre! Lütfen tekrar deneyin.");
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          body * { visibility: hidden; }
          .print-target, .print-target * { visibility: visible !important; }
          .print-target { position: absolute; left: 0; top: 0; width: 100%; height: auto; margin: 0; padding: 0; background: white; }
          .no-print, .no-print * { display: none !important; }
          .print-only { display: block !important; }
          
          .print-target table { page-break-inside: auto; font-size: 10pt; width: 100%; min-width: auto !important; }
          .print-target tr { page-break-inside: avoid; page-break-after: auto; }
          .print-target thead { display: table-header-group; }
          .print-target th, .print-target td { padding: 6px 8px !important; }
          .print-target h1, .print-target h2, .print-target h3 { page-break-after: avoid; }
          .print-target .shadow-sm, .print-target .shadow-md, .print-target .shadow-lg { box-shadow: none !important; }
          .print-target .overflow-x-auto, .print-target .overflow-y-auto { overflow: visible !important; max-height: none !important; }
          .print-target .text-sm { font-size: 9pt !important; }
          .print-target .text-xs { font-size: 8pt !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}} />

      {autoToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-indigo-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center z-[9999] animate-in fade-in slide-in-from-top-5 border border-indigo-700">
          <Cpu size={24} className="mr-3 text-indigo-400 animate-pulse"/>
          <div className="text-sm font-medium leading-snug">{autoToast}</div>
        </div>
      )}

      {!currentUser && <LoginScreen onLogin={handleLogin} units={units} />}
      
      {currentUser === 'admin' && (
        <AdminDashboard 
          units={units} transactions={transactions} sysLogs={sysLogs} computations={computations} lastBilledMonth={lastBilledMonth} settings={settings}
          onAddTransaction={addTransaction} onAddBulkTransactions={addBulkTransactions} onAddBulkDue={addBulkDue}
          onDeleteTransaction={deleteTransaction} onDeleteTransactionGroup={deleteTransactionGroup} onDeleteMultipleTransactions={deleteMultipleTransactions}
          onEditTransaction={onEditTransaction} onUpdateUnit={onUpdateUnit} onUpdateBulkUnits={onUpdateBulkUnits} onUpdateSettings={onUpdateSettings} onLogout={handleLogout} 
        />
      )}

      {currentUser && currentUser !== 'admin' && (
        <ResidentDashboard 
          unitData={units.find(u => u.id === currentUser)} transactions={transactions} balanceObj={computations.unitBalances[currentUser]}
          onAddTransaction={addTransaction} onLogout={handleLogout} 
        />
      )}

      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm transform transition-all">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-800 flex items-center"><Trash2 className="text-red-500 mr-2" size={20}/> İşlemi Geri Al</h3>
              <button onClick={() => setDeleteDialog({ isOpen: false, id: null, isGroup: false })} className="text-slate-400 hover:text-slate-600 transition-colors">&times;</button>
            </div>
            <p className="text-sm text-slate-600 mb-6">{deleteDialog.isGroup ? "Bu TOPLU işlemi geri almak istediğinize emin misiniz? Gruptaki tüm kayıtlar silinecek ve bakiyeler düzeltilecektir." : Array.isArray(deleteDialog.id) ? `Seçtiğiniz ${deleteDialog.id.length} adet işlemi geri almak istediğinize emin misiniz? Bakiyeler otomatik düzeltilecektir.` : "Bu işlemi geri almak istediğinize emin misiniz? İlgili bakiye otomatik düzeltilecektir."}</p>
            <form onSubmit={executeDelete} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Yönetici Şifresi</label>
                <input type="password" required autoFocus className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-red-500 transition-all" value={adminPassword} onChange={e => { setAdminPassword(e.target.value); setPasswordError(''); }} />
                {passwordError && <p className="text-red-600 text-sm mt-1 font-medium">{passwordError}</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setDeleteDialog({ isOpen: false, id: null, isGroup: false })} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 font-medium transition-colors">İptal</button>
                <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium shadow-sm transition-colors">Onayla ve Sil</button>
              </div>
            </form>
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
    Developed by Ukurtcu©
  </p>
</div>
          </div>
        </div>
      )}
    </>
  );
}

// ==========================================
// 1. GİRİŞ EKRANI (ŞİFRELİ)
// ==========================================
function LoginScreen({ onLogin, units }) {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (selectedRole === 'admin') {
      if (password === '200584') {
        onLogin('admin');
      } else {
        setError('Hatalı yönetici şifresi!');
      }
    } else {
      const unit = units.find(u => u.id === selectedRole);
      if (unit && unit.password === password) {
        onLogin(selectedRole);
      } else {
        setError('Hatalı şifre!');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6 text-blue-600"><Building size={48} /></div>
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Yükseller Apartmanı</h1>
        <p className="text-slate-500 text-center mb-8">Lütfen giriş yapmak istediğiniz rolü ve şifrenizi girin.</p>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Giriş Türü / Birim</label>
            <select className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={selectedRole} onChange={(e) => { setSelectedRole(e.target.value); setError(''); setPassword(''); }}>
              <option value="admin">👨‍💼 Yönetici Girişi</option>
              <optgroup label="Daireler">{units.filter(u => u.type === 'daire').map(u => <option key={u.id} value={u.id}>🏠 {u.name}</option>)}</optgroup>
              <optgroup label="Dükkanlar">{units.filter(u => u.type === 'dukkan').map(u => <option key={u.id} value={u.id}>🏪 {u.name}</option>)}</optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="password" required className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Şifrenizi girin" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
            </div>
            {error && <p className="text-red-500 text-sm mt-1 font-medium">{error}</p>}
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors mt-2">Sisteme Giriş Yap</button>
        </form>

        <div className="mt-6 text-xs text-slate-400 text-center bg-slate-50 p-3 rounded border border-slate-100">
         
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. YÖNETİCİ PANELİ
// ==========================================
function AdminDashboard({ units, transactions, sysLogs, computations, lastBilledMonth, settings, onAddTransaction, onAddBulkTransactions, onAddBulkDue, onDeleteTransaction, onDeleteTransactionGroup, onDeleteMultipleTransactions, onEditTransaction, onUpdateUnit, onUpdateBulkUnits, onUpdateSettings, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); 
  const { totalKasa, totalGider, totalBekleyenAidat, totalBekleyenDemirbas, totalBekleyenEkstra, totalBekleyenOzel, totalBekleyenFaiz, unitBalances } = computations;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building className="text-blue-400" />
            <span className="font-bold text-lg hidden sm:block">Yükseller Apartmanı Yönetici Paneli</span>
            <span className="font-bold text-lg sm:hidden">Yönetici Paneli</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline-flex items-center text-xs font-medium bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30"><Cpu size={14} className="mr-1.5"/> Oto. Faiz Aktif</span>
            <button onClick={onLogout} className="flex items-center text-slate-300 hover:text-white transition-colors"><LogOut size={18} className="mr-1" /> Çıkış</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex-shrink-0 space-y-2 no-print">
          <NavButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<TrendingUp />} text="Genel Durum" />
          <NavButton active={activeTab === 'units'} onClick={() => setActiveTab('units')} icon={<Users />} text="Birimler & Kişiler" />
          <NavButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<PieChart />} text="Finans & Giderler" />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<List />} text="İşlem Geçmişi & İptal" />
          <NavButton active={activeTab === 'report'} onClick={() => setActiveTab('report')} icon={<Printer />} text="Denetçi Raporu" />
          <NavButton active={activeTab === 'assembly'} onClick={() => setActiveTab('assembly')} icon={<BookOpen />} text="Genel Kurul & Bütçe" />
          <div className="pt-4 mt-4 border-t border-slate-200">
             <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings />} text="Sistem Ayarları" />
          </div>
        </div>

        <div className="flex-1">
          {activeTab === 'overview' && <AdminOverview computations={computations} allTransactions={transactions} units={units} />}
          {activeTab === 'units' && <AdminUnits units={units} unitBalances={unitBalances} lastBilledMonth={lastBilledMonth} transactions={transactions} onAddTransaction={onAddTransaction} onAddBulkTransactions={onAddBulkTransactions} onAddBulkDue={onAddBulkDue} onDeleteTransaction={onDeleteTransaction} onEditTransaction={onEditTransaction} onUpdateUnit={onUpdateUnit} onUpdateBulkUnits={onUpdateBulkUnits} />}
          {activeTab === 'expenses' && <AdminExpenses transactions={transactions} onAddTransaction={onAddTransaction} onAddBulkTransactions={onAddBulkTransactions} />}
          {activeTab === 'report' && <AdminReport computations={computations} transactions={transactions} />}
          {activeTab === 'assembly' && <AdminAssembly units={units} computations={computations} transactions={transactions} settings={settings} />}
          {activeTab === 'history' && <AdminHistoryTabs transactions={transactions} sysLogs={sysLogs} onDeleteTransaction={onDeleteTransaction} onDeleteTransactionGroup={onDeleteTransactionGroup} onDeleteMultipleTransactions={onDeleteMultipleTransactions} />}
          {activeTab === 'settings' && <AdminSettings settings={settings} onUpdateSettings={onUpdateSettings} />}
          <div className="mt-8 pb-4 text-center border-t border-slate-200 pt-4 no-print">
  <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">
    © 2026 Yükseller Apartmanı • <span className="text-slate-500">Geliştiren: Ukurtcu © </span>
  </p>
</div>
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, text }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 shadow-sm'}`}>
      {icon}<span>{text}</span>
    </button>
  );
}

// -- Yönetici: Sistem Ayarları (YENİ MODÜL) --
function AdminSettings({ settings, onUpdateSettings }) {
  const [formData, setFormData] = useState(settings);
  const [sysMessage, setSysMessage] = useState(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, [e.target.name]: val === '' ? '' : Number(val) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSysMessage({ text: 'Sistem parametreleri başarıyla güncellendi.', type: 'success' });
    setTimeout(() => setSysMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {sysMessage && (
        <div className={`p-4 rounded-lg flex items-center shadow-md mb-4 ${sysMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          <CheckCircle className="mr-2" size={20} /><span className="font-medium">{sysMessage.text}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center"><Settings className="mr-2 text-slate-500" /> Bütçe ve Maaş Parametreleri</h2>
        <p className="text-slate-500 text-sm mb-6 border-b border-slate-100 pb-4">Burada belirlediğiniz güncel oranlar, Genel Kurul sekmesindeki "Akıllı Bütçe Planlayıcı" tarafından baz alınacak ve tüm hesaplamalarda (personel maaşı, SGK maliyeti vs.) otomatik olarak kullanılacaktır.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 space-y-4">
            <h3 className="font-bold text-blue-800 flex items-center mb-2"><User className="mr-2" size={18}/> Personel ve Maaş Ayarları</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tahmini Brüt Asgari Ücret (Aylık TL)</label>
              <input type="number" name="grossMinimumWage" value={formData.grossMinimumWage} onChange={handleChange} required className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-slate-500 mt-1">Bu tutar üzerinden işveren SGK payı ve kıdem tazminatı hesaplanır.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SGK İşveren Payı (%)</label>
                <div className="relative">
                  <input type="number" step="0.01" name="sgkEmployerRate" value={formData.sgkEmployerRate} onChange={handleChange} required className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">SGK primi işveren payı %21.75'tir. Düzenli ödeme indirimi ile 5 puan inerek <strong>%16.75</strong> olarak uygulanabilir.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">İşsizlik Sigortası Payı (%)</label>
                <div className="relative">
                  <input type="number" step="0.1" name="unemploymentRate" value={formData.unemploymentRate} onChange={handleChange} required className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Örn: 2.0</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-5 rounded-lg border border-amber-100">
            <h3 className="font-bold text-amber-800 flex items-center mb-4"><TrendingUp className="mr-2" size={18}/> Piyasa Enflasyon Ayarı</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Varsayılan Bütçe Artış Oranı (%)</label>
              <div className="relative">
                <input type="number" step="0.1" name="defaultInflationRate" value={formData.defaultInflationRate} onChange={handleChange} required className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2 bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Geçmiş faturalara (Elektrik, Su vs.) gelecek yıl için yansıtılacak tahmini zam oranı.</p>
            </div>
          </div>

          <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-sm">
            Ayarları Kaydet ve Uygula
          </button>
        </form>
      </div>
    </div>
  );
}

// -- Yönetici: Genel Durum --
function AdminOverview({ computations, allTransactions, units }) {
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
      {/* EKRAN İÇİN ÜST KARTLAR (Yazdırırken gizlenecek) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <StatCard title="Kasa Durumu" amount={totalKasa} type={totalKasa >= 0 ? 'positive' : 'negative'} icon={<Wallet />} />
        <StatCard title="Bekleyen Alacaklar" amount={totalBekleyenTumu} type="warning" icon={<AlertCircle />} />
        <StatCard title="Toplam Giderler" amount={totalGider} type="negative" icon={<TrendingDown />} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden" id="overview-print">
        
        {/* KAPSAYICI RAPOR BÖLÜMÜ (Ekran ve Yazdırma için ortak) */}
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6 border-b-2 border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-wide text-slate-800">Genel Durum ve Finansal Analiz Raporu</h2>
              <p className="text-slate-600 mt-1">Yükseller Apartmanı • Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR')}</p>
            </div>
            <button onClick={() => handlePrint('overview-print')} className="no-print bg-slate-800 text-white px-5 py-2.5 rounded-lg flex items-center hover:bg-slate-900 font-bold transition-colors shadow-sm"><Printer size={18} className="mr-2"/> Raporu Yazdır</button>
          </div>

          {/* ANA METRİKLER */}
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

          {/* DETAYLI ANALİZLER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* SOL KOLON: ALACAKLAR VE BİRİMLER */}
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

            {/* SAĞ KOLON: GİDERLER */}
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

        {/* SON İŞLEMLER - SADECE EKRANDA GÖRÜNECEK (Yazdırırken gizlenecek) */}
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

function StatCard({ title, amount, type, icon }) {
  const colors = { positive: 'bg-emerald-50 text-emerald-600', negative: 'bg-red-50 text-red-600', warning: 'bg-amber-50 text-amber-600', neutral: 'bg-slate-50 text-slate-600' };
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
      <div className={`p-3 rounded-full ${colors[type]}`}>{icon}</div>
      <div><p className="text-sm font-medium text-slate-500">{title}</p><p className="text-2xl font-bold text-slate-800">{amount.toLocaleString('tr-TR')} TL</p></div>
    </div>
  );
}

// -- Yönetici: Birimler & Kişiler --
function AdminUnits({ units, unitBalances, lastBilledMonth, transactions, onAddTransaction, onAddBulkTransactions, onAddBulkDue, onDeleteTransaction, onEditTransaction, onUpdateUnit, onUpdateBulkUnits }) {
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

  // FİLTRE DURUMLARI
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, debt, nodebt
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

  const handleEditSubmit = (e) => { e.preventDefault(); onUpdateUnit(editFormData); closeInlineAction(); showMessage("Birim bilgileri ve şifre başarıyla güncellendi."); };
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
      // Eksik sütun ihtimaline karşı diziyi 6 elemana tamamla
      while(cols.length < 6) cols.push('');

      let rawUnit = cols[0].trim();
      let rawOwnerName = cols[1].trim();
      let rawOwnerPhone = cols[2].trim();
      let rawTenantName = cols[3].trim();
      let rawTenantPhone = cols[4].trim();
      let rawPass = cols[5].trim();
      
      const matchedUnit = units.find(u => u.name.toLowerCase() === rawUnit.toLowerCase() || u.id.toLowerCase() === rawUnit.toLowerCase().replace(' ', '-') || u.name.toLowerCase().replace(' ', '') === rawUnit.toLowerCase().replace(' ', ''));
      
      // Kiracı adı doluysa kiracı oturuyor, boşsa malik oturuyor olarak kabul et
      let residentStatus = rawTenantName.length > 0 ? 'tenant' : 'owner';
      
      parsed.push({ 
        id: index, 
        rawUnit, 
        unitId: matchedUnit ? matchedUnit.id : null, 
        unitName: matchedUnit ? matchedUnit.name : 'Bilinmiyor', 
        residentStatus,
        ownerName: rawOwnerName,
        ownerPhone: rawOwnerPhone,
        tenantName: rawTenantName,
        tenantPhone: rawTenantPhone,
        password: rawPass || '1234',
        isValid: !!matchedUnit && (rawOwnerName.length > 0 || rawTenantName.length > 0)
      });
    });
    setUnitImportPreview(parsed);
  };

  const handleUnitImportSubmit = () => {
    const validUnits = unitImportPreview.filter(p => p.isValid).map(p => {
      const existingUnit = units.find(u => u.id === p.unitId);
      return { 
        ...existingUnit, 
        residentStatus: p.residentStatus, 
        ownerName: p.ownerName,
        ownerPhone: p.ownerPhone,
        tenantName: p.tenantName,
        tenantPhone: p.tenantPhone,
        password: p.password 
      };
    });

    if(validUnits.length > 0) {
      onUpdateBulkUnits(validUnits); 
      showMessage(`${validUnits.length} adet birimin bilgileri başarıyla güncellendi.`);
      setShowUnitImportModal(false); setUnitImportText(''); setUnitImportPreview(null);
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
        <button onClick={() => handlePrint('units-print-table')} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center hover:bg-slate-900 text-sm font-medium transition-colors shadow-sm"><Printer size={16} className="mr-2"/> Tabloyu Yazdır</button>
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
                  <li>Eğer dairede kiracı yoksa (mülk sahibi oturuyorsa), kiracı alanlarını boş bırakın. Sistem otomatik olarak "Mal Sahibi" şeklinde kaydedecektir.</li>
                  <li>İlgili hücreleri farenizle seçip Kopyalayın (Ctrl+C). Aşağıdaki kutuya Yapıştırın (Ctrl+V) ve Kontrol Et butonuna basın.</li>
                </ol>
              </div>
              <textarea 
                className="w-full h-40 border border-slate-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none whitespace-pre"
                placeholder="Örnek:&#10;Daire 1    Ahmet Yılmaz    0532111    Ayşe Demir    0555222    1234&#10;Dükkan 45  Mehmet Demir    0555987    (Boş)         (Boş)      9876"
                value={unitImportText} onChange={e => setUnitImportText(e.target.value)}
              ></textarea>
              <div className="flex justify-end mt-4"><button onClick={handleParseUnitImport} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm">Verileri Kontrol Et</button></div>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm text-slate-600">Lütfen aktarılacak verileri kontrol edin. Yalnızca <span className="text-indigo-600 font-bold">Geçerli</span> olanlar sisteme kaydedilecektir.</p>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg mb-4">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 sticky top-0"><tr><th className="p-2 border-b">Birim</th><th className="p-2 border-b">Durum</th><th className="p-2 border-b">Malik Bilgisi</th><th className="p-2 border-b">Kiracı Bilgisi</th><th className="p-2 border-b">Şifre</th><th className="p-2 border-b text-center">Kontrol</th></tr></thead>
                  <tbody>
                    {unitImportPreview.map((row) => (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="p-2"><span className="text-xs text-slate-400 block">{row.rawUnit}</span><span className={row.unitId ? 'font-medium text-slate-800' : 'font-medium text-red-500'}>{row.unitName}</span></td>
                        <td className="p-2"><span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.residentStatus === 'tenant' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{row.residentStatus === 'tenant' ? 'Kiracı Oturuyor' : 'Mal Sahibi'}</span></td>
                        <td className="p-2"><div className="font-medium text-slate-800">{row.ownerName || '-'}</div><div className="text-xs text-slate-500">{row.ownerPhone}</div></td>
                        <td className="p-2"><div className="font-medium text-slate-800">{row.tenantName || <span className="text-slate-400 italic">Yok</span>}</div><div className="text-xs text-slate-500">{row.tenantPhone}</div></td>
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
            <input type="text" required placeholder="Açıklama / Ay (Örn: Kasım Aidatı, Çatı Onarımı)" className="w-full border border-slate-300 rounded-lg px-4 py-2" value={bulkDesc} onChange={e => setBulkDesc(e.target.value)} />
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto" id="units-print-table">
        <div className="print-only mb-6 text-center border-b-2 border-slate-800 pb-4">
          <h2 className="text-2xl font-bold uppercase tracking-wide">Yükseller Apartmanı - Daire ve Dükkan Listesi</h2>
          <p className="text-slate-600">Filtre: {filterStatus === 'debt' ? 'Borçlular' : filterStatus === 'nodebt' ? 'Borcu Olmayanlar' : 'Tümü'} | Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
              <th className="p-4 font-medium">Birim</th><th className="p-4 font-medium">Sakin / Durum</th><th className="p-4 font-medium">İletişim</th><th className="p-4 font-medium">Bakiye</th><th className="p-4 font-medium text-right no-print">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUnits.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-slate-500">Kriterlere uygun kayıt bulunamadı.</td></tr> : null}
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
                    <td className="p-4"><div className="text-sm text-slate-600 flex items-center">{isTenant ? unit.tenantPhone : unit.ownerPhone ? <><Phone size={12} className="mr-1"/> {isTenant ? unit.tenantPhone : unit.ownerPhone}</> : <span className="text-slate-400 italic">Eksik Bilgi</span>}</div></td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${details.balance > 0 ? 'bg-red-100 text-red-700' : details.balance < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {details.balance > 0 ? `${details.balance.toLocaleString('tr-TR')} TL Borçlu` : details.balance < 0 ? `${Math.abs(details.balance).toLocaleString('tr-TR')} TL Alacaklı` : 'Borcu Yok'}
                      </span>
                      {details.balance > 0 && (
                        <div className="text-[11px] text-slate-500 mt-2 font-medium bg-slate-100 px-2 py-1 rounded-md inline-block">
                          Aidat: {details.dueBalance.toLocaleString('tr-TR')} | Faiz: {details.penaltyBalance.toLocaleString('tr-TR')}
                          {details.fixtureBalance > 0 && ` | D.Baş: ${details.fixtureBalance.toLocaleString('tr-TR')}`}
                          {details.extraBalance > 0 && ` | Eks: ${details.extraBalance.toLocaleString('tr-TR')}`}
                          {details.customBalance > 0 && ` | Özel: ${details.customBalance.toLocaleString('tr-TR')}`}
                        </div>
                      )}
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
                            <div className="pr-12"><h3 className="font-bold text-lg mb-4 text-orange-800">Geçmiş Bakiye Gir: {unit.name}</h3><form onSubmit={handlePastBalanceSubmit} className="flex flex-col sm:flex-row gap-4 flex-wrap"><input type="date" required className="w-full sm:w-40 border border-slate-300 rounded-lg px-4 py-2" value={pastBalanceDate} onChange={e => setPastBalanceDate(e.target.value)} /><select value={pastBalanceType} onChange={e => setPastBalanceType(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2 flex-1"><option value="due">Devreden Aidat Borcu (+)</option><option value="fixture">Devreden Demirbaş Borcu (+)</option><option value="extra">Devreden Ekstra Borç (+)</option><option value="custom">Devreden Özel Borç (+)</option><option value="payment">Devreden Alacak/Fazla Ödeme (-)</option></select><input type="number" required placeholder="Tutar" className="flex-1 sm:w-32 border border-slate-300 rounded-lg px-4 py-2" value={pastBalanceAmount} onChange={e => setPastBalanceAmount(e.target.value)} /><div className="flex gap-2"><button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-lg">Kaydet</button></div></form></div>
                          )}

                          {activeAction.type === 'addDue' && (
                            <div className="pr-12"><h3 className="font-bold text-lg mb-4 text-red-800">Özel Borç Ekle: {unit.name}</h3><form onSubmit={handleAddDueSubmit} className="flex flex-col sm:flex-row gap-4 flex-wrap"><input type="date" required className="w-full sm:w-40 border border-slate-300 rounded-lg px-4 py-2" value={addDueDate} onChange={e => setAddDueDate(e.target.value)} /><select value={addDueType} onChange={e => setAddDueType(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2 flex-1"><option value="due">Normal Aidat</option><option value="fixture">Demirbaş</option><option value="extra">Ekstra/Acil Toplama</option><option value="custom">Özel</option></select><input type="text" required placeholder="Açıklama" className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-4 py-2" value={addDueDesc} onChange={e => setAddDueDesc(e.target.value)} /><input type="number" required placeholder="Tutar" className="w-full sm:w-32 border border-slate-300 rounded-lg px-4 py-2" value={addDueAmount} onChange={e => setAddDueAmount(e.target.value)} /><div className="flex gap-2"><button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg">Borçlandır</button></div></form></div>
                          )}

                          {activeAction.type === 'edit' && (
                            <div className="pr-12">
                              <h3 className="font-bold text-lg mb-4 text-blue-800">{unit.name} Düzenle</h3>
                              <form onSubmit={handleEditSubmit} className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">Mülkte Kim Oturuyor?</label>
                                  <div className="flex space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200"><input type="radio" name="rs" value="owner" checked={editFormData.residentStatus === 'owner'} onChange={(e) => setEditFormData({...editFormData, residentStatus: e.target.value})} className="text-blue-600 focus:ring-blue-500 w-4 h-4" /><span className="font-medium text-slate-700">Mal Sahibi</span></label>
                                    <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200"><input type="radio" name="rs" value="tenant" checked={editFormData.residentStatus === 'tenant'} onChange={(e) => setEditFormData({...editFormData, residentStatus: e.target.value})} className="text-blue-600 focus:ring-blue-500 w-4 h-4" /><span className="font-medium text-slate-700">Kiracı</span></label>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                                    <h4 className="font-semibold text-slate-700">Mal Sahibi Bilgileri</h4>
                                    <input type="text" placeholder="Ad Soyad" required value={editFormData.ownerName} onChange={(e) => setEditFormData({...editFormData, ownerName: e.target.value})} className="border border-slate-300 rounded-lg px-3 py-2 w-full bg-white" />
                                    <input type="text" placeholder="Telefon" value={editFormData.ownerPhone} onChange={(e) => setEditFormData({...editFormData, ownerPhone: e.target.value})} className="border border-slate-300 rounded-lg px-3 py-2 w-full bg-white" />
                                  </div>
                                  {editFormData.residentStatus === 'tenant' && (
                                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                                      <h4 className="font-semibold text-blue-800">Kiracı Bilgileri</h4>
                                      <input type="text" placeholder="Ad Soyad" required value={editFormData.tenantName} onChange={(e) => setEditFormData({...editFormData, tenantName: e.target.value})} className="border border-blue-300 rounded-lg px-3 py-2 w-full bg-white" />
                                      <input type="text" placeholder="Telefon" value={editFormData.tenantPhone} onChange={(e) => setEditFormData({...editFormData, tenantPhone: e.target.value})} className="border border-blue-300 rounded-lg px-3 py-2 w-full bg-white" />
                                    </div>
                                  )}
                                  <div className="bg-amber-50 p-4 rounded-lg space-y-3 border border-amber-200 md:col-span-2">
                                    <h4 className="font-semibold text-amber-800 flex items-center"><Lock size={16} className="mr-2"/> Sistem Giriş Şifresi</h4>
                                    <div className="flex items-center space-x-4">
                                      <span className="text-sm text-slate-600">Bu birimin şifresi:</span>
                                      <input type="text" required value={editFormData.password || ''} onChange={(e) => setEditFormData({...editFormData, password: e.target.value})} className="border border-slate-300 rounded-lg px-3 py-1.5 w-48 bg-white font-mono" />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-slate-100">
                                  <button type="submit" className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 font-medium shadow-sm">Kaydet</button>
                                  <button type="button" onClick={closeInlineAction} className="bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg hover:bg-slate-300 font-medium">İptal</button>
                                </div>
                              </form>
                            </div>
                          )}

                          {activeAction.type === 'history' && (() => {
                            const filteredEkstre = transactions.filter(t => t.unitId === unit.id && t.type !== 'system_marker').filter(t => {
                               const matchSearch = t.description.toLowerCase().includes(ekstreSearchTerm.toLowerCase());
                               const matchType = ekstreFilterType === 'all' || t.type === ekstreFilterType;
                               let matchDate = true;
                               const tDate = new Date(t.date); tDate.setHours(0, 0, 0, 0);
                               if (ekstreStartDate) { const sDate = new Date(ekstreStartDate); sDate.setHours(0, 0, 0, 0); if (tDate < sDate) matchDate = false; }
                               if (ekstreEndDate) { const eDate = new Date(ekstreEndDate); eDate.setHours(23, 59, 59, 999); if (tDate > eDate) matchDate = false; }
                               return matchSearch && matchType && matchDate;
                            }).sort((a,b) => new Date(b.date) - new Date(a.date));

                            return (
                              <div className="pr-12">
                                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
                                  <h3 className="font-bold text-lg text-indigo-800 flex items-center whitespace-nowrap"><FileText className="mr-2" size={20}/> {unit.name} Hesap Hareketleri</h3>
                                  <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
                                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 flex-1 sm:flex-none">
                                      <input type="date" className="text-sm outline-none font-medium bg-transparent w-full sm:w-auto" value={ekstreStartDate} onChange={e => setEkstreStartDate(e.target.value)} title="Başlangıç Tarihi" />
                                      <span className="text-slate-400 font-bold">-</span>
                                      <input type="date" className="text-sm outline-none font-medium bg-transparent w-full sm:w-auto" value={ekstreEndDate} onChange={e => setEkstreEndDate(e.target.value)} title="Bitiş Tarihi" />
                                    </div>
                                    <select className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={ekstreFilterType} onChange={e => setEkstreFilterType(e.target.value)}>
                                      <option value="all">Tümü</option><option value="payment">Tahsilat</option><option value="due">Aidat</option><option value="penalty">Faiz</option>
                                    </select>
                                    <div className="relative flex-1 min-w-[150px]">
                                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input type="text" placeholder="Açıklama ara..." className="w-full pl-9 px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={ekstreSearchTerm} onChange={e => setEkstreSearchTerm(e.target.value)} />
                                    </div>
                                    <button onClick={() => handlePrint(`ekstre-print-${unit.id}`)} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center hover:bg-slate-900 text-sm font-medium w-full sm:w-auto justify-center"><Printer size={16}/></button>
                                  </div>
                                </div>
                                <div id={`ekstre-print-${unit.id}`} className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                                  <div className="print-only mb-6 text-center border-b-2 border-slate-800 pb-4 mt-4">
                                    <h2 className="text-xl font-bold uppercase">Yükseller Apartmanı - {unit.name} Ekstresi</h2>
                                    <p className="text-slate-600">Tarih Aralığı: {ekstreStartDate ? new Date(ekstreStartDate).toLocaleDateString('tr-TR') : 'Başlangıç'} - {ekstreEndDate ? new Date(ekstreEndDate).toLocaleDateString('tr-TR') : 'Bugün'} | Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
                                  </div>
                                  <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 shadow-sm">
                                      <tr><th className="p-3 font-semibold text-slate-700">Tarih</th><th className="p-3 font-semibold text-slate-700">İşlem Türü</th><th className="p-3 font-semibold text-slate-700">Açıklama</th><th className="p-3 font-semibold text-slate-700 text-right">Tutar</th><th className="p-3 font-semibold text-slate-700 text-center no-print">İşlem</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {filteredEkstre.length === 0 ? <tr><td colSpan="5" className="p-4 text-center text-slate-500">Kayıt bulunamadı.</td></tr> : null}
                                      {filteredEkstre.map(t => {
                                        if (editingTxId === t.id) {
                                          return (
                                            <tr key={t.id} className="bg-blue-50/60 border-b border-blue-100 no-print">
                                              <td className="p-2"><input type="date" className="w-full border p-1.5 rounded text-sm" value={editTxFormData.date} onChange={e => setEditTxFormData({...editTxFormData, date: e.target.value})} /></td>
                                              <td className="p-2"><select className="w-full border p-1.5 rounded text-sm" value={editTxFormData.type} onChange={e => setEditTxFormData({...editTxFormData, type: e.target.value})}><option value="payment">Tahsilat</option><option value="due">Aidat Borcu</option><option value="fixture">Demirbaş Borcu</option><option value="extra">Ekstra Borç</option><option value="custom">Özel Borç</option><option value="penalty">Faiz / Ceza</option></select></td>
                                              <td className="p-2"><input type="text" className="w-full border p-1.5 rounded text-sm" value={editTxFormData.description} onChange={e => setEditTxFormData({...editTxFormData, description: e.target.value})} /></td>
                                              <td className="p-2"><input type="number" className="w-full border p-1.5 rounded text-sm text-right" value={editTxFormData.amount} onChange={e => setEditTxFormData({...editTxFormData, amount: e.target.value})} /></td>
                                              <td className="p-2 text-center whitespace-nowrap"><button onClick={saveEditedTx} className="bg-emerald-500 text-white p-1.5 rounded hover:bg-emerald-600 mr-1"><CheckCircle size={16}/></button><button onClick={cancelEditingTx} className="bg-slate-300 text-slate-700 p-1.5 rounded hover:bg-slate-400"><X size={16}/></button></td>
                                            </tr>
                                          );
                                        }
                                        return (
                                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 text-slate-600 whitespace-nowrap">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                                            <td className="p-3">{getTypeBadge(t.type)}</td>
                                            <td className="p-3 text-slate-800 font-medium">{t.description}</td>
                                            <td className={`p-3 text-right font-bold whitespace-nowrap ${t.type === 'payment' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'payment' ? '+' : '-'}{t.amount.toLocaleString('tr-TR')} TL</td>
                                            <td className="p-3 text-center space-x-2 whitespace-nowrap no-print"><button onClick={() => startEditingTx(t)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={16}/></button><button onClick={() => onDeleteTransaction(t.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button></td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                  <div className="p-4 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 text-justify">
                                    <strong>Yasal Bilgilendirme (KMK Md. 20 ve BK Md. 84):</strong> Zamanında ödenmeyen aidat ve ortak gider borçlarına aylık %5 gecikme tazminatı (faiz) uygulanmaktadır. Sistemimiz otonom olarak her ay dönümünde, sadece ödenmemiş "ana para" üzerinden hesaplama yapar (faize faiz işletilmez). Yapılan kısmi ödemeler yasa gereği öncelikle birikmiş faiz borcundan düşülür, kalan tutar ana para borcuna mahsup edilir.
                                  </div>
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

// -- Yönetici: Giderler ve Detaylar --
function AdminExpenses({ transactions, onAddTransaction, onAddBulkTransactions }) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // TOPLU YÜKLEME DURUMLARI
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [sysMessage, setSysMessage] = useState(null);

  const showMessage = (text, type = 'success') => { setSysMessage({ text, type }); setTimeout(() => setSysMessage(null), 4000); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (amount && desc && category && expenseDate) {
      onAddTransaction({ type: 'expense', amount: Number(amount), unitId: null, category: category, description: desc, date: expenseDate });
      setAmount(''); setDesc(''); setExpenseDate(new Date().toISOString().split('T')[0]);
      showMessage("Gider başarıyla kaydedildi.");
    }
  };

  const handleParseImport = () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n'); 
    const parsed = [];
    lines.forEach((line, index) => {
      if (!line.trim()) return;
      const cols = line.split(/\t|;/);
      if (cols.length >= 4) {
        let rawDate = cols[0].trim(), rawCat = cols[1].trim(), rawDesc = cols[2].trim(), rawAmt = cols[3].trim();
        let formattedDate = rawDate;
        if (rawDate.includes('.')) { const parts = rawDate.split('.'); if(parts.length === 3) formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00.000Z`; }
        else if (rawDate.includes('/')) { const parts = rawDate.split('/'); if(parts.length === 3) formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00.000Z`; }
        
        let matchedCat = EXPENSE_CATEGORIES.find(c => c.toLowerCase() === rawCat.toLowerCase()) || 'Diğer';
        
        let cleanVal = rawAmt.replace('TL', '').replace('₺', '').trim();
        if (cleanVal.includes(',') && cleanVal.includes('.')) {
          if (cleanVal.lastIndexOf(',') > cleanVal.lastIndexOf('.')) cleanVal = cleanVal.replace(/\./g, '').replace(',', '.'); else cleanVal = cleanVal.replace(/,/g, ''); 
        } else if (cleanVal.includes(',')) cleanVal = cleanVal.replace(',', '.'); 
        let amt = parseFloat(cleanVal.replace(/[^0-9.-]+/g,""));

        parsed.push({ 
          id: index, rawDate, rawCat, rawDesc, rawAmt, 
          date: formattedDate, category: matchedCat, description: rawDesc, 
          amount: isNaN(amt) ? 0 : amt, 
          isValid: !isNaN(amt) && amt > 0 && formattedDate.length >= 8 && rawDesc.length > 0 
        });
      }
    });
    setImportPreview(parsed);
  };

  const handleImportSubmit = () => {
    const validTxs = importPreview.filter(p => p.isValid).map(p => ({ 
      type: 'expense', amount: p.amount, category: p.category, description: p.description, date: p.date, unitId: null 
    }));
    if (validTxs.length > 0) {
      onAddBulkTransactions(validTxs);
      showMessage(`${validTxs.length} adet gider başarıyla eklendi.`);
      setShowImportModal(false); setImportText(''); setImportPreview(null);
    } else {
      showMessage("İşlenecek geçerli kayıt bulunamadı.", "error");
    }
  };

  const allExpenses = transactions.filter(t => t.type === 'expense');
  const filteredExpenses = allExpenses.filter(e => {
    const searchMatch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
    const catMatch = filterCat === 'all' || e.category === filterCat;
    
    let dateMatch = true;
    const eDate = new Date(e.date);
    eDate.setHours(0, 0, 0, 0);
    
    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      if (eDate < sDate) dateMatch = false;
    }
    if (endDate) {
      const enDate = new Date(endDate);
      enDate.setHours(23, 59, 59, 999);
      if (eDate > enDate) dateMatch = false;
    }

    return searchMatch && catMatch && dateMatch;
  }).sort((a,b) => new Date(b.date) - new Date(a.date));

  const expensesByCategory = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => {
      const cat = curr.category || 'Diğer'; acc[cat] = (acc[cat] || 0) + curr.amount; return acc;
    }, {});
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      {sysMessage && (
        <div className={`p-4 rounded-lg flex items-center shadow-md mb-4 animate-in slide-in-from-top-2 ${sysMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {sysMessage.type === 'error' ? <AlertCircle className="mr-2" size={20} /> : <CheckCircle className="mr-2" size={20} />}<span className="font-bold text-sm">{sysMessage.text}</span>
        </div>
      )}

      {allExpenses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
          {Object.entries(expensesByCategory).sort((a,b) => b[1]-a[1]).map(([cat, total]) => (
            <div key={cat} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-red-500">
              <p className="text-sm text-slate-500 font-medium">{cat}</p><p className="text-lg font-bold text-slate-800 mt-1">{total.toLocaleString('tr-TR')} TL</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 no-print">
         <h2 className="text-xl font-bold text-slate-800">Gider ve Finans Yönetimi</h2>
         <button onClick={() => setShowImportModal(true)} className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2"><Upload size={18}/> Excel'den Gider Yükle</button>
      </div>

      {showImportModal && (
        <div className="bg-white p-6 rounded-xl shadow-xl border-2 border-emerald-500 no-print animate-in zoom-in-95 mb-6 relative">
          <button onClick={() => { setShowImportModal(false); setImportPreview(null); setImportText(''); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X/></button>
          <h3 className="font-bold text-lg text-emerald-800 flex items-center gap-2 mb-4"><Upload size={20}/> Banka / Excel'den Toplu Gider Yükle</h3>
          
          {!importPreview ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg text-sm border border-emerald-100">
                <p className="font-semibold mb-2">Nasıl Yüklenecek?</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Excel dosyanızda şu 4 sütunu sırasıyla yan yana getirin: <strong>Tarih | Kategori | Açıklama | Tutar</strong></li>
                  <li>Önerilen Kategoriler: <span className="italic">{EXPENSE_CATEGORIES.join(', ')}</span></li>
                  <li className="bg-white p-1 rounded mt-1 shadow-sm inline-block">Örnek Satır: <code className="font-mono text-xs">15.04.2023   Elektrik   Ortak Alan Faturası   1250,50</code></li>
                </ol>
              </div>
              <textarea className="w-full h-40 border-2 border-slate-200 rounded-lg p-3 text-sm font-mono focus:border-emerald-500 outline-none transition-all resize-none shadow-inner" placeholder="Satırları buraya yapıştırın..." value={importText} onChange={e => setImportText(e.target.value)}></textarea>
              <button onClick={handleParseImport} className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-emerald-700 active:scale-95 transition-all">Verileri Kontrol Et</button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">Önizleme: Yalnızca <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">GEÇERLİ</span> işaretli kayıtlar eklenecektir.</p>
              <div className="max-h-60 overflow-y-auto border-2 border-slate-100 rounded-lg bg-slate-50 shadow-inner">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 sticky top-0 shadow-sm"><tr className="text-[10px] font-bold uppercase text-slate-500"><th className="p-3">Tarih</th><th className="p-3">Kategori & Açıklama</th><th className="p-3">Tutar</th><th className="p-3 text-center">Durum</th></tr></thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {importPreview.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-700">{row.date ? new Date(row.date).toLocaleDateString('tr-TR') : '-'}</td>
                        <td className="p-3"><p className="font-bold text-slate-800">{row.description || 'Tanımsız'}</p><p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-0.5">{row.category}</p></td>
                        <td className="p-3 font-bold text-red-600">-{row.amount} TL</td>
                        <td className="p-3 text-center">{row.isValid ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold">Geçerli</span> : <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold">Hatalı</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setImportPreview(null)} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-all">Geri Dön</button>
                <button onClick={handleImportSubmit} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all">Geçerli Olanları İşle</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 no-print">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Yeni Gider İşle (Manuel Kasa Çıkışı)</h2>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
          <input type="date" required className="border border-slate-300 rounded-lg px-4 py-2 font-medium" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
          <select className="border border-slate-300 rounded-lg px-4 py-2 bg-white font-medium" value={category} onChange={e => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map(cat => ( <option key={cat} value={cat}>{cat}</option> ))}
          </select>
          <input type="text" required placeholder="Gider Açıklaması (Örn: Çatı Tamiri)" className="flex-1 border border-slate-300 rounded-lg px-4 py-2 font-medium" value={desc} onChange={e => setDesc(e.target.value)} />
          <input type="number" required placeholder="Tutar (TL)" className="w-full md:w-32 border border-slate-300 rounded-lg px-4 py-2 font-bold text-red-600" value={amount} onChange={e => setAmount(e.target.value)} />
          <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 whitespace-nowrap font-bold">Gideri Kaydet</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden" id="expenses-print-table">
        <div className="print-only mb-6 text-center border-b-2 border-slate-800 pb-4 mt-4">
          <h2 className="text-2xl font-bold uppercase">Yükseller Apartmanı - Gider Tablosu</h2>
          <p className="text-slate-600">Kategori: {filterCat === 'all' ? 'Tümü' : filterCat} | Tarih Aralığı: {startDate ? new Date(startDate).toLocaleDateString('tr-TR') : 'Başlangıç'} - {endDate ? new Date(endDate).toLocaleDateString('tr-TR') : 'Bugün'} | Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-50 no-print">
          <h2 className="text-lg font-semibold text-slate-800 whitespace-nowrap">Geçmiş Gider Listesi</h2>
          <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 flex-1 sm:flex-none">
              <input type="date" className="text-sm outline-none font-medium bg-transparent w-full sm:w-auto" value={startDate} onChange={e => setStartDate(e.target.value)} title="Başlangıç Tarihi" />
              <span className="text-slate-400 font-bold">-</span>
              <input type="date" className="text-sm outline-none font-medium bg-transparent w-full sm:w-auto" value={endDate} onChange={e => setEndDate(e.target.value)} title="Bitiş Tarihi" />
            </div>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none font-medium bg-white" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">Tüm Kategoriler</option>
              {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div className="relative flex-1 min-w-[150px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Açıklama ara..." className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => handlePrint('expenses-print-table')} className="bg-slate-800 text-white px-4 py-1.5 rounded-lg flex items-center justify-center hover:bg-slate-900 text-sm font-medium w-full sm:w-auto"><Printer size={16} className="mr-2"/> Yazdır</button>
          </div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {filteredExpenses.map(t => (
            <div key={t.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 gap-2">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 p-2 rounded-lg text-red-600 hidden sm:block"><TrendingDown size={20} /></div>
                <div>
                  <p className="font-medium text-slate-800">{t.description}</p>
                  <p className="text-sm text-slate-500">{new Date(t.date).toLocaleDateString('tr-TR')} • <span className="font-medium text-slate-700">{t.category}</span></p>
                </div>
              </div>
              <div className="font-semibold text-red-600 sm:text-right">-{t.amount.toLocaleString('tr-TR')} TL</div>
            </div>
          ))}
          {filteredExpenses.length === 0 && <div className="p-6 text-center text-slate-500">Gider kaydı bulunamadı.</div>}

          {filteredExpenses.length > 0 && (
            <div className="px-6 py-4 flex justify-between items-center bg-slate-50 border-t-2 border-slate-200">
              <div className="font-bold text-slate-800 text-right w-full">Listelenen Toplam Gider:</div>
              <div className="font-bold text-red-600 ml-4 whitespace-nowrap">-{filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('tr-TR')} TL</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. İŞLEM GEÇMİŞİ VE DENETİM İZİ (LOGLAR)
// ==========================================
function AdminHistoryTabs({ transactions, sysLogs, onDeleteTransaction, onDeleteTransactionGroup, onDeleteMultipleTransactions }) {
  const [activeTab, setActiveTab] = useState('txs'); 
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // YENİ: ÇOKLU SEÇİM HAFIZASI
  const [selectedIds, setSelectedIds] = useState(new Set());

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

// ==========================================
// 3. SAKİN (KULLANICI) PANELİ
// ==========================================
function ResidentDashboard({ unitData, transactions, balanceObj, onAddTransaction, onLogout }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [sysMessage, setSysMessage] = useState(null);
  const notificationSent = useRef(false);

  const [historySearch, setHistorySearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  const unitId = unitData.id;
  const unitName = unitData.name;
  const balance = balanceObj?.balance || 0;
  const dueBalance = balanceObj?.dueBalance || 0;
  const penaltyBalance = balanceObj?.penaltyBalance || 0;
  const fixtureBalance = balanceObj?.fixtureBalance || 0;
  const extraBalance = balanceObj?.extraBalance || 0;
  const customBalance = balanceObj?.customBalance || 0;
  
  const isTenant = unitData.residentStatus === 'tenant';
  const residentName = isTenant ? unitData.tenantName : unitData.ownerName;

  const myTransactions = transactions.filter(t => t.unitId === unitId && t.type !== 'system_marker').filter(t => {
    const matchSearch = t.description.toLowerCase().includes(historySearch.toLowerCase());
    let matchDate = true;
    const tDate = new Date(t.date); tDate.setHours(0, 0, 0, 0);
    if (historyStartDate) { const sDate = new Date(historyStartDate); sDate.setHours(0, 0, 0, 0); if (tDate < sDate) matchDate = false; }
    if (historyEndDate) { const eDate = new Date(historyEndDate); eDate.setHours(23, 59, 59, 999); if (tDate > eDate) matchDate = false; }
    return matchSearch && matchDate;
  }).sort((a,b) => new Date(b.date) - new Date(a.date));

  const expenses = transactions.filter(t => t.type === 'expense').filter(t => t.description.toLowerCase().includes(expenseSearch.toLowerCase())).sort((a,b) => new Date(b.date) - new Date(a.date));

  const handleSimulatePayment = () => { 
    if (balance <= 0) {
      setSysMessage({ text: "Şu an ödenmesi gereken bir borcunuz bulunmuyor.", type: "error" });
      setTimeout(() => setSysMessage(null), 4000);
      return;
    }
    onAddTransaction({ type: 'payment', amount: balance, unitId: unitId, description: 'Online Sistem Ödemesi' });
    setSysMessage({ text: `Teşekkürler, ${balance.toLocaleString('tr-TR')} TL tutarındaki borcunuz sistem üzerinden ödendi.`, type: "success" });
    setTimeout(() => setSysMessage(null), 4000);
  };

  const now = new Date();
  const isLastDay = now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const isPastNoon = now.getHours() >= 12;
  const showUrgentReminder = isLastDay && isPastNoon && balance > 0;

  useEffect(() => {
    if (showUrgentReminder && !notificationSent.current && 'Notification' in window) {
      const sendNotification = () => {
        new Notification('Yükseller Apartmanı - Son Gün Hatırlatması!', {
          body: `Sayın ${residentName}, gecikme faizi işlememesi için gün sonuna kadar ${balance.toLocaleString('tr-TR')} TL tutarındaki borcunuzu ödeyiniz.`,
          icon: 'https://cdn-icons-png.flaticon.com/512/565/565368.png'
        });
        notificationSent.current = true;
      };

      if (Notification.permission === 'granted') {
        sendNotification();
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') sendNotification();
        });
      }
    }
  }, [showUrgentReminder, balance, residentName]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-600 text-white sticky top-0 z-10 shadow-md no-print">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {unitId.includes('Daire') ? <Home className="text-blue-200" /> : <Store className="text-blue-200" />}
            <div><span className="font-bold text-lg block leading-tight">{unitName} Paneli</span><span className="text-xs text-blue-200 hidden sm:block">Hoş geldiniz, {residentName || 'Sakin'}</span></div>
          </div>
          <button onClick={onLogout} className="flex items-center text-blue-100 hover:text-white transition-colors"><LogOut size={18} className="mr-1" /> Çıkış</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {showUrgentReminder && (
          <div className="bg-red-600 text-white p-4 rounded-xl shadow-lg mb-6 flex items-start sm:items-center space-x-3 animate-pulse border-2 border-red-800">
            <AlertCircle size={24} className="flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="font-bold text-lg">Son Gün Hatırlatması!</h4>
              <p className="text-sm text-red-100 font-medium">Bugün ayın son günü. Gecikme faizi (%5) işlememesi için lütfen <strong className="text-white text-base">{balance.toLocaleString('tr-TR')} TL</strong> tutarındaki borcunuzu gün sonuna kadar ödeyiniz.</p>
            </div>
          </div>
        )}

        {sysMessage && (
          <div className={`p-4 rounded-lg flex items-center shadow-md mb-6 ${sysMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {sysMessage.type === 'error' ? <AlertCircle className="mr-2" size={20} /> : <CheckCircle className="mr-2" size={20} />}<span className="font-medium">{sysMessage.text}</span>
          </div>
        )}

        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 no-print">
          <button onClick={() => setActiveTab('summary')} className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${activeTab === 'summary' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>Hesap Özeti</button>
          <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${activeTab === 'expenses' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>Bina Giderleri (Şeffaflık)</button>
        </div>

        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-2xl shadow-sm text-center no-print ${balance > 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
              <p className="text-white/80 font-medium mb-2 uppercase tracking-wider text-sm">Güncel Durum</p>
              <h2 className="text-5xl font-bold mb-2">{Math.abs(balance).toLocaleString('tr-TR')} TL</h2>
              <p className="text-lg opacity-90 mb-4">{balance > 0 ? 'Ödenmesi Gereken Borcunuz Bulunmaktadır' : balance < 0 ? 'Fazla Ödemeniz (Alacağınız) Bulunmaktadır' : 'Tüm Borçlarınız Ödenmiştir'}</p>
              {balance > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-6 text-sm bg-black/10 py-2 px-4 rounded-lg inline-flex">
                  <span>Aidat: <strong className="ml-1">{dueBalance.toLocaleString('tr-TR')} TL</strong></span>
                  <span>Faiz: <strong className="ml-1">{penaltyBalance.toLocaleString('tr-TR')} TL</strong></span>
                  {fixtureBalance > 0 && <span>Demirbaş: <strong className="ml-1">{fixtureBalance.toLocaleString('tr-TR')} TL</strong></span>}
                  {extraBalance > 0 && <span>Ekstra: <strong className="ml-1">{extraBalance.toLocaleString('tr-TR')} TL</strong></span>}
                  {customBalance > 0 && <span>Özel: <strong className="ml-1">{customBalance.toLocaleString('tr-TR')} TL</strong></span>}
                </div>
              )}
              {balance > 0 && (
                <button onClick={handleSimulatePayment} className="bg-white text-red-600 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-slate-50 transition-transform active:scale-95">Hemen Öde (Sanal)</button>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 no-print">
              <h4 className="font-bold flex items-center mb-2 text-blue-900"><Info size={18} className="mr-2" /> Gecikme Tazminatı (Faiz) Hesaplama Yöntemi</h4>
              <p className="mb-2 text-sm text-blue-800"><strong>634 Sayılı KMK Madde 20</strong> uyarınca, aidat ve ortak gider borçlarını zamanında ödemeyen bağımsız bölüm sakinlerine, ödemede geciktikleri her ay için <strong>aylık %5</strong> oranında gecikme tazminatı uygulanır.</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-blue-800">
                <li>Faiz, her ay dönümünde yalnızca ödenmemiş <strong>ana para (aidat, demirbaş vb.)</strong> üzerinden hesaplanır. Faize tekrar faiz (bileşik faiz) işletilmez.</li>
                <li>Borçlar Kanunu Madde 84 gereğince; yaptığınız kısmi ödemeler öncelikle birikmiş gecikme faizi borcunuzdan düşülür. Kalan tutar en eski ana para borcunuza sayılır.</li>
                <li>Sistemimiz bu yasal kuralları otonom olarak şeffaf bir şekilde uygular.</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100" id="resident-history-print">
              <div className="print-only mb-6 text-center border-b-2 border-slate-800 pb-4 mt-4">
                <h2 className="text-2xl font-bold uppercase">Yükseller Apartmanı - {unitName} Ekstresi</h2>
                <p className="text-slate-600">Mevcut Bakiye: {balance > 0 ? `${balance.toLocaleString('tr-TR')} TL Borçlu` : 'Borcu Yok'} | Tarih Aralığı: {historyStartDate ? new Date(historyStartDate).toLocaleDateString('tr-TR') : 'Başlangıç'} - {historyEndDate ? new Date(historyEndDate).toLocaleDateString('tr-TR') : 'Bugün'}</p>
              </div>

              <div className="px-6 py-4 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-50 no-print">
                <h3 className="font-semibold text-slate-800 flex items-center whitespace-nowrap"><FileText className="text-slate-400 mr-2" size={20} /> Hesap Hareketlerim</h3>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
                   <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 flex-1 sm:flex-none">
                    <input type="date" className="text-sm outline-none font-medium bg-transparent w-full sm:w-auto" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} title="Başlangıç Tarihi" />
                    <span className="text-slate-400 font-bold">-</span>
                    <input type="date" className="text-sm outline-none font-medium bg-transparent w-full sm:w-auto" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} title="Bitiş Tarihi" />
                   </div>
                   <div className="relative flex-1 min-w-[150px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="İşlem ara..." className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                   </div>
                   <button onClick={() => handlePrint('resident-history-print')} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center hover:bg-slate-900 text-sm font-medium w-full sm:w-auto justify-center"><Printer size={16}/></button>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {myTransactions.length === 0 ? <div className="p-6 text-center text-slate-500">Kayıt bulunamadı.</div> : myTransactions.map(t => (
                  <div key={t.id} className="p-4 sm:px-6 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-800 flex items-center">{t.type === 'penalty' && <Percent size={14} className="mr-1 text-red-500"/>}{t.description}</p>
                      <p className="text-sm text-slate-500">{new Date(t.date).toLocaleDateString('tr-TR')} {t.type === 'fixture' && ' • Demirbaş'}{t.type === 'extra' && ' • Ekstra'}{t.type === 'custom' && ' • Özel'}</p>
                    </div>
                    <div className={`font-bold ${t.type === 'payment' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'payment' ? 'Ödendi' : (t.type === 'penalty' ? 'Faiz' : 'Borç')} : {t.amount} TL</div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 text-justify">
                <strong>Yasal Bilgilendirme (KMK Md. 20 ve BK Md. 84):</strong> Zamanında ödenmeyen aidat ve ortak gider borçlarına aylık %5 gecikme tazminatı (faiz) uygulanmaktadır. Sistemimiz otonom olarak her ay dönümünde, sadece ödenmemiş "ana para" üzerinden hesaplama yapar (faize faiz işletilmez). Yapılan kısmi ödemeler yasa gereği öncelikle birikmiş faiz borcundan düşülür, kalan tutar ana para borcuna mahsup edilir.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100" id="resident-expense-print">
            <div className="print-only mb-6 text-center border-b-2 border-slate-800 pb-4 mt-4">
              <h2 className="text-2xl font-bold uppercase">Yükseller Apartmanı - Bina Giderleri Raporu</h2>
              <p className="text-slate-600">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
            </div>
            <div className="p-6 border-b border-slate-100 bg-slate-50 rounded-t-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Bina Ortak Giderleri</h3>
                <p className="text-slate-500 text-sm mt-1">Yönetim tarafından sitemiz için yapılan tüm harcamalar.</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                 <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Gider ara..." className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white" value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} />
                 </div>
                 <button onClick={() => handlePrint('resident-expense-print')} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center hover:bg-slate-900 text-sm font-medium"><Printer size={16}/></button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {expenses.length === 0 ? <div className="p-6 text-center text-slate-500">Kayıt bulunamadı.</div> : expenses.map(t => (
                <div key={t.id} className="p-4 sm:px-6 flex justify-between items-center hover:bg-slate-50">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="text-blue-400 hidden sm:block" size={20} />
                    <div><p className="font-medium text-slate-800">{t.description}</p><p className="text-sm text-slate-500">{new Date(t.date).toLocaleDateString('tr-TR')} • <span className="font-medium">{t.category}</span></p></div>
                  </div>
                  <div className="font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{t.amount} TL</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <footer className="mt-12 mb-8 text-center no-print">
  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
    Powered by Ukurtcu ©
  </p>
</footer>
      </div>
    </div>
  );
}

function AdminReport({ computations, transactions }) { 
  const { totalKasa, totalGider, totalBekleyenAidat, totalBekleyenDemirbas, totalBekleyenEkstra, totalBekleyenOzel, totalBekleyenFaiz } = computations;
  const expenses = transactions.filter(t => t.type === 'expense');
  const payments = transactions.filter(t => t.type === 'payment');
  const totalTahsilat = payments.reduce((acc, t) => acc + t.amount, 0);
  const expensesByCategory = expenses.reduce((acc, curr) => { const cat = curr.category || 'Diğer'; acc[cat] = (acc[cat] || 0) + curr.amount; return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <h2 className="text-xl font-bold text-slate-800">Denetim Kurulu Mali Raporu</h2>
        <button onClick={() => handlePrint('printable-report')} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors">
          <Printer size={18} className="mr-2" /> Raporu Yazdır / PDF Al
        </button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200" id="printable-report">
        <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">Yükseller Apartmanı Yönetimi</h1>
          <h2 className="text-lg text-slate-600 mt-1">Denetim Kurulu Mali Dönem Raporu</h2>
          <p className="text-sm text-slate-500 mt-2">Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR')}</p>
        </div>

        <div className="mb-8">
          <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-200 pb-2">1. Genel Finansal Durum Özet Tablosu</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Dönem İçi Toplam Tahsilat</p><p className="text-xl font-bold text-emerald-600">{totalTahsilat.toLocaleString('tr-TR')} TL</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Dönem İçi Toplam Giderler</p><p className="text-xl font-bold text-red-600">-{totalGider.toLocaleString('tr-TR')} TL</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 col-span-2 text-center">
              <p className="text-sm text-slate-300 mb-1">Mevcut Kasa / Banka Bakiyesi</p><p className="text-3xl font-bold text-white">{totalKasa.toLocaleString('tr-TR')} TL</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-200 pb-2">2. Bekleyen Alacaklar (Tahsil Edilemeyenler)</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100"><p className="text-sm text-amber-700 mb-1">Bekleyen Aidat</p><p className="text-xl font-bold text-amber-800">{totalBekleyenAidat.toLocaleString('tr-TR')} TL</p></div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100"><p className="text-sm text-blue-700 mb-1">Bekleyen Demirbaş</p><p className="text-xl font-bold text-blue-800">{totalBekleyenDemirbas.toLocaleString('tr-TR')} TL</p></div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100"><p className="text-sm text-purple-700 mb-1">Bekleyen Ekstra</p><p className="text-xl font-bold text-purple-800">{totalBekleyenEkstra.toLocaleString('tr-TR')} TL</p></div>
            <div className="bg-teal-50 p-4 rounded-lg border border-teal-100"><p className="text-sm text-teal-700 mb-1">Bekleyen Özel</p><p className="text-xl font-bold text-teal-800">{totalBekleyenOzel.toLocaleString('tr-TR')} TL</p></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100"><p className="text-sm text-orange-700 mb-1">Bekleyen Faiz</p><p className="text-xl font-bold text-orange-800">{totalBekleyenFaiz.toLocaleString('tr-TR')} TL</p></div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-200 pb-2">3. Giderlerin Kategorik Dağılımı</h3>
          {Object.keys(expensesByCategory).length === 0 ? <p className="text-slate-500 text-sm">Herhangi bir gider kaydı bulunmamaktadır.</p> : (
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead><tr className="bg-slate-100 text-slate-700"><th className="p-3 border border-slate-200 font-medium">Gider Kalemi</th><th className="p-3 border border-slate-200 font-medium text-right">Toplam Tutar</th></tr></thead>
              <tbody>
                {Object.entries(expensesByCategory).sort((a,b) => b[1]-a[1]).map(([cat, total]) => (
                  <tr key={cat} className="border-b border-slate-200"><td className="p-3 border-r border-slate-200">{cat}</td><td className="p-3 text-right font-medium">{total.toLocaleString('tr-TR')} TL</td></tr>
                ))}
                <tr className="bg-slate-50 font-bold text-slate-800"><td className="p-3 border-r border-slate-200 text-right">GENEL TOPLAM GİDER:</td><td className="p-3 text-right text-red-600">{totalGider.toLocaleString('tr-TR')} TL</td></tr>
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-16 pt-8 grid grid-cols-2 gap-8 text-center">
          <div><p className="font-bold text-slate-800 mb-12">Yönetim Kurulu</p><p className="border-t border-slate-400 pt-2 inline-block w-48">İmza</p></div>
          <div><p className="font-bold text-slate-800 mb-12">Denetim Kurulu</p><p className="border-t border-slate-400 pt-2 inline-block w-48">İmza</p></div>
        </div>
      </div>
    </div>
  );
}

function AdminAssembly({ units, computations, transactions, settings }) { 
  const [docType, setDocType] = useState('butce'); 
  const [meetingType, setMeetingType] = useState('olagan'); 
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('14:00');
  const [meetingPlace, setMeetingPlace] = useState('Site Toplantı Salonu');
  const [extraAgenda, setExtraAgenda] = useState('Acil onarım konularının görüşülmesi');

  const [inflationRate, setInflationRate] = useState(settings.defaultInflationRate); 
  const [budgetItems, setBudgetItems] = useState([]);

  const { totalKasa, totalGider } = computations;
  const totalTahsilat = transactions.filter(t => t.type === 'payment').reduce((acc, t) => acc + t.amount, 0);

  const handleGenerateBudget = () => {
    const expenses = transactions.filter(t => t.type === 'expense');
    
    let dataMonths = 1;
    if (expenses.length > 0) {
      const dates = expenses.map(e => new Date(e.date).getTime());
      dataMonths = Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24 * 30)));
    }
    
    const aggregated = {};
    expenses.forEach(t => { aggregated[t.category] = (aggregated[t.category] || 0) + t.amount; });

    const newItems = EXPENSE_CATEGORIES.map(cat => {
      const monthlyAvg = (aggregated[cat] || 0) / dataMonths;
      let projectedMonthly = monthlyAvg * (1 + (Number(inflationRate) / 100));
      let months = 12;
      let defaultNote = '';
      
      if (cat === 'Maaş/SGK') {
        const tahminiBrut = Number(settings.grossMinimumWage) || 0;
        const isverenSgkPayi = tahminiBrut * (settings.sgkEmployerRate / 100);
        const issizlikSigortasi = tahminiBrut * (settings.unemploymentRate / 100);
        
        projectedMonthly = tahminiBrut + isverenSgkPayi + issizlikSigortasi;
        defaultNote = `Asgari Brüt: ${tahminiBrut}₺, İşveren SGK+İşsizlik: ${(isverenSgkPayi + issizlikSigortasi).toFixed(0)}₺`;
      } else if (cat === 'Kıdem Tazminatı Fonu') {
        const tahminiBrut = Number(settings.grossMinimumWage) || 0;
        projectedMonthly = tahminiBrut / 12;
        defaultNote = `Aylık Kıdem Tazminatı Karşılığı (Brüt Asgari Ücret / 12)`;
      } else if (projectedMonthly === 0) {
         if (cat === 'Elektrik') projectedMonthly = 2500;
         else if (cat === 'Su') projectedMonthly = 800;
         else if (cat === 'Asansör') projectedMonthly = 2000;
         else if (cat === 'Temizlik') projectedMonthly = 1500;
         else projectedMonthly = 1000;
         
         defaultNote = 'Geçmiş veri bulunmadığı için piyasa tahmini üzerinden eklendi.';
      } else {
         if (cat === 'Elektrik' || cat === 'Su') defaultNote = `Aylık ortalama harcama (${monthlyAvg.toFixed(0)} TL) üzerinden tahmini %${inflationRate} artış uygulanmıştır.`;
         else defaultNote = `Geçmiş harcama ortalaması üzerinden enflasyon yansıtıldı.`;
      }

      return { id: cat, category: cat, monthlyAmount: Math.round(projectedMonthly), months: months, amount: Math.round(projectedMonthly * months), notes: defaultNote };
    });
    setBudgetItems(newItems);
  };

  useEffect(() => {
    if (docType === 'butce' && budgetItems.length === 0) {
      handleGenerateBudget();
    }
  }, [docType]);

  const handleBudgetChange = (id, field, value) => {
    setBudgetItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updatedItem = { ...item, [field]: value };
      
      if (field === 'monthlyAmount' || field === 'months') {
        updatedItem.amount = Number(updatedItem.monthlyAmount) * Number(updatedItem.months);
      } 
      else if (field === 'amount') {
        updatedItem.monthlyAmount = Math.round(Number(value) / Number(updatedItem.months));
      }
      
      return updatedItem;
    }));
  };

  const totalAnnualBudget = budgetItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalMonthlyBudget = totalAnnualBudget / 12;
  
  const personelAnnual = budgetItems.filter(i => i.category.includes('Maaş') || i.category.includes('Personel') || i.category.includes('Kıdem')).reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const otherAnnual = totalAnnualBudget - personelAnnual;

  const personelMonthly = personelAnnual / 12;
  const otherMonthly = otherAnnual / 12;

  const totalUnitsCount = units.length; 
  const totalArsaPayi = 5741; 

  const calculateAidat = (arsaPayi) => {
    const esitPay = personelMonthly / totalUnitsCount; 
    const arsaPayiOranliPay = otherMonthly * (arsaPayi / totalArsaPayi); 
    return Math.ceil(esitPay + arsaPayiOranliPay);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 no-print">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><BookOpen className="mr-2 text-blue-600" /> Genel Kurul & Bütçe Evrakları</h2>
        
        <div className="mb-4 flex flex-wrap gap-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <span className="font-semibold text-blue-800">Toplantı Türü:</span>
          <label className="flex items-center cursor-pointer text-blue-900"><input type="radio" name="meetingType" value="olagan" checked={meetingType === 'olagan'} onChange={(e) => setMeetingType(e.target.value)} className="mr-2" /> Olağan Genel Kurul</label>
          <label className="flex items-center cursor-pointer text-blue-900"><input type="radio" name="meetingType" value="olaganustu" checked={meetingType === 'olaganustu'} onChange={(e) => { setMeetingType(e.target.value); if (docType === 'yonetim' || docType === 'denetim') setDocType('cagri'); }} className="mr-2" /> Olağanüstü Genel Kurul</label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Toplantı Tarihi</label><input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Toplantı Saati</label><input type="time" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Toplantı Yeri</label><input type="text" placeholder="Örn: Sığınak, Toplantı Salonu" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={meetingPlace} onChange={e => setMeetingPlace(e.target.value)} /></div>
          {meetingType === 'olaganustu' && ( <div className="md:col-span-3 pt-2 border-t border-slate-200 mt-2"><label className="block text-sm font-medium text-slate-700 mb-1">Olağanüstü Gündem Konusu (Acil Durum)</label><input type="text" placeholder="Örn: Asansör revizyonu ve ek bütçe talebi" className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white" value={extraAgenda} onChange={e => setExtraAgenda(e.target.value)} /></div> )}
        </div>

        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setDocType('butce')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${docType === 'butce' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>İşletme Projesi (Bütçe)</button>
            <button onClick={() => setDocType('cagri')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${docType === 'cagri' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Çağrı Dilekçesi</button>
            <button onClick={() => setDocType('hazirun')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${docType === 'hazirun' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Hazirun Listesi</button>
            {meetingType === 'olagan' && (
              <><button onClick={() => setDocType('yonetim')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${docType === 'yonetim' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Yönetim Raporu</button><button onClick={() => setDocType('denetim')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${docType === 'denetim' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Denetim Raporu</button></>
            )}
          </div>
          <button onClick={() => handlePrint('printable-assembly-doc')} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg flex items-center shadow-sm transition-colors font-medium"><Printer size={18} className="mr-2" /> Belgeyi Yazdır</button>
        </div>
      </div>

      {docType === 'butce' && (
        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 no-print animate-in fade-in">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-6 gap-4">
            <div>
              <h3 className="font-bold text-lg text-emerald-800 flex items-center"><Calculator className="mr-2" size={20}/> Akıllı Bütçe Planlayıcı</h3>
              <p className="text-sm text-emerald-700 mt-1">Geçmiş verilerinizi ve "Sistem Ayarları"ndaki parametreleri kullanarak otomatik taslak oluşturur.</p>
            </div>
            <div className="flex gap-2">
              <div className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center">
                <span className="text-sm text-emerald-700 font-medium mr-2">Enflasyon/Artış:</span>
                <input type="number" className="w-16 border-none outline-none text-emerald-800 font-bold bg-transparent text-right" value={inflationRate} onChange={e => setInflationRate(e.target.value)} />
                <span className="text-emerald-800 font-bold ml-1">%</span>
              </div>
              <button onClick={handleGenerateBudget} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-emerald-700 transition">Hesapla / Yenile</button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-emerald-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-emerald-100/50 text-emerald-800 text-sm">
                <tr>
                  <th className="p-3 w-1/5">Gider Kalemi</th>
                  <th className="p-3 w-1/6">Aylık Tutar (TL)</th>
                  <th className="p-3 w-1/12 text-center">Ay</th>
                  <th className="p-3 w-1/6">Yıllık Tutar (TL)</th>
                  <th className="p-3">Dayanak / Açıklama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {budgetItems.map(item => (
                  <tr key={item.id} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="p-3 font-medium text-slate-700">{item.category}</td>
                    <td className="p-3"><input type="number" className="w-full border border-slate-300 rounded px-3 py-1.5 focus:border-emerald-500 outline-none font-medium text-slate-800" value={item.monthlyAmount} onChange={e => handleBudgetChange(item.id, 'monthlyAmount', e.target.value)} /></td>
                    <td className="p-3"><input type="number" className="w-full border border-slate-300 rounded px-2 py-1.5 focus:border-emerald-500 outline-none font-medium text-slate-800 text-center" value={item.months} onChange={e => handleBudgetChange(item.id, 'months', e.target.value)} /></td>
                    <td className="p-3"><input type="number" className="w-full border border-slate-300 rounded px-3 py-1.5 focus:border-emerald-500 outline-none font-bold text-emerald-700" value={item.amount} onChange={e => handleBudgetChange(item.id, 'amount', e.target.value)} /></td>
                    <td className="p-3"><input type="text" className="w-full border border-slate-300 rounded px-3 py-1.5 focus:border-emerald-500 outline-none text-sm text-slate-600" value={item.notes} onChange={e => handleBudgetChange(item.id, 'notes', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* YAZDIRILACAK RESMİ EVRAKLAR */}
      <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200" id="printable-assembly-doc">
        
        {docType === 'butce' && (
          <div className="text-slate-900 leading-relaxed text-justify">
             <h1 className="text-xl font-bold text-center mb-8 uppercase tracking-wide border-b-2 border-black pb-4">Yükseller Apartmanı Yeni Dönem<br/>Tahmini İşletme Projesi (Bütçe)</h1>
             <p className="mb-6 text-right"><strong>Hazırlanma Tarihi:</strong> {new Date().toLocaleDateString('tr-TR')}</p>
             <p className="mb-4"><strong>Sayın Kat Malikleri;</strong></p>
             <p className="mb-6 indent-8">Kat mülkiyeti kanunu gereği, apartmanımızın önümüzdeki döneme ait tahmini gelir ve giderlerini belirlemek, hizmetlerin aksamadan yürütülmesini sağlamak amacıyla Yönetim Kurulumuzca hazırlanan İşletme Projesi aşağıda sunulmuştur. Bütçe hesaplamalarında geçmiş dönem gerçek verileri, asgari ücret öngörüleri ve güncel piyasa/enflasyon koşulları dikkate alınmıştır.</p>
             
             <h3 className="font-bold text-lg mb-3 underline">1. Tahmini Gider Tablosu</h3>
             <table className="w-full text-left border-collapse border border-black mb-2 text-sm">
                <thead><tr className="bg-slate-100">
                  <th className="p-2 border border-black w-1/3">Gider Kalemi</th>
                  <th className="p-2 border border-black w-1/3 text-center">Hesaplama (Aylık x Ay)</th>
                  <th className="p-2 border border-black w-1/3 text-right">Yıllık Ödenek (TL)</th>
                </tr></thead>
                <tbody>
                  {budgetItems.map(item => {
                    const isEqualShare = item.category.includes('Maaş') || item.category.includes('Personel') || item.category.includes('Kıdem');
                    return (
                      <tr key={item.id} className={isEqualShare ? "bg-indigo-50/60" : "bg-emerald-50/60"}>
                        <td className="p-2 border border-black font-medium">
                          <div className="flex items-center justify-between">
                            <span>{item.category}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isEqualShare ? 'bg-indigo-100 border-indigo-200 text-indigo-800' : 'bg-emerald-100 border-emerald-200 text-emerald-800'}`}>
                              {isEqualShare ? 'Eşit' : 'Arsa Payı'}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 border border-black text-center text-slate-700 font-mono text-xs">{Number(item.monthlyAmount).toLocaleString('tr-TR')} TL x {item.months} Ay</td>
                        <td className="p-2 border border-black text-right font-bold">{Number(item.amount).toLocaleString('tr-TR')} TL</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-200">
                    <td colSpan="2" className="p-2 border border-black font-bold text-right">TOPLAM YILLIK GİDER:</td>
                    <td className="p-2 border border-black font-bold text-right text-lg">{totalAnnualBudget.toLocaleString('tr-TR')} TL</td>
                  </tr>
                </tbody>
             </table>
             <div className="flex flex-wrap gap-4 mb-8 text-xs">
                <div className="flex items-center"><span className="w-3 h-3 bg-indigo-100 border border-indigo-200 inline-block mr-1"></span> Eşit Dağıtılacak Giderler (KMK Md. 20/a)</div>
                <div className="flex items-center"><span className="w-3 h-3 bg-emerald-100 border border-emerald-200 inline-block mr-1"></span> Arsa Payına Göre Dağıtılacak Giderler (KMK Md. 20/b)</div>
             </div>

             <h3 className="font-bold text-lg mb-3 underline">2. Gelir (Aidat) Dağılımı ve Tahsilat Planı (KMK Madde 20)</h3>
             <p className="mb-4 text-sm indent-8">634 Sayılı Kat Mülkiyeti Kanunu Madde 20 gereğince; personel (Maaş/SGK vb.) giderleri bağımsız bölüm sayısına <strong>eşit</strong>, diğer tüm bakım, işletme ve onarım giderleri ise <strong>arsa payı oranına</strong> göre dağıtılmıştır.</p>

             <div className="bg-slate-50 p-6 border border-black rounded-lg mb-8">
                <div className="flex justify-between border-b border-slate-300 pb-2 mb-2">
                  <span className="font-medium text-slate-600">Aylık Toplam Personel Gideri (Eşit Dağıtılacak):</span>
                  <span className="font-bold">{personelMonthly.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL</span>
                </div>
                <div className="flex justify-between border-b border-slate-300 pb-2 mb-2">
                  <span className="font-medium text-slate-600">Aylık Toplam Diğer Giderler (Arsa Payına Göre Dağıtılacak):</span>
                  <span className="font-bold">{otherMonthly.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL</span>
                </div>
                
                <table className="w-full mt-6 text-sm border-collapse border border-slate-300 bg-white">
                  <thead className="bg-slate-200 text-slate-800">
                    <tr><th className="p-2 border border-slate-300 text-left">Birim Tipi / Numarası</th><th className="p-2 border border-slate-300 text-center">Arsa Payı</th><th className="p-2 border border-slate-300 text-right">Önerilen Yeni Aylık Aidat</th></tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border border-slate-300">Konutlar (Daire 1-44 Arası Tümü)</td><td className="p-2 border border-slate-300 text-center text-slate-500">110 / 5741</td><td className="p-2 border border-slate-300 text-right font-bold text-slate-800">{calculateAidat(110).toLocaleString('tr-TR')} TL</td></tr>
                    <tr><td className="p-2 border border-slate-300">Dükkan 45, 46</td><td className="p-2 border border-slate-300 text-center text-slate-500">140 / 5741</td><td className="p-2 border border-slate-300 text-right font-bold text-slate-800">{calculateAidat(140).toLocaleString('tr-TR')} TL</td></tr>
                    <tr><td className="p-2 border border-slate-300">Dükkan 47, 48, 49</td><td className="p-2 border border-slate-300 text-center text-slate-500">70 / 5741</td><td className="p-2 border border-slate-300 text-right font-bold text-slate-800">{calculateAidat(70).toLocaleString('tr-TR')} TL</td></tr>
                    <tr><td className="p-2 border border-slate-300">Dükkan 50</td><td className="p-2 border border-slate-300 text-center text-slate-500">90 / 5741</td><td className="p-2 border border-slate-300 text-right font-bold text-slate-800">{calculateAidat(90).toLocaleString('tr-TR')} TL</td></tr>
                    <tr><td className="p-2 border border-slate-300">Dükkan 51</td><td className="p-2 border border-slate-300 text-center text-slate-500">321 / 5741</td><td className="p-2 border border-slate-300 text-right font-bold text-red-600">{calculateAidat(321).toLocaleString('tr-TR')} TL</td></tr>
                  </tbody>
                </table>
             </div>
             
             <p className="mb-12 indent-8 text-sm italic">* İşbu işletme projesi kat malikleri kurulunda görüşülerek karara bağlanacak olup, onaylanması halinde tebliğ hükmünde sayılacaktır. Ortaya çıkabilecek olağanüstü ve mecburi tamiratlar (çatı, tesisat vs.) için ayrıca ek bütçe kararı alınabilecektir.</p>
             <div className="text-right"><p className="font-bold mb-8">Yükseller Apartmanı Yönetim Kurulu</p><p className="border-t border-black pt-2 inline-block w-48 text-center">İmza</p></div>
          </div>
        )}

        {docType === 'cagri' && (
          <div className="text-slate-900 leading-relaxed">
            <h1 className="text-xl font-bold text-center mb-8 uppercase tracking-wide border-b-2 border-black pb-4">Yükseller Apartmanı Kat Malikleri Kurulu<br/>{meetingType === 'olagan' ? 'Olağan' : 'Olağanüstü'} Genel Kurul Toplantı Çağrısı</h1>
            <p className="mb-4 text-right"><strong>Tarih:</strong> {new Date().toLocaleDateString('tr-TR')}</p>
            <p className="mb-6"><strong>Sayın Kat Maliki;</strong></p>
            <p className="mb-4 indent-8 text-justify">{meetingType === 'olagan' ? 'Yükseller Apartmanı Kat Malikleri Kurulu, yıllık olağan toplantısını yapmak, geçmiş dönemi değerlendirmek ve yeni dönem bütçesi ile yönetimini belirlemek üzere aşağıda belirtilen gündem maddelerini görüşmek için toplanacaktır.' : 'Yükseller Apartmanı Kat Malikleri Kurulu, apartmanımızı ilgilendiren önemli ve acil konuları görüşmek ve karara bağlamak üzere aşağıda belirtilen gündem maddeleriyle olağanüstü toplanacaktır.'}</p>
            <p className="mb-4 indent-8 text-justify">Toplantı <strong>{meetingDate ? new Date(meetingDate).toLocaleDateString('tr-TR') : '.../.../202..'}</strong> tarihinde, saat <strong>{meetingTime}</strong>'da <strong>{meetingPlace}</strong> adresinde yapılacaktır. Bu toplantıda yeterli çoğunluk sağlanamadığı takdirde, ikinci toplantı bir hafta sonra aynı yer ve saatte çoğunluk aranmaksızın yapılacaktır.</p>
            <p className="mb-8 indent-8 text-justify">Kat Mülkiyeti Kanunu uyarınca alınacak kararlar tüm kat maliklerini bağlayacağından, toplantıya katılmanızı veya kendinizi bir vekille temsil ettirmenizi önemle rica ederiz.</p>
            
            <h2 className="font-bold text-lg mb-3 underline">GÜNDEM MADDELERİ:</h2>
            {meetingType === 'olagan' ? (
              <ol className="list-decimal pl-6 space-y-2 mb-12">
                <li>Açılış, yoklama ve toplantı yeter sayısının tespiti.</li><li>Saygı duruşu ve Divan Heyeti'nin seçilmesi.</li><li>Divan Heyeti'ne toplantı tutanaklarını imzalama yetkisi verilmesi.</li><li>Geçmiş dönem Yönetim Kurulu Faaliyet Raporunun ve Denetim Kurulu Raporunun okunması.</li><li>Yönetim ve Denetim Kurullarının ayrı ayrı ibrası (aklanması).</li><li>Yeni dönem İşletme Projesi'nin görüşülmesi ve karara bağlanması.</li><li>Yeni dönem Yönetim ve Denetim Kurulu asil ve yedek üyelerinin seçimi.</li><li>Dilek, temenniler ve kapanış.</li>
              </ol>
            ) : (
              <ol className="list-decimal pl-6 space-y-2 mb-12">
                <li>Açılış, yoklama ve toplantı yeter sayısının tespiti.</li><li>Saygı duruşu ve Divan Heyeti'nin seçilmesi.</li><li>Divan Heyeti'ne toplantı tutanaklarını imzalama yetkisi verilmesi.</li><li><strong>{extraAgenda || '........................................................................'}</strong> konusunun görüşülerek karara bağlanması.</li><li>Dilek, temenniler ve kapanış.</li>
              </ol>
            )}
            <div className="text-right mt-12"><p className="font-bold mb-8">Yükseller Apartmanı Yönetim Kurulu</p><p className="border-t border-black pt-2 inline-block w-48 text-center">İmza</p></div>
          </div>
        )}

        {docType === 'hazirun' && (
          <div className="text-slate-900">
            <h1 className="text-lg font-bold text-center mb-6 uppercase tracking-wide border-b-2 border-black pb-2">Yükseller Apartmanı {meetingType === 'olagan' ? 'Olağan' : 'Olağanüstü'} Genel Kurul Hazirun Cetveli</h1>
            <div className="flex justify-between text-sm mb-4 font-medium"><p><strong>Toplantı Tarihi:</strong> {meetingDate ? new Date(meetingDate).toLocaleDateString('tr-TR') : '...............'}</p><p><strong>Toplantı Yeri:</strong> {meetingPlace}</p></div>
            <table className="w-full text-left border-collapse border border-black text-sm">
              <thead><tr className="bg-slate-100"><th className="p-2 border border-black w-12 text-center">No</th><th className="p-2 border border-black w-32">Birim Adı</th><th className="p-2 border border-black">Malik Adı Soyadı</th><th className="p-2 border border-black w-32 text-center">Asaleten / Vekaleten</th><th className="p-2 border border-black w-32 text-center">İmza</th></tr></thead>
              <tbody>
                {units.map((unit, index) => ( <tr key={unit.id}><td className="p-2 border border-black text-center">{index + 1}</td><td className="p-2 border border-black font-medium">{unit.name}</td><td className="p-2 border border-black">{unit.ownerName || '....................................'}</td><td className="p-2 border border-black"></td><td className="p-2 border border-black h-10"></td></tr> ))}
              </tbody>
            </table>
            <div className="mt-8 flex justify-between px-10">
              <div className="text-center"><p className="font-bold mb-8">Divan Başkanı</p><p className="border-t border-black pt-2 w-32">İmza</p></div>
              <div className="text-center"><p className="font-bold mb-8">Yazman</p><p className="border-t border-black pt-2 w-32">İmza</p></div>
            </div>
          </div>
        )}

        {docType === 'yonetim' && (
          <div className="text-slate-900 leading-relaxed text-justify">
            <h1 className="text-xl font-bold text-center mb-8 uppercase tracking-wide border-b-2 border-black pb-4">Yönetim Kurulu Faaliyet Raporu</h1>
            <p className="mb-6 text-right"><strong>Tarih:</strong> {new Date().toLocaleDateString('tr-TR')}</p>
            <p className="mb-4"><strong>Sayın Divan, Değerli Kat Malikleri;</strong></p>
            <p className="mb-4 indent-8">Görevde bulunduğumuz hizmet dönemi içerisinde, sitemizin huzuru, güvenliği ve değerinin korunması amacıyla Kat Mülkiyeti Kanunu ve Yönetim Planı çerçevesinde çalışmalarımız titizlikle yürütülmüştür.</p>
            <p className="mb-4 indent-8">Dönem içerisinde asansör bakımları periyodik olarak yaptırılmış, ortak alan temizlik ve aydınlatma giderleri zamanında karşılanmış, binamızın acil onarım gerektiren fiziki ihtiyaçlarına hızla müdahale edilmiştir. Finansal şeffaflık ilkesi gereği, gelir ve gider tablomuz aşağıda özetlenmiştir:</p>
            <div className="my-8 flex justify-center">
              <table className="w-3/4 text-left border-collapse border border-black">
                <tbody>
                  <tr><td className="p-3 border border-black font-semibold bg-slate-100">Dönem İçi Toplam Gelir (Tahsilat):</td><td className="p-3 border border-black text-right">{totalTahsilat.toLocaleString('tr-TR')} TL</td></tr>
                  <tr><td className="p-3 border border-black font-semibold bg-slate-100">Dönem İçi Toplam Gider (Harcamalar):</td><td className="p-3 border border-black text-right">-{totalGider.toLocaleString('tr-TR')} TL</td></tr>
                  <tr><td className="p-3 border border-black font-bold bg-slate-200">Kasa / Banka Devir Bakiyesi:</td><td className="p-3 border border-black text-right font-bold">{totalKasa.toLocaleString('tr-TR')} TL</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mb-4 indent-8">Sitemizin ortak yaşama dair kurallarına riayet eden ve aidat ödemelerini düzenli yaparak yönetime destek olan tüm komşularımıza teşekkür ederiz. Bekleyen aidat ve faiz alacaklarının hukuki takibi yeni döneme devredilmiştir.</p>
            <p className="mb-12 indent-8">Görev dönemimize ait hesap ve faaliyetlerimizi takdirlerinize sunar, Yönetim Kurulumuzun ibra edilmesini (aklanmasını) saygılarımızla arz ederiz.</p>
            <div className="text-right"><p className="font-bold mb-8">Yönetim Kurulu Başkanı</p><p className="border-t border-black pt-2 inline-block w-48 text-center">İmza</p></div>
          </div>
        )}

        {docType === 'denetim' && (
          <div className="text-slate-900 leading-relaxed text-justify">
            <h1 className="text-xl font-bold text-center mb-8 uppercase tracking-wide border-b-2 border-black pb-4">Denetim Kurulu Raporu</h1>
            <p className="mb-6 text-right"><strong>Tarih:</strong> {new Date().toLocaleDateString('tr-TR')}</p>
            <p className="mb-4"><strong>Yükseller Apartmanı Kat Malikleri Genel Kurul Başkanlığı'na;</strong></p>
            <p className="mb-4 indent-8">Apartmanımız Yönetim Kurulu'nun, geçmiş çalışma dönemine ait hesapları, karar defteri, işletme defteri ile gelir-gider makbuzları ve faturaları kurulumuzca detaylı bir şekilde incelenmiştir.</p>
            <p className="mb-4 indent-8">Yapılan denetimler sonucunda;</p>
            <ul className="list-disc pl-10 mb-4 space-y-2">
              <li>Karar defterinin usulüne uygun tutulduğu, kararların imza altına alındığı,</li><li>Gelirlerin makbuz veya banka dekontları karşılığında tahsil edildiği ve kayıtlara doğru geçirildiği,</li><li>Giderlerin tamamının fatura veya geçerli yasal belgelere dayandığı, harcamaların site menfaatine uygun olduğu,</li><li>Kasa ve banka kayıtları ile defter kayıtlarının birbirini tam olarak tuttuğu ({totalKasa.toLocaleString('tr-TR')} TL nakit mevcudu bulunduğu) tespit edilmiştir.</li>
            </ul>
            <p className="mb-4 indent-8">Yönetim Kurulunun, tahsil edilemeyen borçlara ilişkin Kat Mülkiyeti Kanunu Madde 20 uyarınca aylık %5 gecikme tazminatı işletme yükümlülüğünü yerine getirdiği görülmüştür.</p>
            <p className="mb-12 indent-8">Netice olarak; dürüst, şeffaf ve başarılı bir yönetim sergileyen Yönetim Kurulunun hesap ve işlemlerinin usulüne uygun olduğu anlaşıldığından, Yönetim Kurulunun <strong>İBRA EDİLMESİNİ</strong> Genel Kurulun yüksek takdirlerine saygıyla arz ve teklif ederiz.</p>
            <div className="text-right"><p className="font-bold mb-8">Denetim Kurulu Üyesi / Denetçi</p><p className="border-t border-black pt-2 inline-block w-48 text-center">İmza</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
