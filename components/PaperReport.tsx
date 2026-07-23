
import React from 'react';
import { Transaction, TransactionType, ReportHeader, MONTHS } from '../types';

interface PaperReportProps {
  transactions: Transaction[];
  header: ReportHeader;
  logo: string;
}

export const PaperReport: React.FC<PaperReportProps> = ({ 
  transactions, 
  header,
  logo
}) => {
  
  const processedTransactions = React.useMemo(() => {
    const monthIdx = MONTHS.indexOf(header.month);
    const yearNum = parseInt(header.year);

    const lastDayOfMonth = new Date(yearNum, monthIdx + 1, 0);
    const lastDayDate = lastDayOfMonth.getDate();
    const lastDayDayOfWeek = lastDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

    const getGroupingDay = (dayStr: string) => {
      const d = parseInt(dayStr);
      if (isNaN(d)) return dayStr;
      const date = new Date(yearNum, monthIdx, d);
      const dayOfWeek = date.getDay(); // 0 (Sun) to 6 (Sat)
      
      // Encontrar o próximo domingo
      const diffToSunday = (7 - dayOfWeek) % 7;
      const nextSunday = new Date(date);
      nextSunday.setDate(date.getDate() + diffToSunday);
      
      // Se o próximo domingo for no mesmo mês, esse é o alvo padrão
      if (nextSunday.getMonth() === monthIdx) {
        return nextSunday.getDate().toString().padStart(2, '0');
      }
      
      // Se o próximo domingo for no mês seguinte, estamos na última semana "quebrada"
      // O usuário quer agrupar na última quarta ou sexta do mês
      if (lastDayDayOfWeek >= 5) { // Termina em Sexta ou Sábado
        const lastFriday = lastDayDate - (lastDayDayOfWeek - 5);
        return lastFriday.toString().padStart(2, '0');
      } else if (lastDayDayOfWeek >= 3) { // Termina em Quarta ou Quinta
        const lastWednesday = lastDayDate - (lastDayDayOfWeek - 3);
        return lastWednesday.toString().padStart(2, '0');
      }
      
      // Se termina em Segunda ou Terça, não há quarta/sexta na última semana
      return dayStr.padStart(2, '0');
    };

    // 1. Identificar quais dias de agrupamento têm entradas registradas
    // (Domingos ou a última Quarta/Sexta do mês se for a última semana)
    const groupingDaysWithEntries = new Set(
      transactions
        .filter(t => {
          const d = parseInt(t.day);
          if (isNaN(d)) return false;
          const date = new Date(yearNum, monthIdx, d);
          const dow = date.getDay();
          
          if (dow === 0) return true; // Domingos sempre são gatilhos
          
          // Verificar se é a última quarta ou sexta do mês
          if (dow === 3 || dow === 5) {
            const nextSun = new Date(date);
            nextSun.setDate(date.getDate() + (7 - dow) % 7);
            return nextSun.getMonth() !== monthIdx; // Gatilho se o próximo domingo for outro mês
          }
          return false;
        })
        .map(t => t.day)
    );

    const grouped: Transaction[] = [];
    const tempGroups: Record<string, Transaction> = {};

    transactions.forEach(t => {
      const descStr = t.description || '';
      const isCeia = descStr === "OFERTA DO CULTO DE CEIA" || descStr === "REPASSE SEMIDI";
      const isRepasseComum = descStr.includes("REPASSE") && !descStr.includes("SEMIDI");
      const shouldGroup = (t.type === TransactionType.ENTRY && !isCeia) || isRepasseComum;

      if (shouldGroup) {
        const targetDay = getGroupingDay(t.day);
        
        // Só agrupa se o dia alvo tiver um lançamento manual (gatilho)
        if (groupingDaysWithEntries.has(targetDay)) {
          const key = `${targetDay}-${descStr}-${t.type}`;
          if (tempGroups[key]) {
            tempGroups[key].value += t.value;
          } else {
            tempGroups[key] = { ...t, day: targetDay };
          }
          return;
        }
      }
      grouped.push({ ...t });
    });

    const final = [...grouped, ...Object.values(tempGroups)];

    return final.sort((a, b) => {
      const descA = a.description || '';
      const descB = b.description || '';

      // 1. Regra especial: Dízimo da Sede 10% sempre por último no mês
      if (descA === "DÍZIMO DA SEDE 10%") return 1;
      if (descB === "DÍZIMO DA SEDE 10%") return -1;

      // 2. Ordenar por dia
      const dayA = parseInt(a.day) || 0;
      const dayB = parseInt(b.day) || 0;
      if (dayA !== dayB) return dayA - dayB;

      // 3. Regra especial para o par de Ceia: Repasse SEMIDI deve vir logo após a Oferta de Ceia
      const isCeiaPairA = descA === "OFERTA DO CULTO DE CEIA" || descA === "REPASSE SEMIDI";
      const isCeiaPairB = descB === "OFERTA DO CULTO DE CEIA" || descB === "REPASSE SEMIDI";

      if (isCeiaPairA && !isCeiaPairB) return -1; // Prioriza o par de ceia no início do dia
      if (!isCeiaPairA && isCeiaPairB) return 1;

      if (isCeiaPairA && isCeiaPairB) {
        // Dentro do par, a entrada (Oferta) vem antes da saída (Repasse)
        if (a.type !== b.type) return a.type === TransactionType.ENTRY ? -1 : 1;
        return 0;
      }

      // 4. Regra geral para os demais lançamentos do mesmo dia: Entradas primeiro
      if (a.type !== b.type) return a.type === TransactionType.ENTRY ? -1 : 1;
      
      return 0;
    });
  }, [transactions, header.month, header.year]);

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

  const prevBalanceNum = Number(header.previousBalance) || 0;
  const totalInCash = Math.round((prevBalanceNum + totalEntries - totalExits) * 100) / 100;

  const formatCurrency = (val: number) => 
    val === 0 ? "" : val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const MIN_ROWS = 24;
  const emptyRowsCount = Math.max(0, MIN_ROWS - processedTransactions.length);
  const emptyRows = Array(emptyRowsCount).fill(null);

  return (
    <div 
      id="report-content" 
      className="bg-white text-black font-sans w-[210mm] h-[297mm] flex flex-col box-border relative overflow-hidden"
      style={{ padding: '10mm 15mm 10mm 15mm' }} 
    >
      {/* HEADER SECTION */}
      <div className="flex items-start justify-between mb-2">
        <div className="w-32">
          <img src={logo} alt="Logo" className="w-28 h-28 object-contain" crossOrigin="anonymous" />
        </div>
        
        <div className="flex-1 text-center pt-2">
          <h1 className="font-black text-[24px] leading-tight mb-0">IGREJA DE DEUS MISSIONÁRIA</h1>
          <p className="text-[10px] font-bold mb-3">CNPJ: 05.869.914/0001-07</p>
          
          <div className="border-[2px] border-black px-10 py-1 inline-block mb-4">
            <span className="font-black text-[12px] uppercase tracking-[0.1em]">DEPARTAMENTO FINANCEIRO</span>
          </div>

          <div className="flex justify-center items-center gap-8 font-bold text-[11px] uppercase">
            <div className="flex items-center gap-2">
              <span>MÊS:</span>
              <div className="border-b-[2px] border-black min-w-[140px] text-center font-black text-[14px] pb-0.5">
                {header.month.toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span>ANO:</span>
              <div className="border-b-[2px] border-black min-w-[80px] text-center font-black text-[14px] pb-0.5">
                {header.year}
              </div>
            </div>
          </div>
        </div>
        <div className="w-32"></div>
      </div>

      {/* Thick separator line */}
      <div className="w-full h-[4px] bg-black mb-6"></div>

      <div className="w-full border-[2px] border-black flex-1 flex flex-col overflow-hidden">
        {/* TABLE HEADER */}
        <div className="flex border-b-[2px] border-black font-black text-[10px] bg-white h-9 items-center uppercase text-center">
          <div className="w-12 border-r-[2px] border-black h-full flex items-center justify-center">DIA</div>
          <div className="flex-1 border-r-[2px] border-black h-full flex items-center justify-center px-2">DISCRIMINAÇÃO DOS LANÇAMENTOS</div>
          <div className="w-32 border-r-[2px] border-black h-full flex items-center justify-center">ENTRADA</div>
          <div className="w-32 h-full flex items-center justify-center">SAÍDA</div>
        </div>

        {/* TRANSACTIONS */}
        {processedTransactions.map((t, idx) => (
          <div key={`${t.id}-${idx}`} className="flex border-b border-black h-[22px] items-center text-[10px]">
            <div className="w-12 border-r-[2px] border-black text-center font-bold h-full flex items-center justify-center">{t.day}</div>
            <div className="flex-1 border-r-[2px] border-black px-3 uppercase font-bold truncate h-full flex items-center">{t.description}</div>
            <div className="w-32 border-r-[2px] border-black px-3 text-right font-bold h-full flex items-center justify-end">
              {t.type === TransactionType.ENTRY ? formatCurrency(Number(t.value)) : ''}
            </div>
            <div className="w-32 px-3 text-right font-bold h-full flex items-center justify-end">
              {t.type === TransactionType.EXIT ? formatCurrency(Number(t.value)) : ''}
            </div>
          </div>
        ))}

        {/* EMPTY ROWS */}
        {emptyRows.map((_, i) => (
          <div key={`empty-${i}`} className="flex border-b border-black h-[22px]">
            <div className="w-12 border-r-[2px] border-black h-full"></div>
            <div className="flex-1 border-r-[2px] border-black h-full"></div>
            <div className="w-32 border-r-[2px] border-black h-full"></div>
            <div className="w-32 h-full"></div>
          </div>
        ))}

        {/* SUMMARY SECTION */}
        <div className="mt-auto font-bold text-[11px]">
          <div className="flex border-t-[2px] border-black h-9 items-center bg-[#D9EAF7]">
            <div className="flex-1 px-3 uppercase font-black border-r-[2px] border-black h-full flex items-center">TOTAL DE ENTRADAS NO MÊS</div>
            <div className="w-8 flex items-center justify-center font-black border-r-[2px] border-black h-full">|</div>
            <div className="w-24 border-r-[2px] border-black px-3 text-right font-black h-full flex items-center justify-end">{totalEntries.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="w-32 h-full"></div>
          </div>
          <div className="flex border-t border-black h-9 items-center bg-[#D9EAF7]">
            <div className="flex-1 px-3 uppercase font-black border-r-[2px] border-black h-full flex items-center">TOTAL DE SAÍDAS NO MÊS</div>
            <div className="w-8 flex items-center justify-center font-black border-r-[2px] border-black h-full">|</div>
            <div className="w-24 border-r-[2px] border-black h-full"></div>
            <div className="w-32 px-3 text-right font-black text-red-600 h-full flex items-center justify-end">{totalExits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="flex border-t border-black h-9 items-center bg-[#D9EAF7]">
            <div className="flex-1 px-3 uppercase font-black border-r-[2px] border-black h-full flex items-center">SALDO DO MÊS ATUAL</div>
            <div className="w-8 flex items-center justify-center font-black border-r-[2px] border-black h-full">|</div>
            <div className="w-24 border-r-[2px] border-black px-3 text-right font-black h-full flex items-center justify-end">{(totalEntries - totalExits).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="w-32 h-full"></div>
          </div>
          <div className="flex border-t border-black h-9 items-center bg-[#D9EAF7]">
            <div className="flex-1 px-3 uppercase font-black border-r-[2px] border-black h-full flex items-center">SALDO DO MÊS ANTERIOR</div>
            <div className="w-8 flex items-center justify-center font-black border-r-[2px] border-black h-full">|</div>
            <div className="w-24 border-r-[2px] border-black px-3 text-right font-black h-full flex items-center justify-end">{prevBalanceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="w-32 h-full"></div>
          </div>
          <div className="flex border-t border-black h-11 items-center bg-[#B8D9F1]">
            <div className="flex-1 px-3 uppercase font-black text-[12px] text-blue-900 border-r-[2px] border-black h-full flex items-center">VALOR TOTAL EM CAIXA</div>
            <div className="w-8 flex items-center justify-center font-black border-r-[2px] border-black h-full text-blue-900">|</div>
            <div className="w-24 border-r-[2px] border-black px-3 text-right font-black text-[13px] text-blue-900 h-full flex items-center justify-end">{totalInCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="w-32 h-full"></div>
          </div>
        </div>
      </div>

      {/* FOOTER SIGNATURES */}
      <div className="mt-6 space-y-5 px-2">
        <div className="flex items-end gap-3">
          <span className="text-[10px] font-black uppercase whitespace-nowrap">TESOUREIRO(A):</span>
          <div className="flex-1 border-b-[1.5px] border-black"></div>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-[10px] font-black uppercase whitespace-nowrap">DIRIGENTE DA CONGREGAÇÃO:</span>
          <div className="flex-1 border-b-[1.5px] border-black"></div>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-[10px] font-black uppercase whitespace-nowrap">DIRETOR FINANCEIRO IDM SEDE:</span>
          <div className="flex-1 border-b-[1.5px] border-black"></div>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-[10px] font-black uppercase whitespace-nowrap">CONSELHO FISCAL:</span>
          <div className="flex-1 border-b-[1.5px] border-black"></div>
        </div>
      </div>
    </div>
  );
};
