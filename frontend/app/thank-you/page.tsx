'use client';

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 to-slate-950 pointer-events-none" />
      
      <div className="z-10 w-full max-w-lg bg-slate-900 border border-slate-800 p-10 rounded-3xl shadow-2xl flex flex-col items-center space-y-6 text-center">
        
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mb-2">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Thank You!</h1>
        <p className="text-slate-400 text-lg">
          Your interview is complete. We will review your session and be in touch within 24 hours.
        </p>
        
        <p className="text-slate-500 text-sm mt-8 pb-4">
          You may now close this window.
        </p>
      </div>
    </div>
  );
}
