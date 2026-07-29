import React, { useState, useMemo, useEffect, useRef, useReducer } from 'react';
import { 
  Building, Store, Home, Users, Wallet, TrendingUp, TrendingDown, 
  LogOut, Plus, FileText, CheckCircle, AlertCircle, Edit, Phone, User, 
  PieChart, Tag, Percent, History, Printer, BookOpen, ClipboardList, 
  Upload, Trash2, List, ChevronDown, ChevronUp, PlusCircle, X, Undo, Cpu,
  Search, Filter, Lock, Calculator, Settings, Info, MessageCircle
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where, setDoc, writeBatch, onSnapshot } from "firebase/firestore";

// --- MODÜLLER ---
import LoginScreen from './components/LoginScreen';
import AdminSettings from './components/AdminSettings';
import AdminOverview from './components/AdminOverview';
import AdminExpenses from './components/AdminExpenses';
import AdminUnits from './components/AdminUnits';
import AdminHistoryTabs from './components/AdminHistoryTabs';
import AdminReport from './components/AdminReport';
import { getTypeBadge } from './components/utils';
import AdminAssembly from './components/AdminAssembly';

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

const generateUnits = () => {
  const units = [];
  for (let i = 1; i <= 44; i++) {
    units.push({ id: `Daire-${i}`, name: `Daire ${i}`, type: 'daire', residentStatus: 'owner', ownerName: `Malik ${i}`, ownerPhone: '', tenantName: '', tenantPhone: '', password: '1234', arsaPayi: 110 });
  }
  const dukkanPaylari = { 45: 140, 46: 140, 47: 70, 48: 70, 49: 70, 50: 90, 51: 321 };
  for (let i = 45; i <= 51; i++) {
    units.push({ id: `Dükkan-${i}`, name: `Dükkan ${i}`, type: 'dukkan', residentStatus: 'owner', ownerName: `Dükkan Sahibi ${i}`, ownerPhone: '', tenantName: '', tenantPhone: '', password: '1234', arsaPayi: dukkanPaylari[i] });
  }
  return units;
};

const EXPENSE_CATEGORIES = ['Elektrik', 'Su', 'Asansör', 'Temizlik', 'Maaş/SGK', 'Kıdem Tazminatı Fonu', 'Bakım/Onarım', 'Diğer'];
const initialSettings = { grossMinimumWage: 33500, sgkEmployerRate: 16.75, unemploymentRate: 2, defaultInflationRate: 35 };

