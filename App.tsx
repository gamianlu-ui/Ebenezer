
import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, ZoomIn, ZoomOut, FileText, Download, Loader2, Scan, ChevronDown, ChevronUp, 
  Calendar, Pencil, Check, X, ArrowLeftRight, Maximize, Calculator, Banknote, HelpCircle,
  Share2, MessageCircle, Send, Plus, PlusCircle, Coins, Wallet, Scale, Eye, Church
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionType, MONTHS, shouldShowInChurch, isCoreChurchTransaction } from './types';
import { PaperReport } from './components/PaperReport';
import { ChurchReport } from './components/ChurchReport';
import { InputBar } from './components/InputBar';
import { HelpSystem } from './components/HelpSystem';
import { parseDocument, parseTransactionInput } from './services/geminiService';
import { AnimatePresence } from 'motion/react';

const DEFAULT_LOGO = "https://i.ibb.co/C3yvWq8p/idm-logo.png";

const getThirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
};

const safeParseJSON = (str: string | null) => {
  if (!str) return null;
  try {
    const val = JSON.parse(str);
    if (val && typeof val === 'object') return val;
  } catch (e) {
    console.error("Erro ao analisar JSON de armazenamento:", e);
  }
  return null;
};

const evaluateSimpleExpression = (expr: string): number => {
  // Sanitize down to numbers, basic math operators, decimals and spaces
  const sanitized = expr.replace(/[^0-9+\-*/. ]/g, '');
  if (!sanitized.trim()) return 0;
  try {
    if (/^[0-9+\-*/. ]+$/.test(sanitized)) {
      const fn = new Function(`return (${sanitized});`);
      const val = fn();
      if (typeof val === 'number' && !isNaN(val)) {
        return val;
      }
    }
  } catch (err) {
    console.error("Erro na expressão matemática:", err);
  }
  return 0;
};

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const d = safeParseJSON(localStorage.getItem('idm_v14_pro_sync'));
    if (d && Array.isArray(d.transactions)) return d.transactions;
    const dOld = safeParseJSON(localStorage.getItem('idm_report_data'));
    if (dOld && Array.isArray(dOld.transactions)) return dOld.transactions;
    return [];
  });

  const [month, setMonth] = useState<string>(() => {
    const d = safeParseJSON(localStorage.getItem('idm_v14_pro_sync'));
    if (d && d.month) return d.month;
    const dOld = safeParseJSON(localStorage.getItem('idm_report_data'));
    if (dOld && dOld.month) return dOld.month;
    return MONTHS[getThirtyDaysAgo().getMonth()];
  });

  const [year, setYear] = useState<string>(() => {
    const d = safeParseJSON(localStorage.getItem('idm_v14_pro_sync'));
    if (d && d.year) return d.year.toString();
    const dOld = safeParseJSON(localStorage.getItem('idm_report_data'));
    if (dOld && dOld.year) return dOld.year.toString();
    return getThirtyDaysAgo().getFullYear().toString();
  });

  const [prevBalance, setPrevBalance] = useState<string>(() => {
    const d = safeParseJSON(localStorage.getItem('idm_v14_pro_sync'));
    if (d) {
      if (d.prevBalance !== undefined) return d.prevBalance.toString();
      if (d.previousBalance !== undefined) return d.previousBalance.toString();
    }
    const dOld = safeParseJSON(localStorage.getItem('idm_report_data'));
    if (dOld) {
      if (dOld.prevBalance !== undefined) return dOld.prevBalance.toString();
      if (dOld.previousBalance !== undefined) return dOld.previousBalance.toString();
    }
    return '0.00';
  });

  const [zoom, setZoom] = useState(0.40); 
  const [logo, setLogo] = useState<string>(() => {
    const d = safeParseJSON(localStorage.getItem('idm_v14_pro_sync'));
    if (d && d.logo) return d.logo;
    const dOld = safeParseJSON(localStorage.getItem('idm_report_data'));
    if (dOld && dOld.logo) return dOld.logo;
    return DEFAULT_LOGO;
  });

  const [isScanning, setIsScanning] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Transaction | null>(null);

  // Backup e Recuperação de Lançamentos
  const [showBackupBanner, setShowBackupBanner] = useState(false);
  const [backupCount, setBackupCount] = useState(0);
  const [backupMonth, setBackupMonth] = useState('');
  const [backupData, setBackupData] = useState<any>(null);

  const [showSedeModal, setShowSedeModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pdfType, setPdfType] = useState<'official' | 'church'>('official');
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [manualAddDay, setManualAddDay] = useState('');
  const [manualAddType, setManualAddType] = useState<TransactionType>(TransactionType.ENTRY);
  const [manualAddDesc, setManualAddDesc] = useState('');
  const [manualAddValue, setManualAddValue] = useState('');
  const [smartAddText, setSmartAddText] = useState('');
  const [isSmartAddLoading, setIsSmartAddLoading] = useState(false);
  const [showManualFields, setShowManualFields] = useState(false);
  const [sedeSummary, setSedeSummary] = useState({ tithe: 0, semidi: 0, total: 0 });

  // Estados para Conciliação / Conferência de Caixa Físico e Bancos (Auto-salvo)
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileNubank, setReconcileNubank] = useState<string>(() => localStorage.getItem('idm_reconcile_nubank_v1') || '');
  const [reconcileCedulas, setReconcileCedulas] = useState<string>(() => localStorage.getItem('idm_reconcile_cedulas_v1') || '');
  const [reconcileMoedas, setReconcileMoedas] = useState<string>(() => localStorage.getItem('idm_reconcile_moedas_v1') || '');

  const handleNubankChange = (val: string) => {
    setReconcileNubank(val);
    localStorage.setItem('idm_reconcile_nubank_v1', val);
  };
  const handleCedulasChange = (val: string) => {
    setReconcileCedulas(val);
    localStorage.setItem('idm_reconcile_cedulas_v1', val);
  };
  const handleMoedasChange = (val: string) => {
    setReconcileMoedas(val);
    localStorage.setItem('idm_reconcile_moedas_v1', val);
  };

  // Calculadora Simples com Memórias em Guias (Max 3) com Auto-salvamento
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcSlots, setCalcSlots] = useState<{ equation: string; display: string; name?: string }[]>(() => {
    const saved = safeParseJSON(localStorage.getItem('idm_calc_slots_v3'));
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved.slice(0, 3);
    }
    return [{ equation: '', display: '0' }];
  });
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(() => {
    const savedIdx = Number(localStorage.getItem('idm_active_slot_idx_v3'));
    if (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < 3) return savedIdx;
    return 0;
  });
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Estados para renomeação de memória via toque longo
  const [renameSlotIdx, setRenameSlotIdx] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const longPressTimeout = useRef<any>(null);
  const isLongPressActive = useRef(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const persistSlots = (slotsList: { equation: string; display: string; name?: string }[]) => {
    localStorage.setItem('idm_calc_slots_v3', JSON.stringify(slotsList));
  };

  const handleCalcKeyPress = (key: string) => {
    setCalcSlots(prev => {
      const targetIdx = activeSlotIdx < prev.length ? activeSlotIdx : 0;
      const slot = prev[targetIdx] || { equation: '', display: '0' };
      let eq = slot.equation;
      let disp = slot.display;

      if (key === 'C') {
        eq = '';
        disp = '0';
      } else if (key === 'Backspace' || key === '⌫') {
        if (eq.length > 0) {
          eq = eq.trim().slice(0, -1).trim();
          if (eq && !/[+\-*/]$/.test(eq)) {
            try {
              const preview = evaluateSimpleExpression(eq);
              disp = Number(preview.toFixed(4)).toString();
            } catch (e) {}
          } else {
            disp = '0';
          }
        } else {
          eq = '';
          disp = '0';
        }
      } else if (key === '=') {
        if (!eq) return prev;
        try {
          const result = evaluateSimpleExpression(eq);
          const displayResult = Number(result.toFixed(4)).toString();
          disp = displayResult;
          eq = displayResult;
        } catch (err) {
          disp = 'Erro';
        }
      } else if (['+', '-', '*', '/'].includes(key)) {
        if (eq) {
          const lastChar = eq.trim().slice(-1);
          if (['+', '-', '*', '/'].includes(lastChar)) {
            eq = eq.trim().slice(0, -1) + ' ' + key + ' ';
          } else {
            eq = eq + ' ' + key + ' ';
          }
        } else {
          eq = disp + ' ' + key + ' ';
        }
      } else {
        if (key === '.' && eq.slice(-1) === '.') return prev;
        const newEq = eq === '0' && key !== '.' ? key : eq + key;
        eq = newEq;
        if (!/[+\-*/]$/.test(newEq)) {
          try {
            const preview = evaluateSimpleExpression(newEq);
            disp = Number(preview.toFixed(4)).toString();
          } catch (e) {}
        }
      }

      const nextSlots = prev.map((s, idx) => idx === targetIdx ? { equation: eq, display: disp } : s);
      persistSlots(nextSlots);
      return nextSlots;
    });
  };

  const handleAddSlot = () => {
    if (calcSlots.length < 3) {
      const nextSlots = [...calcSlots, { equation: '', display: '0' }];
      setCalcSlots(nextSlots);
      persistSlots(nextSlots);
      const nextIdx = nextSlots.length - 1;
      setActiveSlotIdx(nextIdx);
      localStorage.setItem('idm_active_slot_idx_v3', nextIdx.toString());
    }
  };

  const handleStartPress = (idx: number, e: React.MouseEvent | React.TouchEvent) => {
    isLongPressActive.current = false;
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);

    longPressTimeout.current = setTimeout(() => {
      isLongPressActive.current = true;
      setRenameValue(calcSlots[idx]?.name || '');
      setRenameSlotIdx(idx);
      longPressTimeout.current = null;
    }, 600); // 600ms para toque longo
  };

  const handleEndPress = (idx: number, isClick: boolean) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    
    // Se não completou o toque longo e foi um clique intencional
    if (isClick && !isLongPressActive.current) {
      handleSelectSlot(idx);
    }
    isLongPressActive.current = false;
  };

  const handleSelectSlot = (idx: number) => {
    setActiveSlotIdx(idx);
    localStorage.setItem('idm_active_slot_idx_v3', idx.toString());
  };

  const handleRenameSlot = (idx: number, name: string) => {
    setCalcSlots(prev => {
      const nextSlots = prev.map((s, i) => i === idx ? { ...s, name: name || undefined } : s);
      persistSlots(nextSlots);
      return nextSlots;
    });
  };

  const handleCloseSlot = (idxToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (calcSlots.length > 1) {
      const nextSlots = calcSlots.filter((_, idx) => idx !== idxToRemove);
      setCalcSlots(nextSlots);
      persistSlots(nextSlots);
      const nextIdx = activeSlotIdx >= nextSlots.length ? nextSlots.length - 1 : activeSlotIdx;
      setActiveSlotIdx(nextIdx);
      localStorage.setItem('idm_active_slot_idx_v3', nextIdx.toString());
    } else {
      // Se for a única aba, limpa o seu valor
      const nextSlots = [{ equation: '', display: '0' }];
      setCalcSlots(nextSlots);
      persistSlots(nextSlots);
      setActiveSlotIdx(0);
      localStorage.setItem('idm_active_slot_idx_v3', '0');
    }
  };

  const handleCloseCalculator = () => {
    setShowCalculator(false);
  };

  const currentSlot = calcSlots[activeSlotIdx] || calcSlots[0] || { equation: '', display: '0' };
  const calcEquation = currentSlot.equation;
  const calcDisplay = currentSlot.display;

  // Escuta teclas de atalho quando a calculadora está aberta
  useEffect(() => {
    if (!showCalculator) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const allowedKeys = '0123456789+-*/.=cC,';
      if (allowedKeys.includes(e.key)) {
        e.preventDefault();
        const key = e.key === ',' ? '.' : e.key;
        handleCalcKeyPress(key);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleCalcKeyPress('=');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleCalcKeyPress('Backspace');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseCalculator();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCalculator, activeSlotIdx, calcSlots]);

  useEffect(() => {
    // Verifica de forma segura se há backup antigo disponível para restauro
    const oldSaved = localStorage.getItem('idm_report_data');
    if (oldSaved) {
      try {
        const dOld = JSON.parse(oldSaved);
        if (dOld.transactions && dOld.transactions.length > 0) {
          setBackupCount(dOld.transactions.length);
          setBackupMonth(`${dOld.month || 'Desconhecido'}/${dOld.year || '2026'}`);
          setBackupData(dOld);
          
          // Se as transações atuais estiverem vazias ou forem diferentes do backup, oferecemos o banner para recuperação
          if (transactions.length === 0 || JSON.stringify(transactions) !== JSON.stringify(dOld.transactions)) {
            setShowBackupBanner(true);
          }
        }
      } catch(e) { console.error("Erro ao verificar backup antigo:", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('idm_v14_pro_sync', JSON.stringify({
      transactions, month, year, prevBalance, logo
    }));
  }, [transactions, month, year, prevBalance, logo]);

  useEffect(() => {
    if (showAddTransactionModal) {
      setSmartAddText('');
      setShowManualFields(false);
    }
  }, [showAddTransactionModal]);

  const handleRestoreBackup = () => {
    if (backupData) {
      if (backupData.transactions) setTransactions(backupData.transactions);
      if (backupData.month) setMonth(backupData.month);
      if (backupData.year) setYear(backupData.year.toString());
      if (backupData.previousBalance !== undefined) setPrevBalance(backupData.previousBalance.toString());
      else if (backupData.prevBalance !== undefined) setPrevBalance(backupData.prevBalance.toString());
      if (backupData.logo) setLogo(backupData.logo);
      setShowBackupBanner(false);
    }
  };

  const handleJumpTo30DaysAgo = () => {
    const d = getThirtyDaysAgo();
    const targetMonth = MONTHS[d.getMonth()];
    const targetYear = d.getFullYear().toString();
    setMonth(targetMonth);
    setYear(targetYear);
    
    // Tenta restaurar dados de backup antigo se houver
    if (backupData) {
      if (backupData.transactions) setTransactions(backupData.transactions);
      if (backupData.previousBalance !== undefined) setPrevBalance(backupData.previousBalance.toString());
      else if (backupData.prevBalance !== undefined) setPrevBalance(backupData.prevBalance.toString());
      if (backupData.logo) setLogo(backupData.logo);
    }
  };

  const handleAddManualTransaction = (day: string, type: TransactionType, desc: string, valueStr: string) => {
    const val = parseFloat(valueStr);
    if (isNaN(val) || val <= 0) {
      alert("Por favor, insira um valor numérico válido maior que zero.");
      return;
    }

    const cleanDesc = desc.trim().toUpperCase();
    if (!cleanDesc) {
      alert("Por favor, preencha a descrição do lançamento.");
      return;
    }

    const targetDay = (day || new Date().getDate().toString()).padStart(2, '0');
    
    const entryId = uuidv4();
    const exitId = uuidv4();

    const newTx: Transaction = {
      id: entryId,
      day: targetDay,
      description: cleanDesc,
      value: val,
      type: type,
      showInChurch: (cleanDesc === "OFERTA DO CULTO DE CEIA" && type === TransactionType.ENTRY)
    };

    if (cleanDesc === "OFERTA DO CULTO DE CEIA" && type === TransactionType.ENTRY) {
      newTx.linkedId = exitId;
      const linkedTx: Transaction = {
        id: exitId,
        day: targetDay,
        description: "REPASSE SEMIDI",
        value: val,
        type: TransactionType.EXIT,
        linkedId: entryId,
        showInChurch: true
      };
      setTransactions(prev => [...prev, newTx, linkedTx]);
    } else {
      setTransactions(prev => [...prev, newTx]);
    }

    setManualAddDay('');
    setManualAddDesc('');
    setManualAddValue('');
    setManualAddType(TransactionType.ENTRY);
    setShowAddTransactionModal(false);
  };

  const handleSmartAddPDFTransaction = async () => {
    if (!smartAddText.trim() || isSmartAddLoading) return;
    setIsSmartAddLoading(true);
    try {
      const parsed = await parseTransactionInput(smartAddText);
      if (parsed) {
        handleSmartResult(parsed);
        setSmartAddText('');
        setShowAddTransactionModal(false);
      } else {
        alert("Não conseguimos interpretar esse lançamento. Tente por exemplo: 'Arrumar o bebedouro por 250 dia 15' ou 'Dizimo de Maria 100'");
      }
    } catch (e) {
      alert("Houve um erro de processamento temporário. Tente novamente.");
    } finally {
      setIsSmartAddLoading(false);
    }
  };

  // Auto-update Tithe of Headquarters (10%)
  useEffect(() => {
    const titheDesc = "DÍZIMO DA SEDE 10%";
    const titheTx = transactions.find(t => t.description === titheDesc && t.type === TransactionType.EXIT);
    
    const totalEntriesRaw = transactions
      .filter(t => t.type === TransactionType.ENTRY)
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    const totalEntries = Math.round(totalEntriesRaw * 100) / 100;
    
    const correctTitheValue = Math.round(totalEntries * 10) / 100; // 10% rounded to 2 decimals
    
    if (titheTx) {
      // Update only if value is different to avoid infinite loops
      if (Math.abs(titheTx.value - correctTitheValue) > 0.001) {
        setTransactions(prev => prev.map(t => 
          t.id === titheTx.id ? { ...t, value: correctTitheValue } : t
        ));
      }
    } else if (totalEntries > 0) {
      // Create automatically if entries exist
      const lastDay = new Date(parseInt(year), MONTHS.indexOf(month) + 1, 0).getDate().toString().padStart(2, '0');
      setTransactions(prev => [...prev, {
        id: uuidv4(),
        day: lastDay,
        description: titheDesc,
        value: correctTitheValue,
        type: TransactionType.EXIT
      }]);
    }
  }, [transactions, month, year]);

  // Rename existing 'AGUA E ESGOTO' to 'PAG ÁGUA'
  useEffect(() => {
    const normalizeDescription = (desc: any) => {
      if (!desc || typeof desc !== 'string') return false;
      const upper = desc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      return upper.includes("AGUA E ESGOTO");
    };

    const hasOldDesc = transactions.some(t => normalizeDescription(t.description));
    if (hasOldDesc) {
      setTransactions(prev => prev.map(t => {
        if (normalizeDescription(t.description)) {
          return { ...t, description: "PAG ÁGUA" };
        }
        return t;
      }));
    }
  }, [transactions]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const parseCurrency = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      // Remove R$, espaços e trata separadores de milhar/decimal brasileiros
      let clean = val.replace(/[R$\s]/g, '');
      if (clean.includes(',') && clean.includes('.')) {
        // Formato 1.234,56 -> 1234.56
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (clean.includes(',')) {
        // Formato 1234,56 -> 1234.56
        clean = clean.replace(',', '.');
      }
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  const handleSmartResult = (data: any, isDocument = false) => {
    if (!data) return;

    // Se for um documento completo, limpamos o estado para restaurar exatamente o que foi importado
    if (isDocument) {
      setTransactions([]);
    }

    if (data.header) {
      if (data.header.previousBalance !== undefined) setPrevBalance(parseCurrency(data.header.previousBalance).toString());
      
      if (data.header.month) {
        // Normalização robusta do mês para bater com o array MONTHS (Title Case)
        const foundMonth = MONTHS.find(m => 
          m.toLowerCase() === data.header.month.toLowerCase() ||
          m.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === 
          data.header.month.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        );
        if (foundMonth) setMonth(foundMonth);
      }
      
      if (data.header.year) setYear(data.header.year.toString());
    }
    
    if (data.transactions) {
      const newBatch: Transaction[] = [];
      const rawTxs = data.transactions;

      rawTxs.forEach((t: any) => {
        let desc = (t.description || '').toUpperCase();
        const type = t.type;
        const val = parseCurrency(t.value);
        const day = (t.day || new Date().getDate().toString()).toString().padStart(2, '0');

        // Normalização para consistência
        const isCeia = desc.includes("OFERTA") && (desc.includes("CEIA") || desc.includes("CULTO"));
        const isDizimo = desc.includes("DÍZIMO") || desc.includes("DIZIMO");
        const isOfertaComum = desc.includes("OFERTA") && !isCeia;
        const isAgua = desc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("AGUA E ESGOTO");
        const isSedeTithe = desc.includes("DÍZIMO DA SEDE") || desc.includes("DIZIMO DA SEDE");
        const isRepasse = desc.includes("REPASSE SEMIDI") || desc.includes("SEMID");
        
        if (isCeia) desc = "OFERTA DO CULTO DE CEIA";
        else if (isDizimo && !isSedeTithe) desc = "DÍZIMOS";
        else if (isOfertaComum) desc = "OFERTAS";
        else if (isAgua) desc = "PAG ÁGUA";
        else if (isSedeTithe) desc = "DÍZIMO DA SEDE 10%";
        else if (isRepasse) desc = "REPASSE SEMIDI";

        // Se for Dízimo da Sede, ignoramos pois o app calcula sozinho (evita duplicidade)
        if (desc === "DÍZIMO DA SEDE 10%") return;

        const entryId = uuidv4();
        const exitId = uuidv4();

        const entryTx: Transaction = {
          id: entryId,
          day,
          description: desc,
          value: val,
          type,
          showInChurch: (desc === "OFERTA DO CULTO DE CEIA" && type === TransactionType.ENTRY)
        };
        
        // Lógica de Vínculo para Oferta de Ceia / Repasse SEMIDI
        if (desc === "OFERTA DO CULTO DE CEIA" && type === TransactionType.ENTRY) {
          // Se for importação de documento, tentamos achar o par no lote
          if (isDocument) {
            const pair = rawTxs.find((item: any) => {
              const itemDesc = (item.description || '').toUpperCase();
              const itemVal = parseCurrency(item.value);
              const itemDay = (item.day || day).toString().padStart(2, '0');
              return (itemDesc.includes("REPASSE SEMIDI") || itemDesc.includes("SEMID")) && 
                     itemVal === val && 
                     itemDay === day;
            });
 
            if (pair) {
              // Vincula os dois
              entryTx.linkedId = exitId;
              entryTx.showInChurch = true;
              newBatch.push(entryTx);
              newBatch.push({
                id: exitId,
                day: entryTx.day,
                description: "REPASSE SEMIDI",
                value: entryTx.value,
                type: TransactionType.EXIT,
                linkedId: entryId,
                showInChurch: true
              });
              // Removemos o par do processamento futuro para não duplicar
              const pairIndex = rawTxs.indexOf(pair);
              if (pairIndex > -1) rawTxs.splice(pairIndex, 1);
              return;
            }
          }
 
          // Se não achou par ou não é documento, cria o par automático (comportamento padrão do app)
          if (!isDocument) {
            entryTx.linkedId = exitId;
            entryTx.showInChurch = true;
            newBatch.push(entryTx);
            newBatch.push({
              id: exitId,
              day: entryTx.day,
              description: "REPASSE SEMIDI",
              value: entryTx.value,
              type: TransactionType.EXIT,
              linkedId: entryId,
              showInChurch: true
            });
            return;
          }
        }

        newBatch.push(entryTx);
      });
      
      if (isDocument) {
        setTransactions(newBatch);
      } else {
        setTransactions(prev => [...prev, ...newBatch]);
      }
    }
  };

  const startEditing = (t: Transaction) => {
    setSnapshot({ ...t });
    setEditingId(t.id);
  };

  const updateLive = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => {
      const current = prev.find(t => t.id === id);
      if (!current) return prev;

      const updated = { ...current, ...updates };
      let newList = prev.map(t => t.id === id ? updated : t);

      // Sincronização automática em tempo real para Oferta de Ceia / SEMIDI
      if (updated.linkedId) {
        newList = newList.map(t => {
          if (t.id === updated.linkedId) {
            return { 
              ...t, 
              day: updates.day !== undefined ? updates.day : t.day,
              value: updates.value !== undefined ? updates.value : t.value
            };
          }
          return t;
        });
      }

      // Se a descrição mudou para CEIA agora (mesmo editando manualmente) e não tinha vínculo
      if (updated.description === "OFERTA DO CULTO DE CEIA" && updated.type === TransactionType.ENTRY && !updated.linkedId) {
        const newExitId = uuidv4();
        updated.linkedId = newExitId;
        // Atualiza o item atual com o novo vínculo
        newList = newList.map(t => t.id === id ? updated : t);
        // Adiciona a saída correspondente
        newList.push({
          id: newExitId,
          day: updated.day,
          description: "REPASSE SEMIDI",
          value: updated.value,
          type: TransactionType.EXIT,
          linkedId: updated.id
        });
      }

      return newList;
    });
  };

  const handleDelete = (id: string) => {
    // Exclusão imediata sem perguntas, conforme solicitado
    setTransactions(prev => {
      const toDelete = prev.find(t => t.id === id);
      if (!toDelete) return prev;
      if (toDelete.linkedId) {
        return prev.filter(t => t.id !== id && t.id !== toDelete.linkedId);
      }
      return prev.filter(t => t.id !== id);
    });
  };

  const toggleShowInChurch = (txId: string) => {
    setTransactions(prev => {
      const target = prev.find(t => t.id === txId);
      if (!target) return prev;
      const newStatus = !shouldShowInChurch(target);
      return prev.map(t => {
        if (t.id === txId || (target.linkedId && t.id === target.linkedId)) {
          return { ...t, showInChurch: newStatus };
        }
        return t;
      });
    });
  };

  const cancelEdit = () => {
    if (snapshot && editingId) {
      setTransactions(prev => prev.map(t => t.id === editingId ? snapshot : t));
    }
    setEditingId(null);
    setSnapshot(null);
  };

  const handleCalculateTotalToSede = () => {
    const totalEntries = transactions
      .filter(t => t.type === TransactionType.ENTRY)
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    
    const titheValue = totalEntries * 0.1;
    
    const semidiValue = transactions
      .filter(t => t.description === "REPASSE SEMIDI" && t.type === TransactionType.EXIT)
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    
    const total = titheValue + semidiValue;
    
    setSedeSummary({ tithe: titheValue, semidi: semidiValue, total });
    setShowSedeModal(true);
  };

  const handlePdf = () => {
    setShowPdfModal(true);
  };

  const handleNewReport = () => {
    setTransactions([]);
    setPrevBalance('0.00');
    // Mantém o mês/ano atual ou avança? Vamos manter o atual para o usuário escolher.
    setShowNewReportModal(false);
  };

  const handleNewReportWithBalance = () => {
    const currentBalance = totalInCash.toFixed(2);
    setTransactions([]);
    setPrevBalance(currentBalance);
    // Avança o mês se possível
    const currentIndex = MONTHS.indexOf(month);
    if (currentIndex < 11) {
      setMonth(MONTHS[currentIndex + 1]);
    } else {
      setMonth(MONTHS[0]);
      setYear((parseInt(year) + 1).toString());
    }
    setShowNewReportModal(false);
  };

  const generateAndDownloadPdf = async () => {
    const isChurch = pdfType === 'church';
    const elementId = isChurch ? 'church-report-content' : 'report-content';
    const filename = isChurch ? `Resumo_Igreja_IDM_${month}_${year}.pdf` : `Relatorio_IDM_${month}_${year}.pdf`;

    const el = document.getElementById(elementId);
    if (!el) return;
    const opt = {
      margin: [0, 0, 0, 0],
      filename: filename,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    // @ts-ignore
    await window.html2pdf().from(el).set(opt).save();
    setShowPdfModal(false);
  };

  const handleSharePdf = async () => {
    const isChurch = pdfType === 'church';
    const elementId = isChurch ? 'church-report-content' : 'report-content';
    const filename = isChurch ? `Resumo_Igreja_IDM_${month}_${year}.pdf` : `Relatorio_IDM_${month}_${year}.pdf`;
    const title = isChurch ? 'Resumo Financeiro IDM para Igreja' : 'Relatório Financeiro IDM';

    const el = document.getElementById(elementId);
    if (!el) return;
    
    const opt = {
      margin: [0, 0, 0, 0],
      filename: filename,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-ignore
      const worker = window.html2pdf().from(el).set(opt);
      const pdfBlob = await worker.output('blob');
      const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: title,
          text: `Relatório de ${month}/${year}`
        });
      } else {
        // Fallback: Download if share is not supported
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = opt.filename;
        a.click();
        URL.revokeObjectURL(url);
        alert("Seu navegador não suporta compartilhamento direto. O arquivo foi baixado.");
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      alert("Erro ao gerar ou compartilhar o PDF.");
    }
    setShowPdfModal(false);
  };

  const totalInCash = Math.round(((Number(prevBalance) || 0) + 
    transactions.filter(t => t.type === TransactionType.ENTRY).reduce((s, t) => s + (Number(t.value) || 0), 0) -
    transactions.filter(t => t.type === TransactionType.EXIT).reduce((s, t) => s + (Number(t.value) || 0), 0)) * 100) / 100;

  return (
    <div className={`flex flex-col bg-[#020617] text-slate-100 overflow-hidden font-sans ${isFullscreen ? 'h-full safe-top safe-bottom' : 'h-[100dvh]'}`}>
      
      <header className={`h-14 bg-[#0f172a] border-b border-slate-800 flex justify-between items-center px-2 sm:px-4 md:px-6 shrink-0 ${showHelp ? 'z-[550]' : 'z-50'}`}>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <img src={logo} alt="IDM" className="w-7 h-7 sm:w-8 sm:h-8 bg-white p-1 rounded-lg cursor-pointer shadow-lg" onClick={() => logoInputRef.current?.click()} />
          
          <button 
            onClick={() => setShowHelp(true)}
            className="px-2 py-1 sm:px-4 sm:py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-full transition-all border border-blue-500/30 active:scale-95 flex items-center gap-1 sm:gap-2 shrink-0"
            title="Ajuda e Tutorial"
          >
            <HelpCircle size={12} className="xs:hidden" />
            <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-wider">
              <span className="hidden xs:inline sm:hidden">Como Usar</span>
              <span className="hidden sm:inline">Como usar o app</span>
            </span>
          </button>


          <button 
            id="calculator-toggle-btn"
            onClick={() => setShowCalculator(true)}
            className="px-2.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/35 hover:border-indigo-500/50 text-indigo-400 hover:text-indigo-300 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
            title="Calculadora com Memórias"
          >
            <Calculator size={14} className="animate-pulse" />
            <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-wider hidden xs:inline">Calculadora</span>
          </button>

          <button 
            id="maximize-btn"
            onClick={toggleFullScreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-all border border-slate-700 active:scale-95 flex items-center justify-center shrink-0"
            title="Tela Cheia"
          >
            <Maximize size={14} />
          </button>

          <div className="hidden md:block">
            <h1 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white leading-none">Tesouraria IDM</h1>
            <p className="text-[6px] sm:text-[7px] font-bold text-blue-500 uppercase mt-0.5">Gestão Oficial</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 overflow-x-auto no-scrollbar py-1">
          <div className="flex flex-col items-end mr-0.5 sm:mr-2 shrink-0">
            <span className="hidden xs:block text-[6px] font-black text-slate-500 uppercase tracking-tighter">Saldo</span>
            <span className="text-[9px] sm:text-sm font-mono font-black text-green-400">R$ {totalInCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 border-l border-slate-800 pl-1 sm:pl-3 shrink-0">
            <button 
              id="new-report-btn"
              onClick={() => setShowNewReportModal(true)} 
              className="flex flex-col items-center justify-center p-1 sm:p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-all border border-slate-700 text-blue-400 min-w-[44px] sm:min-w-[60px]"
            >
              <PlusCircle size={12} className="sm:w-4 sm:h-4" />
              <span className="text-[6px] sm:text-[7px] font-black uppercase mt-0.5">Novo Relat.</span>
            </button>

            <button 
              id="total-sede-btn"
              onClick={handleCalculateTotalToSede} 
              className="flex flex-col items-center justify-center p-1 sm:p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-all border border-slate-700 text-amber-400 min-w-[44px] sm:min-w-[60px]"
            >
              <Banknote size={12} className="sm:w-4 sm:h-4" />
              <span className="text-[6px] sm:text-[7px] font-black uppercase mt-0.5">Total Sede</span>
            </button>

            <button 
              id="reconcile-btn"
              onClick={() => setShowReconcileModal(true)} 
              className="flex flex-col items-center justify-center p-1 sm:p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-all border border-slate-700 text-emerald-400 min-w-[44px] sm:min-w-[60px]"
              title="Conferir Caixa Físico e Bancos"
            >
              <Wallet size={12} className="sm:w-4 sm:h-4" />
              <span className="text-[6px] sm:text-[7px] font-black uppercase mt-0.5">Conferir</span>
            </button>

            <button 
              id="pdf-download-btn"
              onClick={handlePdf} 
              className="flex flex-col items-center justify-center p-1 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/20 active:scale-95 transition-all min-w-[44px] sm:min-w-[70px]"
            >
              <FileText size={12} className="sm:w-4 sm:h-4" />
              <span className="text-[6px] sm:text-[7px] font-black uppercase mt-0.5">Baixar PDF</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`flex flex-col transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] ${showPreview ? 'h-[40%]' : 'h-[92%]'} bg-[#0f172a]/40 overflow-hidden relative`}>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Banner de Recuperação de Dados do Relatório Anterior */}
              {showBackupBanner && (
                <div className="bg-blue-600/10 border-2 border-blue-500/30 rounded-[2rem] p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/15 rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
                      <ArrowLeftRight size={22} />
                    </div>
                    <div>
                      <p className="font-black text-white uppercase text-xs tracking-wider">Dados antigos encontrados ({backupMonth})</p>
                      <p className="text-slate-400 text-[10px] mt-1 font-bold">Detectamos o relatório fechado no mês anterior com {backupCount} lançamentos. Deseja restaurá-los agora?</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-center">
                    <button 
                      onClick={handleRestoreBackup}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                    >
                      Restaurar Lançamentos
                    </button>
                    <button 
                      onClick={() => setShowBackupBanner(false)}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-6">
                <div id="calendar-selector" className="flex flex-wrap items-center justify-center gap-3 bg-slate-900/60 p-2 rounded-[2rem] border border-slate-800/80 w-fit mx-auto px-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800">
                    <Calendar size={12} className="text-blue-500" />
                    <select value={month} onChange={e => setMonth(e.target.value)} className="bg-transparent text-[10px] font-black uppercase text-white outline-none cursor-pointer">
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input type="text" value={year} onChange={e => setYear(e.target.value)} className="bg-transparent w-10 text-[10px] font-black text-center text-white outline-none" />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-full border border-slate-800">
                    <span className="text-[9px] font-black text-slate-500 uppercase">SALDO ANTERIOR:</span>
                    <input type="number" step="0.01" value={prevBalance} onChange={e => setPrevBalance(e.target.value)} className="bg-transparent w-20 text-[10px] font-mono font-black text-green-400 outline-none" />
                  </div>
                </div>
                <InputBar 
                  onSmartResult={handleSmartResult} 
                  onFileClick={() => importInputRef.current?.click()} 
                />
              </div>

              {transactions.length === 0 && (
                <div className="bg-slate-900/30 border-2 border-slate-800/60 rounded-[2.5rem] p-8 text-center max-w-sm mx-auto space-y-4">
                  <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto text-slate-400 border border-slate-700/50">
                    <Coins size={20} className="text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Mês Sem Lançamentos</h3>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[280px] mx-auto font-medium">
                      O relatório está vazio. Digite na barra inteligente acima, importe um relatório ou use o botão para lançar manualmente.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setManualAddDay(new Date().getDate().toString().padStart(2, '0'));
                      setManualAddType(TransactionType.ENTRY);
                      setManualAddDesc('');
                      setManualAddValue('');
                      setShowAddTransactionModal(true);
                    }}
                    className="mx-auto flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[9px] tracking-wider rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20 cursor-pointer"
                  >
                    <Plus size={14} /> Adicionar Lançamento Manual
                  </button>
                </div>
              )}

              {transactions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-2">
                    <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Registros Atuais</h3>
                    <div className="flex items-center gap-2.5">
                      <button 
                        onClick={() => {
                          setManualAddDay(new Date().getDate().toString().padStart(2, '0'));
                          setManualAddType(TransactionType.ENTRY);
                          setManualAddDesc('');
                          setManualAddValue('');
                          setShowAddTransactionModal(true);
                        }}
                        className="flex items-center gap-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/25 px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                      >
                        <Plus size={10} /> Adicionar
                      </button>
                      <button onClick={() => { if(confirm("Limpar todos os registros?")) setTransactions([]); }} className="text-red-500/40 hover:text-red-500 text-[8px] font-black uppercase transition-colors">Limpar Tudo</button>
                    </div>
                  </div>
                  <div id="transactions-list" className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-10">
                    {transactions.slice().reverse().map((t, index) => (
                      <div 
                        key={t.id} 
                        id={index === 0 ? "tutorial-transaction-item" : undefined}
                        className={`bg-slate-900/50 p-3 rounded-2xl border transition-all flex justify-between items-center group overflow-hidden ${editingId === t.id ? 'border-blue-500 bg-slate-800 shadow-xl scale-[1.02]' : 'border-slate-800/50'}`}
                      >
                        {editingId === t.id ? (
                          <div className="flex flex-col flex-1 gap-2">
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                maxLength={2} 
                                placeholder="Dia"
                                className="w-10 bg-slate-950 border border-blue-500 rounded-lg p-1.5 text-center text-[10px] font-black text-white" 
                                value={t.day} 
                                onChange={e => updateLive(t.id, { day: e.target.value })}
                              />
                              <input 
                                type="text" 
                                placeholder="Descrição"
                                className="flex-1 bg-slate-950 border border-blue-500 rounded-lg p-1.5 text-[11px] font-black uppercase text-white" 
                                value={t.description} 
                                onChange={e => updateLive(t.id, { description: e.target.value.toUpperCase() })}
                                onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <button 
                                onClick={() => updateLive(t.id, { type: t.type === TransactionType.ENTRY ? TransactionType.EXIT : TransactionType.ENTRY })}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${t.type === TransactionType.ENTRY ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
                              >
                                <ArrowLeftRight size={10} />
                                {t.type}
                              </button>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase">R$</span>
                                <input 
                                  type="number" 
                                  className="w-24 bg-slate-950 border border-blue-500 rounded-lg p-1.5 text-xs font-mono font-black text-green-400" 
                                  value={t.value || ''} 
                                  onChange={e => updateLive(t.id, { value: Number(e.target.value) })}
                                />
                                <button onClick={() => setEditingId(null)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"><Check size={14}/></button>
                                <button onClick={cancelEdit} className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"><X size={14}/></button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 ${t.type === TransactionType.ENTRY ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {t.day}
                              </div>
                              <div className="overflow-hidden">
                                <span className="text-[11px] font-black uppercase text-slate-200 block truncate leading-none">{t.description}</span>
                                <span className={`text-[7px] font-bold uppercase ${t.type === TransactionType.ENTRY ? 'text-green-700' : 'text-red-700'}`}>{t.type}</span>
                                {t.linkedId && <span className="ml-2 text-[6px] bg-blue-500/10 text-blue-400 px-1 rounded-sm">VINCULADO</span>}
                                {shouldShowInChurch(t) && (
                                  <span className="ml-1.5 text-[6px] bg-emerald-500/15 text-emerald-400 px-1 py-0.5 rounded-sm font-black uppercase tracking-wider inline-flex items-center gap-0.5">
                                    <Church size={6} className="inline animate-pulse" /> Igreja
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs font-mono font-black mr-2 ${t.type === TransactionType.ENTRY ? 'text-green-400' : 'text-red-400'}`}>
                                {(Number(t.value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => toggleShowInChurch(t.id)} 
                                  className={`p-2 rounded-lg transition-all flex items-center justify-center border ${shouldShowInChurch(t) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/40 text-slate-500 hover:text-slate-300 border-transparent hover:bg-slate-800'}`} 
                                  title={shouldShowInChurch(t) ? "Remover do relatório da igreja" : "Enviar ao relatório da igreja"}
                                >
                                  <Church size={14}/>
                                </button>
                                <button 
                                  id={index === 0 ? "tutorial-edit-btn" : undefined}
                                  onClick={() => startEditing(t)} 
                                  className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors" 
                                  title="Editar"
                                >
                                  <Pencil size={14}/>
                                </button>
                                <button 
                                  id={index === 0 ? "tutorial-delete-btn" : undefined}
                                  onClick={() => handleDelete(t.id)} 
                                  className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors" 
                                  title="Excluir"
                                >
                                  <Trash2 size={14}/>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`flex-1 flex flex-col bg-[#020617] relative overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.8)] z-40 transition-all duration-700 border-t border-slate-800 ${showPreview ? 'h-[60%]' : 'h-[8%]'}`}>
          <div id="preview-toggle" className="h-10 bg-slate-900 border-b border-slate-800 flex justify-between items-center px-4 md:px-8 shrink-0 cursor-pointer" onClick={() => setShowPreview(!showPreview)}>
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-blue-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Visualização do Relatório (A4)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden xs:flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.1, z-0.05)); }} className="p-1 text-slate-500 hover:text-white transition-colors"><ZoomOut size={14}/></button>
                <span className="text-[9px] font-black text-slate-600 font-mono w-8 text-center">{(zoom * 100).toFixed(0)}%</span>
                <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(1.5, z+0.05)); }} className="p-1 text-slate-500 hover:text-white transition-colors"><ZoomIn size={14}/></button>
              </div>
              {showPreview ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronUp size={18} className="text-slate-500" />}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4 md:p-10 custom-scrollbar bg-slate-950 flex justify-center items-start">
            <div 
              className="origin-top transition-transform duration-500 transform-gpu bg-white shadow-[0_50px_100px_rgba(0,0,0,1)]" 
              style={{ transform: `scale(${zoom})`, width: '210mm' }}
            >
              <PaperReport 
                logo={logo}
                transactions={transactions} 
                header={{ month, year, previousBalance: parseFloat(prevBalance) || 0 }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Container Offscreen para Geração de PDF do Resumo para Igreja */}
      <div className="absolute -left-[9999px] top-0 pointer-events-none">
        <ChurchReport
          logo={logo}
          transactions={transactions}
          header={{ month, year, previousBalance: parseFloat(prevBalance) || 0 }}
        />
      </div>
      
      {/* Inputs Ocultos */}
      <input type="file" ref={logoInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const r = new FileReader();
          r.onload = (ev) => setLogo(ev.target?.result as string);
          r.readAsDataURL(file);
        }
      }} className="hidden" />
      
      <input type="file" ref={importInputRef} onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsScanning(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const result = await parseDocument(base64Data, file.type);
            if (result) handleSmartResult(result, true);
          } catch (err) { alert("Erro ao interpretar arquivo."); }
          finally { setIsScanning(false); }
        };
      }} accept="image/*,application/pdf" className="hidden" />

      {isScanning && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center space-y-8 p-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
            <Scan size={40} className="text-blue-500 animate-pulse" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black uppercase tracking-[0.3em] text-white">Importando Relatório</h2>
            <p className="text-blue-500 text-[10px] font-bold uppercase mt-2">Extraindo dados com IA...</p>
          </div>
        </div>
      )}

      {showPdfModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4" onClick={() => setShowPdfModal(false)}>
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2rem] p-5 sm:p-7 shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="overflow-y-auto pr-1 -mr-1 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
              <div className="text-center mb-1">
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">Opções do PDF</h2>
                <p className="text-slate-400 text-[10px] sm:text-xs mt-1">
                  {pdfType === 'official' ? 'Gerando Relatório Completo Oficial' : 'Gerando Resumo da Pasta (Igreja)'}
                </p>
              </div>

              {/* Alternador de Tipo de Relatório */}
              <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-850">
                <button
                  onClick={() => setPdfType('official')}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${pdfType === 'official' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-white'}`}
                >
                  Relatório Oficial
                </button>
                <button
                  onClick={() => setPdfType('church')}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${pdfType === 'church' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-white'}`}
                >
                  Resumo Igreja
                </button>
              </div>

              <div className="grid gap-2.5">
                <button 
                  onClick={handleSharePdf}
                  className="flex items-center gap-3 p-3.5 sm:p-4.5 bg-blue-600 hover:bg-blue-500 rounded-2xl sm:rounded-[1.5rem] transition-all group active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <Share2 size={20} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-white uppercase text-xs sm:text-sm tracking-wider leading-none">Compartilhar</p>
                    <p className="text-blue-100 text-[9px] mt-1 leading-none">WhatsApp, Telegram e outros</p>
                  </div>
                </button>

                <button 
                  onClick={generateAndDownloadPdf}
                  className="flex items-center gap-3 p-3.5 sm:p-4.5 bg-slate-800 hover:bg-slate-700 rounded-2xl sm:rounded-[1.5rem] transition-all group active:scale-95 border border-slate-700"
                >
                  <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                    <Download size={20} className="text-slate-300" />
                  </div>
                  <div className="text-left font-sans">
                    <p className="font-black text-white uppercase text-xs sm:text-sm tracking-wider leading-none">Baixar Arquivo</p>
                    <p className="text-slate-400 text-[9px] mt-1 leading-none">Salvar no seu dispositivo</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setShowPreviewModal(true);
                  }}
                  className="flex items-center gap-3 p-3.5 sm:p-4.5 bg-slate-800 hover:bg-slate-700 rounded-2xl sm:rounded-[1.5rem] transition-all group active:scale-95 border border-slate-700"
                >
                  <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                    <Eye size={20} className="text-slate-300" />
                  </div>
                  <div className="text-left font-sans">
                    <p className="font-black text-white uppercase text-xs sm:text-sm tracking-wider leading-none">Visualizar Relatório</p>
                    <p className="text-slate-400 text-[9px] mt-1 leading-none">Ver preview do modelo selecionado</p>
                  </div>
                </button>
              </div>

              <button 
                onClick={() => setShowPdfModal(false)}
                className="w-full mt-2 py-2.5 text-slate-500 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddTransactionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[130] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAddTransactionModal(false)}>
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Lançamento Inteligente</span>
              </div>
              <button 
                onClick={() => setShowAddTransactionModal(false)}
                className="p-1.5 bg-slate-805 hover:bg-slate-705 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative">
              <input 
                type="text"
                value={smartAddText}
                onChange={(e) => setSmartAddText(e.target.value)}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') handleSmartAddPDFTransaction(); 
                }}
                autoFocus
                placeholder="Ex: arrumei o bebedouro valor 250..."
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-4 pr-12 py-3.5 text-xs font-black text-white outline-none focus:border-blue-500 transition-colors placeholder-slate-600"
                disabled={isSmartAddLoading}
              />
              <button
                onClick={handleSmartAddPDFTransaction}
                disabled={isSmartAddLoading || !smartAddText.trim()}
                className="absolute right-1.5 top-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                {isSmartAddLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
               </button>
            </div>
          </div>
        </div>
      )}

      {showSedeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowSedeModal(false)}>
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] mb-1">Acerto com a Sede</h2>
                <p className="text-xl font-black text-white uppercase">Resumo Financeiro</p>
              </div>
              <button onClick={() => setShowSedeModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Dízimo da Sede (10%)</span>
                <span className="text-sm font-mono font-black text-white">R$ {sedeSummary.tithe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Repasse SEMIDI</span>
                <span className="text-sm font-mono font-black text-white">R$ {sedeSummary.semidi.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center p-5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <span className="text-[11px] font-black text-amber-500 uppercase tracking-wider">Total a Levar</span>
                <span className="text-lg font-mono font-black text-amber-400">R$ {sedeSummary.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button 
              onClick={() => setShowSedeModal(false)}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-xs rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-500/20"
            >
              Entendido
            </button>
          </div>
        </div>
      )}


      {showNewReportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowNewReportModal(false)}>
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlusCircle size={32} className="text-blue-500" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Novo Relatório</h2>
              <p className="text-slate-400 text-xs mt-2">Deseja iniciar um novo relatório financeiro?</p>
            </div>

            <div className="grid gap-4">
              <button 
                onClick={handleNewReportWithBalance}
                className="flex items-center gap-4 p-5 bg-blue-600 hover:bg-blue-500 rounded-3xl transition-all group active:scale-95 shadow-lg shadow-blue-600/20"
              >
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <ArrowLeftRight size={24} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="font-black text-white uppercase text-sm tracking-wider">Próximo Mês</p>
                  <p className="text-blue-100 text-[10px] mt-1">Limpa tudo e transporta o saldo atual</p>
                </div>
              </button>

              <button 
                onClick={handleNewReport}
                className="flex items-center gap-4 p-5 bg-slate-800 hover:bg-slate-700 rounded-3xl transition-all group active:scale-95 border border-slate-700"
              >
                <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center shrink-0">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <div className="text-left">
                  <p className="font-black text-white uppercase text-sm tracking-wider">Zerar Tudo</p>
                  <p className="text-slate-400 text-[10px] mt-1">Limpa tudo e zera o saldo anterior</p>
                </div>
              </button>
            </div>

            <button 
              onClick={() => setShowNewReportModal(false)}
              className="w-full mt-6 py-3 text-slate-500 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showReconcileModal && (() => {
        const parseReconcileInput = (val: string): number => {
          const clean = val.replace(',', '.');
          const num = parseFloat(clean);
          return isNaN(num) ? 0 : num;
        };

        const parsedNubank = parseReconcileInput(reconcileNubank);
        const parsedCedulas = parseReconcileInput(reconcileCedulas);
        const parsedMoedas = parseReconcileInput(reconcileMoedas);
        const totalReconciled = Math.round((parsedNubank + parsedCedulas + parsedMoedas) * 100) / 100;
        const reconcileGap = Math.round((totalInCash - totalReconciled) * 100) / 100;

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={() => setShowReconcileModal(false)}>
            <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[92vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div>
                  <h2 className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-1">
                    <Scale size={10} /> Conciliação de Caixa
                  </h2>
                  <p className="text-sm sm:text-base font-black text-white uppercase">Conferir Dinheiro Físico</p>
                </div>
                <button onClick={() => setShowReconcileModal(false)} className="p-1 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <p className="text-[10px] text-slate-400 mb-3 sm:mb-4 leading-relaxed">
                Utilize este painel para contar o dinheiro físico do caixa e saldos bancários. O sistema calcula automaticamente o total e a diferença restante.
              </p>

              <div className="space-y-3 mb-4 sm:mb-5">
                {/* Saldo Nubank */}
                <div className="space-y-1">
                  <label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 ml-1">
                    <Wallet size={11} className="text-purple-400" />
                    Saldo no Nubank
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="0,00"
                      value={reconcileNubank}
                      onChange={(e) => handleNubankChange(e.target.value.replace(/[^0-9,.]/g, ''))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-black text-white pl-9 outline-none focus:border-purple-500 transition-colors opacity-90 hover:opacity-100 focus:opacity-100 placeholder-slate-650"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-purple-400">R$</span>
                  </div>
                </div>

                {/* Saldo em Cédulas */}
                <div className="space-y-1">
                  <label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 ml-1">
                    <Banknote size={11} className="text-emerald-400" />
                    Saldo em Cédulas (Papel)
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="0,00"
                      value={reconcileCedulas}
                      onChange={(e) => handleCedulasChange(e.target.value.replace(/[^0-9,.]/g, ''))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-black text-white pl-9 outline-none focus:border-emerald-500 transition-colors opacity-90 hover:opacity-100 focus:opacity-100 placeholder-slate-650"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-400">R$</span>
                  </div>
                </div>

                {/* Saldo em Moedas */}
                <div className="space-y-1">
                  <label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 ml-1">
                    <Coins size={11} className="text-amber-400" />
                    Saldo em Moedas
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="0,00"
                      value={reconcileMoedas}
                      onChange={(e) => handleMoedasChange(e.target.value.replace(/[^0-9,.]/g, ''))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-black text-white pl-9 outline-none focus:border-amber-400 transition-colors opacity-90 hover:opacity-100 focus:opacity-100 placeholder-slate-650"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-amber-400">R$</span>
                  </div>
                </div>
              </div>

              {/* Totais de Auditoria */}
              <div className="bg-slate-950/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-850 space-y-2 mb-4 sm:mb-5 select-none">
                <div className="flex justify-between items-center text-[11px] sm:text-xs">
                  <span className="text-slate-500 font-bold uppercase text-[8px] sm:text-[9px] tracking-wider">Esperado no Relatório:</span>
                  <span className="font-mono font-black text-slate-300">
                    R$ {totalInCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] sm:text-xs border-t border-slate-900 pt-2 sm:pt-2.5">
                  <span className="text-slate-500 font-bold uppercase text-[8px] sm:text-[9px] tracking-wider">Total em Mãos:</span>
                  <span className="font-mono font-black text-emerald-400 text-xs sm:text-sm">
                    R$ {totalReconciled.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Comparador de Diferença e Alertas de Uso Pessoal / Reposição */}
              <div className="mb-4 sm:mb-6 select-none">
                {Math.abs(reconcileGap) < 0.01 ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl sm:rounded-2xl p-3 text-emerald-400">
                    <p className="font-black text-[11px] sm:text-xs uppercase flex items-center gap-1.5">
                      <Check size={13} className="stroke-[3]" /> Caixa 100% Batido!
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-emerald-200/70 mt-1 font-medium leading-relaxed">
                      O dinheiro físico coincide perfeitamente com o saldo contábil.
                    </p>
                  </div>
                ) : reconcileGap > 0 ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl sm:rounded-2xl p-3 text-rose-400">
                    <div className="flex justify-between items-center gap-1.5">
                      <p className="font-black text-[11px] sm:text-xs uppercase flex items-center gap-1.5">
                        <X size={13} className="stroke-[3]" /> Falta Repor
                      </p>
                      <span className="font-mono font-black text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 bg-rose-500/20 rounded-lg text-rose-300 shrink-0">
                        R$ {reconcileGap.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-rose-200/70 mt-1 font-medium leading-relaxed">
                      Falta este valor para bater o caixa. Reponha antes de fechar o relatório.
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl sm:rounded-2xl p-3 text-blue-400">
                    <div className="flex justify-between items-center gap-1.5">
                      <p className="font-black text-[11px] sm:text-xs uppercase flex items-center gap-1.5">
                        <ArrowLeftRight size={13} /> Sobra em Caixa
                      </p>
                      <span className="font-mono font-black text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 bg-blue-500/20 rounded-lg text-blue-300 shrink-0">
                        R$ {Math.abs(reconcileGap).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-blue-200/70 mt-1 font-medium leading-relaxed">
                      Existe um valor excedente em mãos superior ao saldo do relatório.
                    </p>
                  </div>
                )}
              </div>

              {/* Botões de controle */}
              <div className="flex gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleNubankChange('');
                    handleCedulasChange('');
                    handleMoedasChange('');
                  }}
                  className="px-3 py-3 sm:px-3.5 sm:py-3.5 bg-slate-800 hover:bg-slate-755 text-slate-400 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:text-rose-400 active:scale-95 border border-slate-755"
                  title="Limpar todos os campos"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="flex-1 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all font-sans active:scale-95 shadow-md shadow-emerald-900/20 hover:shadow-emerald-900/40 cursor-pointer"
                >
                  Concluir e Salvar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[120] flex flex-col h-full animate-fade-in">
          {/* Top Navbar for the Preview Close & Action */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Eye size={18} className="text-emerald-500 animate-pulse" />
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Visualização Prévia</h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {pdfType === 'official' ? 'Relatório Completo Oficial' : 'Resumo da Congregação (Igreja)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setManualAddDay(new Date().getDate().toString().padStart(2, '0'));
                  setManualAddType(TransactionType.EXIT);
                  setManualAddDesc('');
                  setManualAddValue('');
                  setShowAddTransactionModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-950/40"
              >
                <Plus size={12} /> Lançar Saída/Entrada
              </button>
              <button 
                onClick={handleSharePdf}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                <Share2 size={12} /> Compartilhar
              </button>
              <button 
                onClick={generateAndDownloadPdf}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-705"
              >
                <Download size={12} /> Salvar PDF
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 bg-slate-850 hover:bg-rose-600 hover:text-white rounded-full text-slate-400 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Interactive Zoom Controls for Mobile & Desktop */}
          <div className="bg-slate-950 border-b border-slate-850 px-4 py-2 flex items-center justify-center gap-4 shrink-0">
            <button 
              onClick={() => setZoom(z => Math.max(0.2, z - 0.05))}
              className="p-1 bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-800"
              title="Diminuir zoom"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono font-black text-slate-400 w-12 text-center">
              {(zoom * 100).toFixed(0)}%
            </span>
            <button 
              onClick={() => setZoom(z => Math.min(2.0, z + 0.05))}
              className="p-1 bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-800"
              title="Aumentar zoom"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Paper Canvas Preview Area - Scaled & Touch Scrollable */}
          <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start bg-slate-950 custom-scrollbar">
            <div 
              className="origin-top shadow-[0_30px_70px_rgba(0,0,0,0.8)] bg-white rounded-sm transition-all duration-300 ease-out"
              style={{ 
                transform: `scale(${zoom})`,
                width: '210mm',
                minWidth: '210mm'
              }}
            >
              {pdfType === 'official' ? (
                <PaperReport 
                  logo={logo}
                  transactions={transactions} 
                  header={{ month, year, previousBalance: parseFloat(prevBalance) || 0 }} 
                />
              ) : (
                <ChurchReport
                  logo={logo}
                  transactions={transactions}
                  header={{ month, year, previousBalance: parseFloat(prevBalance) || 0 }}
                />
              )}
            </div>
          </div>

          {/* Footer Action Bar especially for Mobile */}
          <div className="sm:hidden p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-2.5 shrink-0">
            <button
              onClick={() => {
                setManualAddDay(new Date().getDate().toString().padStart(2, '0'));
                setManualAddType(TransactionType.EXIT);
                setManualAddDesc('');
                setManualAddValue('');
                setShowAddTransactionModal(true);
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
            >
              <Plus size={14} /> Lançar Saída/Entrada Manual
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleSharePdf}
                className="py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Share2 size={12} /> Compartilhar
              </button>
              <button 
                onClick={generateAndDownloadPdf}
                className="py-3 bg-slate-800 hover:bg-slate-705 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-705 active:scale-95"
              >
                <Download size={12} /> Salvar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showCalculator && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-3 animate-fade-in" onClick={handleCloseCalculator}>
          <div className="relative bg-slate-900 border border-slate-750 w-full max-w-[280px] rounded-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col" onClick={e => e.stopPropagation()}>
            
            {/* Custom Inline Rename Overlay Modal */}
            {renameSlotIdx !== null && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl z-[120] p-6 flex flex-col justify-center items-center">
                <p className="text-white text-[10px] font-black uppercase mb-3 text-center tracking-wider text-indigo-400">
                  Renomear Memória M{renameSlotIdx + 1}
                </p>
                <input
                  type="text"
                  maxLength={11}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs text-center focus:outline-none focus:border-indigo-500 w-full mb-4 font-black placeholder-slate-600"
                  placeholder="Ex: Titulo, Caixa, etc"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameSlot(renameSlotIdx, renameValue.trim());
                      setRenameSlotIdx(null);
                    } else if (e.key === 'Escape') {
                      setRenameSlotIdx(null);
                    }
                  }}
                />
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      handleRenameSlot(renameSlotIdx, renameValue.trim());
                      setRenameSlotIdx(null);
                    }}
                    className="flex-1 py-1 px-2.5 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500 text-white rounded-lg font-black text-[9px] uppercase tracking-wide active:scale-95 transition-all cursor-pointer"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setRenameSlotIdx(null)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-lg font-bold text-[9px] uppercase tracking-wide active:scale-95 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Header / Tabs bar */}
            <div className="flex items-center justify-between gap-1 mb-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                {calcSlots.map((slot, idx) => {
                  const isActive = idx === activeSlotIdx;
                  const displayName = slot.name || `M${idx + 1}`;
                  return (
                    <div 
                      key={idx}
                      onMouseDown={(e) => handleStartPress(idx, e)}
                      onMouseUp={() => handleEndPress(idx, true)}
                      onMouseLeave={() => handleEndPress(idx, false)}
                      onTouchStart={(e) => handleStartPress(idx, e)}
                      onTouchEnd={() => handleEndPress(idx, true)}
                      className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer uppercase select-none max-w-[110px] shrink-0 active:scale-95 ${
                        isActive 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                          : 'bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-indigo-200'
                      }`}
                      title={isActive ? "Toque e segure para renomear" : `Mudar para ${displayName}`}
                    >
                      <span className="truncate">{displayName}</span>
                      {isActive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseSlot(idx, e);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          className="ml-1.5 p-1 rounded bg-black/30 hover:bg-rose-900/40 text-indigo-200 hover:text-rose-200 transition-all shrink-0 flex items-center justify-center active:scale-90"
                          title={calcSlots.length > 1 ? "Fechar guia" : "Limpar memória"}
                        >
                          <X size={10} className="stroke-[3]" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {calcSlots.length < 3 && (
                  <div className="ml-4 pl-4 border-l border-slate-800 flex items-center h-5">
                    <button
                      onClick={handleAddSlot}
                      className="p-1 bg-slate-800 hover:bg-indigo-600 border border-slate-700/60 hover:border-indigo-500 text-slate-400 hover:text-white rounded-lg transition-all active:scale-90 flex items-center justify-center shrink-0"
                      title="Adicionar nova guia"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>
              <button 
                onClick={handleCloseCalculator} 
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all shrink-0 ml-auto"
                title="Fechar e Salvar"
              >
                <X size={15} />
              </button>
            </div>

            {/* Compact Display */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 mb-2.5 flex flex-col items-end justify-center shadow-inner">
              <span className="text-[9px] font-mono font-bold text-slate-500 overflow-x-auto whitespace-nowrap max-w-full text-right h-3 mb-0.5 scrollbar-none select-none">
                {calcEquation || '\u00A0'}
              </span>
              <span className="text-xl font-mono font-black text-green-400 overflow-x-auto whitespace-nowrap max-w-full text-right scrollbar-none selection:bg-indigo-600/30">
                {calcDisplay}
              </span>
            </div>

            {/* Simple Operator Grid */}
            <div className="grid grid-cols-4 gap-1.5 mb-2.5 select-none">
              <button 
                onClick={() => handleCalcKeyPress('C')}
                className="py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 font-black rounded-lg active:scale-95 transition-all text-xs"
              >
                C
              </button>
              <button 
                onClick={() => handleCalcKeyPress('⌫')}
                className="py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-lg active:scale-95 transition-all text-xs flex items-center justify-center border border-slate-700/50"
                title="Apagar"
              >
                ⌫
              </button>
              <button 
                onClick={() => handleCalcKeyPress('/')}
                className="py-1.5 bg-slate-800 hover:bg-slate-750 text-indigo-400 border border-slate-700/60 font-black rounded-lg active:scale-95 transition-all text-xs"
              >
                ÷
              </button>
              <button 
                onClick={() => handleCalcKeyPress('*')}
                className="py-1.5 bg-slate-800 hover:bg-slate-750 text-indigo-400 border border-slate-700/60 font-black rounded-lg active:scale-95 transition-all text-xs"
              >
                ×
              </button>

              <button 
                onClick={() => handleCalcKeyPress('7')}
                className="py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
              >
                7
              </button>
              <button 
                onClick={() => handleCalcKeyPress('8')}
                className="py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
              >
                8
              </button>
              <button 
                onClick={() => handleCalcKeyPress('9')}
                className="py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
              >
                9
              </button>
              <button 
                onClick={() => handleCalcKeyPress('-')}
                className="py-1.5 bg-slate-800 hover:bg-slate-750 text-indigo-400 border border-slate-700/60 font-black rounded-lg active:scale-95 transition-all text-xs"
              >
                -
              </button>

              <button 
                onClick={() => handleCalcKeyPress('4')}
                className="py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
              >
                4
              </button>
              <button 
                onClick={() => handleCalcKeyPress('5')}
                className="py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
              >
                5
              </button>
              <button 
                onClick={() => handleCalcKeyPress('6')}
                className="py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
              >
                6
              </button>
              <button 
                onClick={() => handleCalcKeyPress('+')}
                className="py-1.5 bg-slate-800 hover:bg-slate-750 text-indigo-400 border border-slate-700/60 font-black rounded-lg active:scale-95 transition-all text-xs"
              >
                +
              </button>

              <button 
                onClick={() => handleCalcKeyPress('1')}
                className="py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
              >
                1
              </button>
              <button 
                onClick={() => handleCalcKeyPress('2')}
                className="py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
              >
                2
              </button>
              <button 
                onClick={() => handleCalcKeyPress('3')}
                className="py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
              >
                3
              </button>
              <button 
                onClick={() => handleCalcKeyPress('=')}
                className="row-span-2 py-1.5 bg-indigo-600 hover:bg-indigo-505 text-white font-black rounded-lg active:scale-95 transition-all text-xs flex items-center justify-center border border-indigo-500 shadow-md shadow-indigo-600/20"
              >
                =
              </button>

              <button 
                onClick={() => handleCalcKeyPress('0')}
                className="col-span-2 py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
              >
                0
              </button>
              <button 
                onClick={() => handleCalcKeyPress('.')}
                className="py-1.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg active:scale-95 transition-all text-xs"
              >
                ,
              </button>
            </div>

            {/* Compact Action Footer */}
            <div className="flex shrink-0">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(calcDisplay);
                  setCopyFeedback(true);
                  setTimeout(() => setCopyFeedback(false), 1500);
                }}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 font-black text-[8px] uppercase tracking-wider text-slate-300 rounded-lg transition-all border border-slate-700/60 active:scale-95 flex items-center justify-center gap-1"
              >
                {copyFeedback ? (
                  <>
                    <Check size={10} className="text-green-400 shrink-0" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <FileText size={10} className="shrink-0" />
                    Copiar Resultado
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showHelp && (
          <HelpSystem onClose={() => setShowHelp(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
