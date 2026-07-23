import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public props: Props;
  constructor(props: Props) {
    super(props);
    this.props = props;
  }
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary detectou um erro fatal de renderização:", error, errorInfo);
  }

  private handleResetApp = () => {
    try {
      localStorage.removeItem('idm_v14_pro_sync');
      localStorage.removeItem('idm_report_data');
      window.location.reload();
    } catch (e) {
      console.error("Erro ao resetar localStorage:", e);
      alert("Houve um erro ao limpar os dados do navegador.");
    }
  };

  private handleDownloadOfflineBackup = () => {
    try {
      const backupData1 = localStorage.getItem('idm_v14_pro_sync') || '';
      const backupData2 = localStorage.getItem('idm_report_data') || '';
      const backupObj = {
        idm_v14_pro_sync: backupData1 ? JSON.parse(backupData1) : null,
        idm_report_data: backupData2 ? JSON.parse(backupData2) : null,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_financeiro_idm_de_segurança.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Não foi possível gerar arquivo de backup. Recomendamos tirar print da tela ou copiar o erro.");
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-8 animate-in fade-in ease-out duration-500">
            
            {/* Church Branding Decorator */}
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-sm font-black text-rose-500 uppercase tracking-[0.25em]">Conflito de Inicialização</h1>
              <p className="text-2xl font-black text-white uppercase tracking-tight">Ocorreu um erro no app</p>
              <p className="text-slate-400 text-xs">
                Para proteger suas informações, detectamos um conflito temporário que impede a exibição habitual da página.
              </p>
            </div>

            {/* Error Code Sniffer Box */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col gap-1.5">
              <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider">Impressão Técnica do Erro:</span>
              <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar p-1 break-all leading-relaxed">
                {this.state.error?.stack || this.state.error?.message || "Erro desconhecido."}
              </pre>
            </div>

            {/* Practical instructions */}
            <div className="text-[11px] text-slate-400 font-bold space-y-2 leading-relaxed">
              <p className="flex items-start gap-2">
                <span className="text-blue-500 text-xs mt-0.5">▪</span>
                <span>Se houver lançamentos salvos, use a opção de <strong>Download de Segurança</strong> antes de redefinir o app.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-500 text-xs mt-0.5">▪</span>
                <span>Clicando em <strong>Zerar Dados</strong>, o app apagará os dados corrompidos locais do navegador e iniciará perfeitamente limpo.</span>
              </p>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid gap-3 pt-2">
              <button
                onClick={this.handleDownloadOfflineBackup}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 text-xs font-black uppercase tracking-wider rounded-2xl transition-all border border-slate-700 active:scale-95 flex items-center justify-center gap-2"
              >
                📥 Download de Segurança (Lançamentos)
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  Recarregar
                </button>
                <button
                  onClick={this.handleResetApp}
                  className="flex-1 py-4 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-black uppercase tracking-wider rounded-2xl transition-all active:scale-95"
                >
                  Zerar Dados
                </button>
              </div>
            </div>

            {/* Footer church references */}
            <div className="text-center">
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Tesouraria Oficial IDM • Proteção Automática</span>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
