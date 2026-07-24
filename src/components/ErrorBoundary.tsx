import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isConfigError = this.state.error?.message.includes('FATAL CONFIGURATION ERROR');
      
      return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-800 border border-red-500/30 rounded-[24px] p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <div>
              <h1 className="text-[24px] font-black tracking-tight text-white mb-2">Something went wrong</h1>
              <p className="text-[14px] text-gray-400 font-medium leading-relaxed">
                {isConfigError 
                  ? "RideProfit is missing required environment variables for Supabase. Please check your .env file."
                  : "An unexpected error occurred while loading the application."}
              </p>
            </div>

            {this.state.error && import.meta.env.DEV && (
              <div className="text-left bg-gray-900 p-4 rounded-xl border border-white/5 overflow-x-auto text-[11px] font-mono text-red-400">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={() => window.location.replace('/')}
              className="w-full py-3.5 bg-gray-700 hover:bg-gray-600 active:scale-98 text-white rounded-[16px] font-black text-[14px] uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
