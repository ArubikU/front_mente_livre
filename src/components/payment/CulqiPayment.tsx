import { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend.mentelivre.org/';

// Types for Culqi
interface CulqiSettings {
    title: string;
    currency: string;
    description: string;
    amount: number;
}

interface CulqiToken {
    id: string;
    email: string;
}

interface CulqiError {
    user_message: string;
}

declare global {
    interface Window {
        Culqi: {
            publicKey: string;
            settings: (settings: CulqiSettings) => void;
            open: () => void;
            close: () => void;
            token?: CulqiToken;
            error?: CulqiError;
        };
        culqi: () => void;
    }
}

interface CulqiPaymentProps {
    amount: number;
    appointmentId: string;
    payerEmail?: string;
    onSuccess: (paymentId: string, status: string) => void;
    onError: (error: string) => void;
}

export default function CulqiPayment({
    amount,
    appointmentId,
    payerEmail,
    onSuccess,
    onError,
}: CulqiPaymentProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const initCulqi = async () => {
            try {
                // 1. Get Public Key from backend
                const keyResponse = await fetch(`${API_BASE_URL}/payments/culqi/public-key`);
                if (!keyResponse.ok) throw new Error('Error obteniendo configuración de Culqi');

                const keyData = await keyResponse.json();
                const publicKey = keyData.data?.public_key;

                if (!publicKey) throw new Error('Culqi no está configurado');

                // 2. Configure Culqi
                if (window.Culqi) {
                    window.Culqi.publicKey = publicKey;

                    // Convert amount to integer cents (S/ 25.00 -> 2500)
                    const amountInCents = Math.round(amount * 100);

                    window.Culqi.settings({
                        title: 'Mente Livre',
                        currency: 'PEN',
                        description: 'Sesión de consejería',
                        amount: amountInCents,
                    });

                    // 3. Define callback function
                    window.culqi = async () => {
                        if (window.Culqi.token) {
                            // Token created successfully
                            const token = window.Culqi.token.id;
                            const email = window.Culqi.token.email || payerEmail;

                            setIsProcessing(true);
                            setError(null);
                            window.Culqi.close(); // Close modal

                            try {
                                // 4. Send token to backend
                                const response = await fetch(`${API_BASE_URL}/payments/culqi`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        token,
                                        amount: amount, // Backend expects value in soles or as configured? Service expects float soles and converts.
                                        email: email,
                                        appointment_id: appointmentId,
                                        description: 'Sesión de consejería - Mente Livre'
                                    })
                                });

                                const result = await response.json();

                                if (!response.ok) {
                                    throw new Error(result.message || 'Error procesando el pago');
                                }

                                const paymentData = result.data || result;

                                if (paymentData.status === 'approved') {
                                    onSuccess(paymentData.payment_id, 'approved');
                                } else {
                                    const msg = paymentData.status_detail || 'Pago no aprobado';
                                    setError(msg);
                                    onError(msg);
                                }

                            } catch (err) {
                                const message = err instanceof Error ? err.message : 'Error procesando pago';
                                setError(message);
                                onError(message);
                            } finally {
                                setIsProcessing(false);
                            }

                        } else {
                            // Error in token generation (user closed modal or error)
                            if (window.Culqi.error) {
                                console.error('Culqi Error:', window.Culqi.error);
                                setError(window.Culqi.error.user_message || 'Error en el formulario de pago');
                            }
                        }
                    };

                    setIsLoading(false);
                } else {
                    throw new Error('Librería CulqiJS no cargada');
                }

            } catch (err) {
                const message = err instanceof Error ? err.message : 'Error inicializando Culqi';
                setError(message);
                setIsLoading(false);
            }
        };

        initCulqi();
    }, [amount, appointmentId, payerEmail, onSuccess, onError]);

    const handlePay = () => {
        if (window.Culqi) {
            window.Culqi.open();
        }
    };

    return (
        <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Pagar con tarjeta (Culqi)</h3>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <Button
                    onClick={handlePay}
                    className="w-full py-6 text-lg font-bold bg-[#FF5F00] hover:bg-[#e05300] text-white"
                    disabled={isProcessing}
                >
                    {isProcessing ? 'Procesando...' : `Pagar S/ ${amount.toFixed(2)}`}
                </Button>
            )}

            {error && (
                <div className="flex items-start justify-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md mt-2">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
                Procesado de forma segura por Culqi
            </p>
        </div>
    );
}
