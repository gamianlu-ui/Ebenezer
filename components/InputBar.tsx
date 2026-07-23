
import React, { useState } from 'react';
import { Send, Loader2, Sparkles, MessageSquare, Paperclip, ChevronDown, ChevronUp, Plus, Check } from 'lucide-react';
import { parseTransactionInput } from '../services/geminiService';

interface InputBarProps {
  onSmartResult: (data: any) => void;
  onFileClick: () => void;
}

const CATEGORIES = [
  { label: 'Dízimos', value: 'DÍZIMOS', type: 'ENTRADA' as const },
  { label: 'Ofertas', value: 'OFERTAS', type: 'ENTRADA' as const },
  { label: 'Culto de Ceia', value: 'OFERTA DO CULTO DE CEIA', type: 'ENTRADA' as const }, 
  { label: 'Luz / Energia', value: 'ENERGIA ELÉTRICA', type: 'SAIDA' as const },
  { label: 'Água', value: 'PAG ÁGUA', type: 'SAIDA' as const },
  { label: 'Gratificação Obreiro', value: 'GRATIFICAÇÃO DO OBREIRO', type: 'SAIDA' as const },
  { label: 'Repasse SEMIDI', value: 'REPASSE SEMIDI', type: 'SAIDA' as const },
  { label: 'Outro (Personalizado)', value: 'CUSTOM', type: 'SAIDA' as const }
];

