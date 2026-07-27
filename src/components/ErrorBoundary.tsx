import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const { children } = this.props;
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-rose-200 dark:border-rose-900">
          <h2 className="text-2xl font-bold text-rose-700 dark:text-rose-400">Algo salió mal</h2>
          <p className="text-slate-600 dark:text-zinc-400 mt-2">Ha ocurrido un error inesperado. Por favor, intenta recargar la página.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700"
          >
            Recargar
          </button>
        </div>
      );
    }

    return children;
  }
}
