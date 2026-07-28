import React, { useState, useMemo } from 'react';
   import { TrendingDown, Upload, Search, Printer, AlertCircle, CheckCircle, X } from 'lucide-react';
   function AdminExpenses({ transactions, onAddTransaction, onAddBulkTransactions }) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
  export default AdminExpenses;
  