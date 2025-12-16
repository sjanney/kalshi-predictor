import React, { useState } from 'react';
import { ShieldCheck, Key, Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface LicenseActivationProps {
    onSuccess: () => void;
}

const LicenseActivation: React.FC<LicenseActivationProps> = ({ onSuccess }) => {
    const [licenseKey, setLicenseKey] = useState('');
    const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!licenseKey.trim()) return;

        setStatus('verifying');
        setErrorMessage('');

        try {
            const response = await fetch('http://localhost:8000/api/license/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ license_key: licenseKey.trim() }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            } else {
                setStatus('error');
                setErrorMessage(data.detail || 'Invalid license key');
            }
        } catch (error) {
            setStatus('error');
            setErrorMessage('Failed to connect to server');
        }
    };

    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse duration-[4000ms]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] animate-pulse duration-[5000ms]" />
            </div>

            <div className="max-w-md w-full bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in duration-500">
                {/* Top Gradient Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                <div className="p-8">
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                            <div className="w-20 h-20 bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-2xl flex items-center justify-center relative shadow-xl">
                                <Lock className="w-8 h-8 text-primary" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black border border-white/10 rounded-lg flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                            Product Activation
                        </h2>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            Enter your license key to unlock the full power of <span className="text-primary font-medium">Kalshi Predictor Pro</span>.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                                License Key
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                                <div className="relative bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden group-focus-within:border-primary/50 transition-colors">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                        <Key className="w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <textarea
                                        value={licenseKey}
                                        onChange={(e) => {
                                            // Advanced cleaning:
                                            // 1. Split by lines
                                            // 2. Remove lines with headers/titles
                                            // 3. Strip non-base64 chars from remaining lines
                                            // 4. Join
                                            const raw = e.target.value;
                                            const clean = raw.split('\n')
                                                .filter(line => !line.includes('Generated License Key') && !line.includes('Kalshi Predictor'))
                                                .map(line => line.replace(/[^A-Za-z0-9+/=]/g, ''))
                                                .join('');
                                            setLicenseKey(clean);
                                        }}
                                        placeholder="Paste your license key here..."
                                        rows={4}
                                        className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:ring-0 font-mono tracking-wide text-xs resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {status === 'error' && (
                            <div className="flex items-center gap-3 text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20 animate-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="flex items-center gap-3 text-emerald-400 text-sm bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 animate-in slide-in-from-top-2">
                                <CheckCircle className="w-5 h-5 shrink-0" />
                                <span>Activation successful! Launching...</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'verifying' || status === 'success'}
                            className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg
                ${status === 'success'
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                                    : 'bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-primary/25'
                                }
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
              `}
                        >
                            {status === 'verifying' ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Verifying...
                                </>
                            ) : status === 'success' ? (
                                <>
                                    <ShieldCheck className="w-5 h-5" />
                                    Activated
                                </>
                            ) : (
                                <>
                                    Activate Product
                                    <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-white/5 pt-6">
                        <p className="text-xs text-zinc-600">
                            Need help? <a href="#" className="text-zinc-400 hover:text-primary transition-colors">Contact Support</a> or <a href="#" className="text-zinc-400 hover:text-primary transition-colors">Buy License</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LicenseActivation;