const appReducer = (state, action) => {
  const createLog = (actionName, details, user) => ({ id: Date.now() + Math.random(), date: new Date().toISOString(), action: actionName, details, user });

  switch (action.type) {
    case 'SET_TRANSACTIONS': return { ...state, transactions: action.payload };
    case 'SET_UNITS': {
      const fetchedMap = action.payload.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
      const mergedUnits = state.units.map(u => fetchedMap[u.id] ? { ...u, ...fetchedMap[u.id] } : u);
      return { ...state, units: mergedUnits };
    }
    case 'SET_SETTINGS': return { ...state, settings: action.payload };
    case 'ADD_TRANSACTION': {
      const { transaction, user } = action.payload;
      const typeName = transaction.type === 'due' ? 'Borçlandırma' : transaction.type === 'payment' ? 'Tahsilat' : 'Gider';
      return { ...state, sysLogs: [createLog('EKLEME', `Yeni ${typeName} işlendi. Tutar: ${transaction.amount} TL. Açıklama: ${transaction.description}`, user), ...state.sysLogs] };
    }
    case 'ADD_BULK_TRANSACTIONS': {
      const { transactions, user } = action.payload;
      return { ...state, sysLogs: [createLog('TOPLU YÜKLEME', `${transactions.length} adet işlem Excel/Banka yoluyla toplu eklendi.`, user), ...state.sysLogs] };
    }
    case 'ADD_BULK_DUE': {
      const { type, description, user } = action.payload;
      return { ...state, sysLogs: [createLog('TOPLU BORÇLANDIRMA', `Tüm birimlere ${type} tipinde toplu borç yansıtıldı. Açıklama: ${description}`, user), ...state.sysLogs] };
    }
    case 'DELETE_TRANSACTION': {
      const { tx, user } = action.payload;
      if (!tx) return state;
      const typeName = tx.type === 'due' ? 'Borçlandırma' : tx.type === 'payment' ? 'Tahsilat' : 'Gider';
      return { ...state, sysLogs: [createLog('SİLME', `${typeName} kaydı tamamen silindi. Tutar: ${tx.amount} TL. Açıklama: ${tx.description}`, user), ...state.sysLogs] };
    }
    case 'DELETE_TRANSACTION_GROUP': {
      const { groupId, user } = action.payload;
      return { ...state, sysLogs: [createLog('SİLME (TOPLU)', `Bir işlem grubu ve içerdiği tüm kayıtlar silindi.`, user), ...state.sysLogs] };
    }
    case 'EDIT_TRANSACTION': {
      const { user } = action.payload;
      return { ...state, sysLogs: [createLog('DÜZENLEME', `Bir işlemin detayları (Tutar/Tarih vb.) güncellendi.`, user), ...state.sysLogs] };
    }
    case 'UPDATE_UNIT': {
      const { updatedUnit, user } = action.payload;
      return { ...state, units: state.units.map(u => u.id === updatedUnit.id ? updatedUnit : u), sysLogs: [createLog('BİRİM GÜNCELLEME', `${updatedUnit.name} biriminin sakin/iletişim bilgileri güncellendi.`, user), ...state.sysLogs] };
    }
    case 'UPDATE_BULK_UNITS': {
      const { updatedUnits, user } = action.payload;
      const unitMap = updatedUnits.reduce((acc, curr) => { acc[curr.id] = curr; return acc; }, {});
      return { ...state, units: state.units.map(u => unitMap[u.id] ? { ...u, ...unitMap[u.id] } : u), sysLogs: [createLog('TOPLU BİRİM GÜNCELLEME', `${updatedUnits.length} adet birimin bilgileri toplu olarak güncellendi.`, user), ...state.sysLogs] };
    }
    case 'UPDATE_SETTINGS': {
      const { newSettings, user } = action.payload;
      return { ...state, settings: { ...state.settings, ...newSettings }, sysLogs: [createLog('AYAR GÜNCELLEME', `Sistem bütçe ve maaş parametreleri güncellendi.`, user), ...state.sysLogs] };
    }
    case 'ADD_AUTO_TRANSACTIONS': return state; 
    default: return state;
  }
};

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
    if (remainingPayment >= details.penalty) { details.penaltyBalance = 0; remainingPayment -= details.penalty; } else { details.penaltyBalance = details.penalty - remainingPayment; remainingPayment = 0; }
    if (remainingPayment >= details.due) { details.dueBalance = 0; remainingPayment -= details.due; } else { details.dueBalance = details.due - remainingPayment; remainingPayment = 0; }
    if (remainingPayment >= details.fixture) { details.fixtureBalance = 0; remainingPayment -= details.fixture; } else { details.fixtureBalance = details.fixture - remainingPayment; remainingPayment = 0; }
    if (remainingPayment >= details.extra) { details.extraBalance = 0; remainingPayment -= details.extra; } else { details.extraBalance = details.extra - remainingPayment; remainingPayment = 0; }
    if (remainingPayment >= details.custom) { details.customBalance = 0; remainingPayment -= details.custom; } else { details.customBalance = details.custom - remainingPayment; remainingPayment = 0; }

    details.balance = details.dueBalance + details.fixtureBalance + details.extraBalance + details.customBalance + details.penaltyBalance;

    if (details.dueBalance > 0) totalBekleyenAidat += details.dueBalance;
    if (details.fixtureBalance > 0) totalBekleyenDemirbas += details.fixtureBalance;
    if (details.extraBalance > 0) totalBekleyenEkstra += details.extraBalance;
    if (details.customBalance > 0) totalBekleyenOzel += details.customBalance;
    if (details.penaltyBalance > 0) totalBekleyenFaiz += details.penaltyBalance;
  });

  return { totalKasa, totalGider, totalBekleyenAidat, totalBekleyenDemirbas, totalBekleyenEkstra, totalBekleyenOzel, totalBekleyenFaiz, unitBalances };
};

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
          const pTx = { id: `auto-${year}-${month}-${unit.id}-${Math.random()}`, date: penaltyApplicationDate.toISOString(), type: 'penalty', amount: pAmount, unitId: unit.id, description: `Oto. Gecikme Tazminatı (%5) - ${month}/${year}`, groupId: groupId };
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
        return [{ id: `reminder-${year}-${month}-${Math.random()}`, date: now.toISOString(), type: 'system_marker', amount: 0, unitId: null, description: `Sistem Bildirimi: ${debtorsCount} borçlu malikin cihazına son gün ödeme bildirimi gönderildi.`, groupId: groupId }];
      }
    }
  }
  return [];
};


