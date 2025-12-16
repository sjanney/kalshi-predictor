import React, { useState, useEffect } from 'react';
import { Shield, User, Mail, Calendar, X, AlertCircle, LogOut } from 'lucide-react';

interface LicenseInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface LicenseData {
    name: string;
    email: string;
    type: string;
    expiry: string | null;
}

const LicenseInfoModal: React.FC<LicenseInfoModalProps> = ({ isOpen, onClose }) => {
    const [licenseData, setLicenseData] = useState<LicenseData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetch('http://localhost:8000/api/license/status')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'valid' && data.data) {
                        setLicenseData(data.data);
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch license info", err);
                    setLoading(false);
                });
        }
    }, [isOpen]);

    const handleDisconnect = async () => {
        if (!window.confirm("Are you sure you want to disconnect this license?")) return;
        try {
            const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            await fetch(`${BASE_URL}/api/license/disconnect`, { method: 'POST' });
            window.location.reload();
        } catch (e) {
            console.error(e);
        }
    };

    const daysRemaining = licenseData?.expiry
        ? Math.ceil((new Date(licenseData.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 relative">

                {/* Decorative Gradient Blob */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

                <div className="flex justify-between items-center p-6 border-b border-white/5 relative z-10">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
                            <Shield className="w-5 h-5 text-primary" />
                        </div>
                        License Details
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 relative z-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-zinc-500">Verifying license...</p>
                        </div>
                    ) : licenseData ? (
                        <>
                            <div className="space-y-3">
                                <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all duration-300">
                                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-white/10 group-hover:border-primary/20 group-hover:text-primary transition-colors">
                                        <User className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Licensed To</p>
                                        <p className="text-white font-medium tracking-wide">{licenseData.name}</p>
                                    </div>
                                </div>

                                <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all duration-300">
                                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-white/10 group-hover:border-primary/20 group-hover:text-primary transition-colors">
                                        <Mail className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Email Address</p>
                                        <p className="text-white font-medium tracking-wide">{licenseData.email}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="group flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all duration-300">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Shield className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Edition</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-bold capitalize text-lg">{licenseData.type}</span>
                                        </div>
                                    </div>

                                    <div className="group flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all duration-300">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Expires</p>
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-lg leading-none">
                                                {licenseData.expiry ? new Date(licenseData.expiry).toLocaleDateString() : 'Lifetime'}
                                            </p>
                                            {daysRemaining !== null && (
                                                <p className={`text-xs font-medium mt-1 ${daysRemaining < 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {daysRemaining} days left
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                    <span className="text-xs text-emerald-400 font-medium">License Active</span>
                                </div>

                                <button
                                    onClick={handleDisconnect}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-colors"
                                >
                                    <LogOut size={14} />
                                    Disconnect
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h4 className="text-white font-bold mb-2">Verification Failed</h4>
                            <p className="text-sm text-zinc-500">Unable to retrieve license information.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LicenseInfoModal;
