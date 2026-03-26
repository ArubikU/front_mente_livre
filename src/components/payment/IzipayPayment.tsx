import { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle, ShieldCheck, CreditCard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/integrations/api/client';
import { useTranslation } from 'react-i18next';

interface IzipayPaymentProps {
    amount: number;
    appointmentId: string;
    payerEmail?: string;
    onSuccess: (paymentId: string, status: string) => void;
    onError: (error: string) => void;
}

declare global {
    interface Window {
        KR?: any;
    }
}

// Custom CSS injected into <head> to override Krypton's default theme
const KRYPTON_CUSTOM_CSS = `
  /* ── Container ── */
  .kr-embedded {
    font-family: 'DM Sans', 'Plus Jakarta Sans', sans-serif !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  /* ── Pay button ── */
  .kr-embedded .kr-payment-button,
  .kr-embedded button[type="submit"] {
    background: linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(224 76% 48%) 100%) !important;
    color: #fff !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 14px 24px !important;
    font-size: 15px !important;
    font-weight: 600 !important;
    font-family: 'DM Sans', sans-serif !important;
    letter-spacing: 0.02em !important;
    width: 100% !important;
    margin-top: 12px !important;
    cursor: pointer !important;
    box-shadow: 0 4px 20px -4px hsl(217 91% 60% / 0.45) !important;
    transition: transform 0.15s, box-shadow 0.15s !important;
    height: auto !important;
  }
  .kr-embedded .kr-payment-button:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 8px 28px -4px hsl(217 91% 60% / 0.5) !important;
  }

  /* ── Error messages ── */
  .kr-embedded .kr-form-error,
  .kr-embedded .kr-field-error {
    color: hsl(0 72% 51%) !important;
    font-size: 12px !important;
    margin-top: 4px !important;
  }

  /* ── Icons color ── */
  .kr-embedded .kr-icon-wrapper svg path,
  .kr-embedded .kr-icon-wrapper svg rect {
    fill: hsl(217 91% 60%) !important;
  }

  /* ── Dropdown selects ── */
  .kr-embedded select {
    appearance: auto !important;
    color: hsl(215 25% 35%) !important;
    padding-right: 30px !important;
  }
`;

export default function IzipayPayment({ appointmentId, onSuccess, onError }: IzipayPaymentProps) {
    const { t } = useTranslation('payment');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const initialized = useRef(false);
    const styleRef = useRef<HTMLStyleElement | null>(null);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        // Inject custom CSS once
        if (!styleRef.current) {
            const style = document.createElement('style');
            style.textContent = KRYPTON_CUSTOM_CSS;
            document.head.appendChild(style);
            styleRef.current = style;
        }

        const loadIzipay = async () => {
            try {
                setLoading(true);

                const response = await apiClient.post('/izipay/create-payment', {
                    appointment_id: appointmentId
                });

                const data = (response as any).data;
                if (!data?.answer?.formToken) {
                    throw new Error('No se pudo iniciar la pasarela de pago');
                }

                const formToken = data.answer.formToken;

                if (!window.KR) {
                    const publicKey = import.meta.env.VITE_IZIPAY_PUBLIC_KEY || '';
                    const script = document.createElement('script');
                    script.src = 'https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js';
                    script.setAttribute('kr-public-key', publicKey);
                    script.setAttribute('kr-form-token', formToken);
                    script.setAttribute('kr-theme', 'icons-1');
                    script.setAttribute('kr-placeholder-pan', 'Número de tarjeta');
                    script.setAttribute('kr-placeholder-expiry', 'MM / AA');
                    script.setAttribute('kr-placeholder-security-code', 'CVV');
                    script.setAttribute('kr-placeholder-holder-name', 'Nombre del titular');
                    script.setAttribute('kr-language', 'es-ES');
                    document.head.appendChild(script);
                    script.onload = () => initializeForm();
                } else {
                    if (window.KR?.setFormToken) {
                        await window.KR.setFormToken(formToken);
                        initializeForm();
                    }
                }
            } catch (err) {
                console.error(err);
                const msg = err instanceof Error ? err.message : 'Error al cargar Izipay';
                setError(msg);
                onError(msg);
                setLoading(false);
            }
        };

        const initializeForm = () => {
            if (!window.KR) return;
            window.KR.onFormReady(() => setLoading(false));
            window.KR.onSubmit(async (event: any) => {
                if (event.clientAnswer.orderStatus === 'PAID') {
                    onSuccess(event.clientAnswer.orderDetails.orderId, 'approved');
                } else {
                    onError(t('labels.izipay.not_processed') + event.clientAnswer.orderStatus);
                }
                return false;
            });
            window.KR.onError((event: any) => {
                setError(event.errorMessage);
                onError(event.errorMessage);
            });
        };

        loadIzipay();
    }, [appointmentId, onSuccess, onError]);

    if (error) {
        return (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">{t('labels.izipay.error_title')}</p>
                        <p className="text-xs text-destructive/70 mt-0.5">{error}</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => window.location.reload()}
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('labels.izipay.retry')}
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            {/* Header card */}
            <div className="rounded-2xl overflow-hidden shadow-card">
                {/* Gradient top bar */}
                <div className="h-1.5 w-full" style={{ background: 'var(--gradient-primary)' }} />

                <div className="bg-card p-5">
                    {/* Title row */}
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                            <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground leading-tight">{t('labels.izipay.title')}</p>
                            <p className="text-xs text-muted-foreground">{t('labels.izipay.subtitle')}</p>
                        </div>
                    </div>

                    {/* Loading overlay */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <div className="relative">
                                <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
                                <Loader2 className="absolute inset-0 h-12 w-12 animate-spin text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">{t('labels.izipay.loading')}</p>
                        </div>
                    )}

                    {/* Krypton form injected here */}
                    <div className={loading ? 'hidden' : ''}>
                        <div className="kr-embedded" kr-form-token="">
                            <button className="kr-payment-button" />
                            <div className="kr-form-error" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Security badge */}
            {!loading && (
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs">{t('labels.izipay.secure')}</span>
                </div>
            )}
        </div>
    );
}