export default function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [autoToast, setAutoToast] = useState(null);

  const [state, dispatch] = useReducer(appReducer, {
    units: generateUnits(),
    transactions: [],
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
    const unsubTxs = onSnapshot(collection(db, "transactions"), (snapshot) => {
      const fetchedTxs = [];
      snapshot.forEach((doc) => fetchedTxs.push({ id: doc.id, ...doc.data() }));
      fetchedTxs.sort((a, b) => new Date(b.date) - new Date(a.date));
      dispatch({ type: 'SET_TRANSACTIONS', payload: fetchedTxs });
    }, (error) => console.error("İşlemler dinlenemedi:", error));

    const unsubUnits = onSnapshot(collection(db, "units"), (snapshot) => {
      if (!snapshot.empty) {
        const fetchedUnits = [];
        snapshot.forEach((doc) => fetchedUnits.push(doc.data()));
        dispatch({ type: 'SET_UNITS', payload: fetchedUnits });
      }
    }, (error) => console.error("Kişiler dinlenemedi:", error));

    const unsubSettings = onSnapshot(collection(db, "settings"), (snapshot) => {
      if (!snapshot.empty) {
        let fetchedSettings = null;
        snapshot.forEach((doc) => {
          if (doc.id === 'general') fetchedSettings = doc.data();
        });
        if (fetchedSettings) {
          dispatch({ type: 'SET_SETTINGS', payload: fetchedSettings });
        }
      }
    }, (error) => console.error("Ayarlar dinlenemedi:", error));

    return () => {
      unsubTxs();
      unsubUnits();
      unsubSettings();
    };
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
      const autoTxs = [...newPenalties, ...newReminders];
      
      const batch = writeBatch(db);
      autoTxs.forEach(tx => {
        const docRef = doc(collection(db, "transactions"));
        batch.set(docRef, { ...tx, addedBy: 'Sistem' });
      });
      batch.commit().catch(e => console.error("Otomatik loglar kaydedilemedi", e));

      dispatch({ type: 'ADD_AUTO_TRANSACTIONS', payload: autoTxs });
      
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
      await addDoc(collection(db, "transactions"), {
        ...transaction, date: transaction.date || new Date().toISOString(), addedBy: getUserName()
      });
      dispatch({ type: 'ADD_TRANSACTION', payload: { transaction, user: getUserName() }});
    } catch (e) { 
      console.error("Buluta kaydederken hata oluştu: ", e); 
      alert("HATA: İşlem Firebase'e kaydedilemedi!");
    }
  };

  const addBulkTransactions = async (txsArray) => {
    try {
      const batch = writeBatch(db);
      const groupId = `import-${Date.now()}`;
      
      txsArray.forEach((tx) => {
        const docRef = doc(collection(db, "transactions"));
        batch.set(docRef, {
          ...tx, 
          groupId, 
          date: tx.date || new Date().toISOString(), 
          addedBy: getUserName()
        });
      });
      
      await batch.commit();
      dispatch({ type: 'ADD_BULK_TRANSACTIONS', payload: { transactions: txsArray, user: getUserName() }});
    } catch (e) { 
      console.error("Toplu tahsilat kaydedilemedi: ", e); 
      alert("HATA: Toplu işlem Firebase'e kaydedilemedi!");
    }
  };

  const addBulkDue = async (type, daireAmount, dukkanAmounts, description) => {
    try {
      const batch = writeBatch(db);
      const groupId = `bulk-${Date.now()}`;

      units.forEach((unit) => {
        const amount = unit.type === 'daire' ? Number(daireAmount) : Number(dukkanAmounts[unit.id] || 0);
        if (amount > 0) {
          const docRef = doc(collection(db, "transactions"));
          batch.set(docRef, {
            date: new Date().toISOString(), 
            type, 
            amount, 
            unitId: unit.id, 
            description, 
            groupId,
            addedBy: getUserName()
          });
        }
      });

      await batch.commit();
      dispatch({ type: 'ADD_BULK_DUE', payload: { type, description, user: getUserName() }});
    } catch (e) { 
      console.error("Toplu borçlandırma kaydedilemedi: ", e); 
      alert("HATA: Toplu borçlandırma Firebase'e kaydedilemedi!");
    }
  };
  
  const onUpdateUnit = async (updatedUnit) => {
    try {
      await setDoc(doc(db, "units", String(updatedUnit.id)), updatedUnit, { merge: true });
      dispatch({ type: 'UPDATE_UNIT', payload: { updatedUnit, user: getUserName() }});
      return true;
    } catch (e) { 
      console.error("Kişi buluta kaydedilemedi:", e); 
      return false;
    }
  };

  const onUpdateBulkUnits = async (updatedUnits) => {
    try {
      const batch = writeBatch(db);
      updatedUnits.forEach(u => {
        const ref = doc(db, "units", String(u.id));
        batch.set(ref, u, { merge: true });
      });
      await batch.commit();
      dispatch({ type: 'UPDATE_BULK_UNITS', payload: { updatedUnits, user: getUserName() }});
      return true;
    } catch (e) { 
      console.error("Kişiler toplu olarak buluta kaydedilemedi:", e); 
      return false;
    }
  };

  const onEditTransaction = async (id, updatedData) => {
    try {
      await updateDoc(doc(db, "transactions", id), updatedData);
      dispatch({ type: 'EDIT_TRANSACTION', payload: { id, updatedData, user: getUserName() }});
    } catch (e) { 
      console.error("Bulutta güncellenirken hata:", e); 
      alert("HATA: Güncelleme Firebase'e kaydedilemedi!");
    }
  };

  const onUpdateSettings = async (newSettings) => {
    try {
      await setDoc(doc(db, "settings", "general"), newSettings, { merge: true });
      dispatch({ type: 'UPDATE_SETTINGS', payload: { newSettings, user: getUserName() }});
      return true;
    } catch (e) { 
      console.error("Ayarlar buluta kaydedilemedi:", e); 
      return false;
    }
  };

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
          dispatch({ type: 'DELETE_TRANSACTION_GROUP', payload: { groupId: deleteDialog.id, user: getUserName() }});
        } else if (Array.isArray(deleteDialog.id)) {
          for (const tId of deleteDialog.id) {
            await deleteDoc(doc(db, "transactions", tId));
          }
          dispatch({ type: 'DELETE_TRANSACTION_GROUP', payload: { groupId: 'multiple', user: getUserName() }});
        } else {
          const tx = transactions.find(t => t.id === deleteDialog.id);
          await deleteDoc(doc(db, "transactions", deleteDialog.id));
          if(tx) dispatch({ type: 'DELETE_TRANSACTION', payload: { tx, user: getUserName() }});
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
          </div>
        </div>
      )}
    </>
  );
}


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
                </div>
              )}
              {balance > 0 && (
                <button onClick={handleSimulatePayment} className="bg-white text-red-600 px-8 py-3 rounded-full font-bold hover:bg-red-50 transition-colors shadow-lg flex items-center mx-auto"><Wallet size={20} className="mr-2"/> Kart ile Öde (Simülasyon)</button>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden" id="resident-history-print">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 no-print">
                <h3 className="text-lg font-bold text-slate-800 flex items-center"><History className="mr-2 text-slate-500"/> Hesap Hareketlerim</h3>
                <button onClick={() => handlePrint('resident-history-print')} className="text-slate-500 hover:text-slate-800 flex items-center text-sm font-medium"><Printer size={16} className="mr-1"/> Yazdır / PDF</button>
              </div>

              <div className="print-only mb-6 text-center border-b-2 border-slate-800 pb-4 mt-4 px-6">
                <h2 className="text-2xl font-bold uppercase">Yükseller Apartmanı - {unitName} Hesap Ekstresi</h2>
                <p className="text-slate-600">Sayın {residentName} | Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
              </div>

              <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap gap-2 no-print">
                 <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 flex-1 sm:flex-none">
                    <input type="date" className="text-sm outline-none font-medium bg-transparent w-full sm:w-auto" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} title="Başlangıç" />
                    <span className="text-slate-400 font-bold">-</span>
                    <input type="date" className="text-sm outline-none font-medium bg-transparent w-full sm:w-auto" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} title="Bitiş" />
                 </div>
                 <div className="relative flex-1 min-w-[150px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Açıklama ara..." className="w-full pl-9 px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                 </div>
              </div>

              <div className="divide-y divide-slate-100">
                {myTransactions.map(t => (
                  <div key={t.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg hidden sm:block ${t.type === 'payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {t.type === 'payment' ? <TrendingDown size={20}/> : <TrendingUp size={20}/>}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{t.description}</p>
                        <p className="text-xs text-slate-500 font-medium">{new Date(t.date).toLocaleDateString('tr-TR')} • {getTypeBadge(t.type)}</p>
                      </div>
                    </div>
                    <div className={`font-bold text-lg whitespace-nowrap ${t.type === 'payment' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'payment' ? '+' : '-'}{t.amount.toLocaleString('tr-TR')} TL
                    </div>
                  </div>
                ))}
                {myTransactions.length === 0 && <div className="p-8 text-center text-slate-500 font-medium">Kayıt bulunamadı.</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden" id="resident-expenses-print">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center no-print">
               <h3 className="text-lg font-bold text-slate-800 flex items-center"><ClipboardList className="mr-2 text-slate-500"/> Şeffaf Bina Giderleri</h3>
               <button onClick={() => handlePrint('resident-expenses-print')} className="text-slate-500 hover:text-slate-800 flex items-center text-sm font-medium"><Printer size={16} className="mr-1"/> Yazdır</button>
            </div>
            
            <div className="print-only mb-6 text-center border-b-2 border-slate-800 pb-4 mt-4 px-6">
              <h2 className="text-2xl font-bold uppercase">Yükseller Apartmanı - Bina Giderleri Tablosu</h2>
              <p className="text-slate-600">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
            </div>

            <div className="p-4 bg-white border-b border-slate-100 no-print">
               <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Giderlerde ara (Örn: Asansör, Elektrik)..." className="w-full pl-9 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} />
               </div>
            </div>

            <div className="divide-y divide-slate-100">
              {expenses.map(t => (
                <div key={t.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-bold text-slate-800">{t.description}</p>
                    <p className="text-xs text-slate-500 font-medium">{new Date(t.date).toLocaleDateString('tr-TR')} • <span className="text-slate-700">{t.category}</span></p>
                  </div>
                  <div className="font-bold text-slate-800">{t.amount.toLocaleString('tr-TR')} TL</div>
                </div>
              ))}
              {expenses.length === 0 && <div className="p-8 text-center text-slate-500 font-medium">Gider kaydı bulunamadı.</div>}
            </div>
          </div>
        )}

        <footer className="mt-12 mb-8 text-center no-print">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Powered by UKURTCU
          </p>
        </footer>
      </div>
    </div>
  );
}

