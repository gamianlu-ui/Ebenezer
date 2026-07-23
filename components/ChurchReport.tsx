import React from 'react';
import { Transaction, TransactionType, ReportHeader, MONTHS, shouldShowInChurch } from '../types';

interface ChurchReportProps {
  transactions: Transaction[];
  header: ReportHeader;
  logo: string;
}

export const ChurchReport: React.FC<ChurchReportProps> = ({ 
  transactions, 
  header,
  logo
}) => {
  const totalEntries = React.useMemo(() => {
    const sum = transactions
      .filter(t => t.type === TransactionType.ENTRY)
      .reduce((s, t) => s + (Number(t.value) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [transactions]);

  const totalExits = React.useMemo(() => {
    const sum = transactions
      .filter(t => t.type === TransactionType.EXIT)
      .reduce((s, t) => s + (Number(t.value) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [transactions]);

  const ceiaValue = React.useMemo(() => {
    const sum = transactions
      .filter(t => t.description === "OFERTA DO CULTO DE CEIA" && t.type === TransactionType.ENTRY)
      .reduce((s, t) => s + (Number(t.value) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [transactions]);

  const semidiValue = React.useMemo(() => {
    const sum = transactions
      .filter(t => t.description === "REPASSE SEMIDI" && t.type === TransactionType.EXIT)
      .reduce((s, t) => s + (Number(t.value) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [transactions]);

  const gratificacaoValue = React.useMemo(() => {
    const sum = transactions
      .filter(t => 
        t.type === TransactionType.EXIT && 
        (t.description === "GRATIFICAÇÃO DO OBREIRO" || 
         t.description.toUpperCase().includes("GRATIFICA") || 
         t.description.toUpperCase().includes("OBREIRO"))
      )
      .reduce((s, t) => s + (Number(t.value) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [transactions]);

  const otherTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      if (!shouldShowInChurch(t)) return false;
      const desc = (t.description || '').toUpperCase();
      const isCeiaEntry = desc === "OFERTA DO CULTO DE CEIA" && t.type === TransactionType.ENTRY;
      const isSemidiExit = desc === "REPASSE SEMIDI" && t.type === TransactionType.EXIT;
      const isGratificacaoExit = t.type === TransactionType.EXIT && (
        desc === "GRATIFICAÇÃO DO OBREIRO" || 
        desc.includes("GRATIFICA") || 
        desc.includes("OBREIRO")
      );
      return !isCeiaEntry && !isSemidiExit && !isGratificacaoExit;
    });
  }, [transactions]);

  const prevBalanceNum = Number(header.previousBalance) || 0;
  const totalInCash = Math.round((prevBalanceNum + totalEntries - totalExits) * 100) / 100;

  return (
    <div 
      id="church-report-content" 
      className="bg-white text-black font-sans w-[210mm] h-[297mm] flex flex-col box-border relative overflow-hidden"
      style={{ padding: '10mm 15mm 10mm 15mm' }} 
    >
      {/* HEADER SECTION */}
      <div className="flex items-start justify-between mb-2">
        <div className="w-24">
          {logo && <img src={logo} alt="Logo" className="w-20 h-20 object-contain" crossOrigin="anonymous" />}
        </div>
        
        <div className="flex-1 text-center pt-1">
          <h1 className="font-black text-[22px] leading-tight mb-0">IGREJA DE DEUS MISSIONÁRIA</h1>
          <p className="text-[9px] font-bold mb-2">CNPJ: 05.869.914/0001-07</p>
          
          <div className="border-[1.5px] border-black px-8 py-0.5 inline-block mb-3">
            <span className="font-black text-[11px] uppercase tracking-[0.1em]">RESUMO DE RELATÓRIO FINANCEIRO</span>
          </div>

          <div className="flex justify-center items-center gap-6 font-bold text-[10px] uppercase">
            <div className="flex items-center gap-1.5">
              <span>MÊS DE REFERÊNCIA:</span>
              <div className="border-b-[1.5px] border-black min-w-[120px] text-center font-black text-[12px] pb-0.5">
                {header.month.toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span>ANO:</span>
              <div className="border-b-[1.5px] border-black min-w-[60px] text-center font-black text-[12px] pb-0.5">
                {header.year}
              </div>
            </div>
          </div>
        </div>
        <div className="w-24"></div>
      </div>

      {/* Thick separator line */}
      <div className="w-full h-[3px] bg-black mb-4"></div>

      {/* Document Description info */}
      <div className="text-center mb-3">
        <h2 className="text-[12px] font-black uppercase tracking-wider">RESUMO DO CAIXA</h2>
      </div>

      {/* SUMMARY GRID AND CARD LAYOUT */}
      <div className="flex-1 flex flex-col justify-start">
        <div className="border-[1.5px] border-black rounded-lg overflow-hidden w-full divide-y-[1.5px] divide-black">
          {/* Header row */}
          <div className="flex bg-stone-100 font-extrabold text-[11px] uppercase text-stone-900 h-8 items-center">
            <div className="flex-1 px-4">Descrição do Elemento Financeiro</div>
            <div className="w-48 text-right px-6">Valores (R$)</div>
          </div>

          {/* Previous Balance */}
          <div className="flex h-9 items-center text-[11px]">
            <div className="flex-1 px-4 font-bold uppercase text-stone-700">Saldo Anterior (Entrada do caixa anterior)</div>
            <div className="w-48 text-right px-6 font-mono font-bold text-stone-900">
              {prevBalanceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Total entries */}
          <div className="flex h-9 items-center text-[11px]">
            <div className="flex-1 px-4 font-bold uppercase text-stone-700">Total Geral de Entradas no Mês</div>
            <div className="w-48 text-right px-6 font-mono font-bold text-emerald-600">
              {totalEntries.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Total exits */}
          <div className="flex h-9 items-center text-[11px]">
            <div className="flex-1 px-4 font-bold uppercase text-stone-700">Total Geral de Saídas no Mês</div>
            <div className="w-48 text-right px-6 font-mono font-bold text-rose-600">
              {totalExits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Oferta ceia */}
          <div className="flex h-9 items-center text-[11px]">
            <div className="flex-1 px-4 font-bold uppercase text-stone-700">Oferta do Culto de Ceia</div>
            <div className="w-48 text-right px-6 font-mono font-bold text-stone-900">
              {ceiaValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Repasse semidi */}
          <div className="flex h-9 items-center text-[11px]">
            <div className="flex-1 px-4 font-bold uppercase text-stone-700">Repasse do Culto de Ceia / SEMIDI</div>
            <div className="w-48 text-right px-6 font-mono font-bold text-stone-900">
              {semidiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Gratificacao obreiro */}
          <div className="flex h-9 items-center text-[11px]">
            <div className="flex-1 px-4 font-bold uppercase text-stone-700">Gratificação do Obreiro</div>
            <div className="w-48 text-right px-6 font-mono font-bold text-stone-900">
              {gratificacaoValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Outras movimentações adicionadas manualmente (com o ícone da igrejinha) */}
          {otherTransactions.map((t) => (
            <div key={t.id} className="flex h-9 items-center text-[11px]">
              <div className="flex-1 px-4 font-bold uppercase text-stone-700">
                {t.description} {t.day ? `(Dia ${t.day.padStart(2, '0')})` : ''}
              </div>
              <div className={`w-48 text-right px-6 font-mono font-bold ${t.type === TransactionType.ENTRY ? 'text-emerald-600' : 'text-stone-900'}`}>
                {t.type === TransactionType.EXIT ? '-' : ''}
                {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}

          {/* Final balance */}
          <div className="flex h-10 items-center text-[12px] bg-[#D9EAF7]">
            <div className="flex-1 px-4 font-black uppercase text-blue-900">Saldo Atual Líquido em Caixa</div>
            <div className="w-48 text-right px-6 font-mono font-black text-blue-900">
              {totalInCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Declarative statement text */}
        <div className="mt-8 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-center text-stone-600 text-[10px] leading-relaxed italic">
          "Declaramos para fins de registro e arquivo que este relatório financeiro reflete fielmente
          as movimentações e saldos do caixa da Congregação local relativos ao período de {header.month.toUpperCase()} de {header.year}."
        </div>
      </div>

      {/* FOOTER SIGNATURES */}
      <div className="mt-auto pt-10 border-t border-stone-300">
        <div className="grid grid-cols-2 gap-12 px-6">
          <div className="flex flex-col items-center">
            <div className="w-full border-b-[1.5px] border-black my-2"></div>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-900">TESOUREIRO(A) LOCAL</span>
            <span className="text-[8px] font-bold text-stone-500 uppercase mt-0.5">Assinatura Tesouraria</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-full border-b-[1.5px] border-black my-2"></div>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-900">DIRIGENTE DA CONGREGAÇÃO</span>
            <span className="text-[8px] font-bold text-stone-500 uppercase mt-0.5">Assinatura Liderança</span>
          </div>
        </div>

        <div className="text-center text-[8px] text-stone-400 mt-12">
          Documento gerado eletronicamente em {new Date().toLocaleDateString('pt-BR')} via Tesouraria IDM Oficial
        </div>
      </div>
    </div>
  );
};