export const InputBar: React.FC<InputBarProps> = ({ onSmartResult, onFileClick }) => {
  const [smartInput, setSmartInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // Form Fields for Manual registration
  const [manualDay, setManualDay] = useState(() => new Date().getDate().toString().padStart(2, '0'));
  const [manualCategory, setManualCategory] = useState('DÍZIMOS');
  const [manualValue, setManualValue] = useState('');
  const [manualType, setManualType] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [manualCustomDesc, setManualCustomDesc] = useState('');

  const handleSmartAdd = async () => {
    if (!smartInput.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const results = await parseTransactionInput(smartInput);
      if (results && onSmartResult) {
        onSmartResult(results);
        setSmartInput('');
      }
    } catch (e) {
      alert("Falha ao interpretar o comando. Tente algo como: 'Lançar 100 dízimo dia 15'");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAddSubmit = () => {
    const val = parseFloat(manualValue);
    if (isNaN(val) || val <= 0) {
      alert("Insira um valor numérico válido maior que zero.");
      return;
    }

    const desc = manualCategory === 'CUSTOM' ? manualCustomDesc.toUpperCase() : manualCategory;
    if (!desc.trim()) {
      alert("Por favor, preencha a descrição do lançamento personalizado.");
      return;
    }

    const transactionData = {
      transactions: [
        {
          day: manualDay.padStart(2, '0') || new Date().getDate().toString().padStart(2, '0'),
          description: desc,
          value: val,
          type: manualType
        }
      ]
    };

    onSmartResult(transactionData);
    
    // Reset specific states to keep it fluid
    setManualValue('');
    setManualCustomDesc('');
    setShowManual(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2" id="smart-input-container">
      <div className={`relative transition-all duration-300 ${isLoading ? 'opacity-70' : 'opacity-100'}`}>
        {/* Glow effect for higher contrast */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        
        <div className="relative bg-slate-900 border-2 border-slate-700 rounded-3xl md:rounded-[3rem] p-1.5 flex items-center gap-2 shadow-2xl focus-within:border-blue-400 transition-all overflow-hidden">
          <button 
            type="button"
            onClick={onFileClick}
            id="import-button"
            title="Importar PDF ou Foto (Relatórios)"
            className="flex w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 items-center justify-center shrink-0 ml-2 transition-colors text-slate-400 hover:text-blue-400"
          >
            <Paperclip size={18} />
          </button>
          
          <input 
            type="text"
            value={smartInput}
            onChange={(e) => setSmartInput(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter') handleSmartAdd(); }}
            placeholder="Digite aqui"
            className="flex-1 bg-transparent border-none text-white text-sm md:text-lg font-bold outline-none placeholder-slate-500 py-3 md:py-4 px-2 min-w-0"
            disabled={isLoading}
          />

          <button 
            type="button"
            onClick={() => {
              setShowManual(!showManual);
              setTimeout(() => {
                document.getElementById('manual-value-input')?.focus();
              }, 120);
            }}
            title="Preenchimento Manual Tradicional"
            className={`px-3 md:px-4 py-2.5 rounded-2xl md:rounded-full bg-slate-800 hover:bg-slate-700 text-xs font-black uppercase text-slate-200 border transition-all shrink-0 flex items-center gap-1 cursor-pointer select-none ${showManual ? 'border-blue-500 text-blue-400' : 'border-slate-700'}`}
          >
            {showManual ? <ChevronUp size={16} /> : <Plus size={16} />}
            <span className="hidden xs:inline">Manual</span>
          </button>

          <button 
            type="button"
            onClick={handleSmartAdd}
            disabled={isLoading || !smartInput.trim()}
            title="Lançar (Enter)"
            className="bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:bg-slate-800 w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-full flex items-center justify-center transition-all shadow-lg shadow-blue-900/40 shrink-0"
          >
            {isLoading ? <Loader2 size={24} className="animate-spin text-white" /> : <Sparkles size={24} className="text-white" />}
          </button>
        </div>
        
        <div className="mt-2.5 flex justify-center gap-4 text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] px-4 text-center">
          <span className="text-blue-500/80">OFERTA CEIA gera Repasse Automático</span>
          <span className="hidden sm:inline opacity-30">|</span>
          <span className="hidden sm:inline text-green-500/80">Processamento Local Instantâneo Ativado</span>
        </div>

        {/* Collapsible Direct Manual Form */}
        {showManual && (
          <div className="mt-4 bg-slate-900/90 border border-slate-700/70 rounded-3xl p-5 max-w-3xl mx-auto shadow-2xl animate-in fade-in slide-in-from-top-3 duration-250 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Lançamento Direto sem Espera</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowManual(false)}
                className="text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest border border-slate-800 rounded-lg px-2.5 py-1 hover:bg-slate-800 transition-colors"
              >
                Ocultar Painel
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              {/* Day input */}
              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Dia do Mês</label>
                <input 
                  type="text" 
                  maxLength={2}
                  value={manualDay}
                  onChange={(e) => setManualDay(e.target.value.replace(/\D/g, ''))}
                  placeholder={new Date().getDate().toString().padStart(2, '0')}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-mono font-black text-white text-center focus:border-blue-500 outline-none transition-colors"
                />
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Categoria / Tipo</label>
                <select 
                  value={manualCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualCategory(val);
                    const found = CATEGORIES.find(c => c.value === val);
                    if (found && found.value !== 'CUSTOM') {
                      setManualType(found.type);
                    }
                  }}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black text-white outline-none focus:border-blue-500 cursor-pointer transition-colors"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value} className="bg-slate-950 font-black">{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Conditional custom description */}
              {manualCategory === 'CUSTOM' ? (
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Nome do Lançamento</label>
                  <input 
                    type="text"
                    placeholder="Ex: Reforma da Sede"
                    value={manualCustomDesc}
                    onChange={(e) => setManualCustomDesc(e.target.value)}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-black text-white uppercase outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              ) : (
                /* Static type badge to guide the user */
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Fluxo do Caixa</label>
                  <div className="h-[38px] rounded-2xl bg-slate-950 border-2 border-slate-800 p-0.5 flex">
                    <button
                      type="button"
                      onClick={() => setManualType('ENTRADA')}
                      disabled={manualCategory !== 'CUSTOM'}
                      className={`flex-1 rounded-xl text-[9px] font-black uppercase transition-all ${manualType === 'ENTRADA' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'text-slate-600'}`}
                    >
                      Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualType('SAIDA')}
                      disabled={manualCategory !== 'CUSTOM'}
                      className={`flex-1 rounded-xl text-[9px] font-black uppercase transition-all ${manualType === 'SAIDA' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-slate-600'}`}
                    >
                      Saída
                    </button>
                  </div>
                </div>
              )}

              {/* Value input */}
              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Valor em Reais (R$)</label>
                <input 
                  id="manual-value-input"
                  type="number" 
                  step="0.01"
                  placeholder="0,00"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleManualAddSubmit(); }}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-mono font-black text-green-400 focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Custom option type toggle if Custom is active */}
            {manualCategory === 'CUSTOM' && (
              <div className="mt-4 p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tipo para lançamento personalizado:</span>
                <div className="rounded-xl bg-slate-900 border-2 border-slate-800 p-0.5 flex w-44 shrink-0">
                  <button
                    type="button"
                    onClick={() => setManualType('ENTRADA')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${manualType === 'ENTRADA' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-slate-500'}`}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('SAIDA')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${manualType === 'SAIDA' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-500'}`}
                  >
                    Saída
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2.5 border-t border-slate-800/50 pt-4">
              <button 
                type="button"
                onClick={() => setShowManual(false)}
                className="px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-wider rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleManualAddSubmit}
                disabled={!manualValue || (manualCategory === 'CUSTOM' && !manualCustomDesc.trim())}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
              >
                <Check size={14} />
                Lançar Agora
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
