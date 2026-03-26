import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend.mentelivre.org/';

// MercadoPago SDK global types
declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface MercadoPagoPaymentProps {
  amount: number;
  appointmentId: string;
  payerEmail?: string;
  onSuccess: (paymentId: string, status: string) => void;
  onError: (error: string) => void;
  mode?: 'brick' | 'modal';
}

export default function MercadoPagoPayment({
  amount,
  appointmentId,
  payerEmail,
  onSuccess,
  onError,
  mode = 'brick',
}: MercadoPagoPaymentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const brickControllerRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const mpRef = useRef<any>(null);

  const initMercadoPago = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      // 1. Fetch public key
      const keyResponse = await fetch(`${API_BASE_URL}/payments/mercadopago/public-key`);
      if (!keyResponse.ok) throw new Error('No se pudo obtener la configuración de MercadoPago');
      const keyData = await keyResponse.json();
      const publicKey = keyData.data?.public_key;

      if (!publicKey) throw new Error('MercadoPago no está configurado');
      if (!window.MercadoPago) throw new Error('SDK de MercadoPago no cargado');

      mpRef.current = new window.MercadoPago(publicKey, { locale: 'es-PE' });

      if (mode === 'modal') {
        // Create Preference for Checkout Pro
        const response = await fetch(`${API_BASE_URL}/payments/mercadopago/preference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_amount: amount,
            appointment_id: appointmentId,
            payer_email: payerEmail || 'user@example.com',
            description: 'Sesión de consejería - Mente Livre',
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error al crear la preferencia');

        setPreferenceId(result.data.id);
        setIsLoading(false);
      } else {
        // Initialize Brick (Existing logic)
        const bricksBuilder = mpRef.current.bricks();
        brickControllerRef.current = await bricksBuilder.create('payment', 'mp-payment-brick-container', {
          initialization: {
            amount: amount,
            payer: { email: payerEmail || '' },
          },
          customization: {
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              mercadoPago: "all",
            },
          },
          callbacks: {
            onReady: () => setIsLoading(false),
            onSubmit: async ({ formData }: any) => {
              setIsProcessing(true);
              try {
                const response = await fetch(`${API_BASE_URL}/payments/mercadopago`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...formData, appointment_id: appointmentId }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Error procesando pago');
                onSuccess(result.data.payment_id, result.data.status);
              } catch (err: any) {
                setError(err.message);
                onError(err.message);
              } finally {
                setIsProcessing(false);
              }
            },
            onError: (err: any) => setError(err.message),
          },
        });
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }, [amount, appointmentId, payerEmail, mode, onSuccess, onError]);

  useEffect(() => {
    initMercadoPago();
    return () => {
      if (brickControllerRef.current) brickControllerRef.current.unmount();
    };
  }, [initMercadoPago]);

  const handleOpenModal = () => {
    if (!mpRef.current || !preferenceId) return;

    mpRef.current.checkout({
      preference: { id: preferenceId },
      autoOpen: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">
          {mode === 'modal' ? 'Pagar con Mercado Pago (Pro)' : 'Pagar con tarjeta'}
        </h3>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium">Procesando pago...</p>
          </div>
        </div>
      )}

      {mode === 'modal' && !isLoading && !error && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Soportamos todos los medios de pago, incluyendo Google Pay y Apple Pay.
          </p>
          <Button onClick={handleOpenModal} size="lg" className="w-full bg-[#009EE3] hover:bg-[#007EB5] text-white">
            Pagar ahora con Mercado Pago
          </Button>
        </div>
      )}

      <div id="mp-payment-brick-container" className={mode === 'modal' || isLoading ? 'hidden' : ''} />

      <p className="text-xs text-muted-foreground text-center mt-4">
        🔒 Pago seguro procesado por MercadoPago.
      </p>
    </div>
  );
}
