
import React, { useState, useEffect } from 'react';
import { 
  X, ChevronRight, ChevronLeft, 
  MessageSquare, Paperclip, FileText, Banknote, List, Calendar, Pencil, Trash2, PlusCircle, Maximize
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HelpSystemProps {
  onClose: () => void;
}

type HelpMode = 'guided';

interface TutorialStep {
  targetId: string;
  title: string;
  content: string;
  icon: React.ReactNode;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetId: 'smart-input-container',
    title: 'Lançamento Inteligente',
    content: 'Digite o que aconteceu (ex: "dia 12 oferta 50") e a IA faz o resto.',
    icon: <MessageSquare className="text-red-400" />
  },
  {
    targetId: 'import-button',
    title: 'Importar Relatórios',
    content: 'Use o clipe para ler PDFs ou fotos de relatórios antigos.',
    icon: <Paperclip className="text-red-400" />
  },
  {
    targetId: 'pdf-download-btn',
    title: 'Gerar PDF',
    content: 'Baixe o relatório oficial pronto para impressão.',
    icon: <FileText className="text-red-400" />
  },
  {
    targetId: 'total-sede-btn',
    title: 'Acerto com a Sede',
    content: 'Veja o resumo do Dízimo (10%) e Repasse SEMIDI.',
    icon: <Banknote className="text-amber-400" />
  },
  {
    targetId: 'new-report-btn',
    title: 'Novo Relatório',
    content: 'Inicie um novo mês ou limpe todos os dados.',
    icon: <PlusCircle className="text-red-400" />
  },
  {
    targetId: 'calendar-selector',
    title: 'Calendário e Saldo',
    content: 'Ajuste o mês, ano e o saldo que sobrou do mês anterior.',
    icon: <Calendar className="text-red-400" />
  },
  {
    targetId: 'tutorial-transaction-item',
    title: 'Item de Lançamento',
    content: 'Cada linha representa um lançamento. Aqui você vê o dia, descrição e valor.',
    icon: <List className="text-red-400" />
  },
  {
    targetId: 'tutorial-edit-btn',
    title: 'Botão Editar',
    content: 'Clique no lápis azul para corrigir qualquer informação deste item.',
    icon: <Pencil className="text-red-400" />
  },
  {
    targetId: 'tutorial-delete-btn',
    title: 'Botão Excluir',
    content: 'Clique na lixeira vermelha para apagar este lançamento permanentemente.',
    icon: <Trash2 className="text-red-400" />
  },
  {
    targetId: 'preview-toggle',
    title: 'Visualização A4',
    content: 'Abra ou feche a prévia do papel oficial.',
    icon: <FileText className="text-slate-400" />
  },
  {
    targetId: 'maximize-btn',
    title: 'Tela Cheia',
    content: 'Expanda o app para ver melhor os detalhes.',
    icon: <Maximize className="text-slate-400" />
  }
];

export const HelpSystem: React.FC<HelpSystemProps> = ({ onClose }) => {
  const [mode] = useState<HelpMode>('guided');
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialPosition, setTutorialPosition] = useState<'top' | 'bottom'>('bottom');

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Highlight logic for guided tutorial
  useEffect(() => {
    if (mode === 'guided') {
      const step = TUTORIAL_STEPS[currentStep];
      const element = document.getElementById(step.targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('tutorial-highlight-blink');
        
        // Smart positioning: move tutorial box to the opposite side of the element
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const elementCenter = rect.top + rect.height / 2;
        
        // Force bottom for Step 7 (index 6) as requested, otherwise use smart positioning
        if (currentStep === 6) {
          setTutorialPosition('bottom');
        } else if (elementCenter > viewportHeight / 2) {
          setTutorialPosition('top');
        } else {
          setTutorialPosition('bottom');
        }

        return () => {
          element.classList.remove('tutorial-highlight-blink');
        };
      }
    }
  }, [mode, currentStep]);

  return (
    <div className={`fixed inset-0 ${currentStep === 9 ? 'z-[600]' : 'z-[500]'} flex items-center justify-center p-4`}>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/${mode === 'guided' ? '90' : '80'} ${mode === 'guided' ? '' : 'backdrop-blur-sm'}`}
      />

      <AnimatePresence mode="wait">
        {mode === 'guided' && (
          <motion.div 
            key="guided"
            initial={{ y: tutorialPosition === 'bottom' ? 50 : -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: tutorialPosition === 'bottom' ? 50 : -50, opacity: 0 }}
            className={`absolute ${tutorialPosition === 'bottom' ? 'bottom-4' : 'top-4'} left-4 right-4 md:relative md:bottom-auto md:left-auto md:right-auto w-auto max-w-[260px] mx-auto bg-[#2d0606] border-2 border-red-600 rounded-[1.5rem] p-4 shadow-2xl shadow-red-900/80 z-[700]`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                {React.cloneElement(TUTORIAL_STEPS[currentStep].icon as React.ReactElement, { className: 'text-red-400' })}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-tight truncate">
                  {TUTORIAL_STEPS[currentStep].title}
                </h3>
                <p className="text-[8px] font-bold text-red-500/70 uppercase">
                  Passo {currentStep + 1} de {TUTORIAL_STEPS.length}
                </p>
              </div>
              <button onClick={onClose} className="p-1 text-red-800 hover:text-red-400 shrink-0">
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] font-bold text-white leading-relaxed mb-4 italic">
              {TUTORIAL_STEPS[currentStep].content}
            </p>

            <div className="flex items-center justify-between gap-2">
              <button 
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="flex-1 py-2 bg-red-950/50 hover:bg-red-900/50 disabled:opacity-20 text-red-200 font-black uppercase text-[9px] rounded-xl transition-all border border-red-900/30"
              >
                Anterior
              </button>
              <button 
                onClick={handleNext}
                className="flex-[2] py-2 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[9px] rounded-xl transition-all shadow-lg shadow-red-600/20"
              >
                {currentStep === TUTORIAL_STEPS.length - 1 ? 'Finalizar' : 'Próximo'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
