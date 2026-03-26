import { useState } from "react";
import { apiClient } from '@/integrations/api/client';

interface ValidatePromoRequest {
  code: string;
  user_email: string;
  base_price?: number;
}

interface PromoCodeValidation {
  isValid: boolean;
  promoCode: {
    id: string;
    code: string;
    discount_percent: number;
    base_price: number;
    max_sessions: number;
  } | null;
  finalPrice: number;
  discountAmount: number;
  error: string | null;
}

export function usePromoCode() {
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<PromoCodeValidation>({
    isValid: false,
    promoCode: null,
    finalPrice: 0,
    discountAmount: 0,
    error: null,
  });

  const validateCode = async (code: string, userEmail: string, basePrice?: number): Promise<PromoCodeValidation> => {
    if (!code.trim()) {
      const result = { isValid: false, promoCode: null, finalPrice: 0, discountAmount: 0, error: null };
      setValidation(result);
      return result;
    }

    setIsValidating(true);
    try {
      const requestData: ValidatePromoRequest = {
        code: code.toUpperCase().trim(),
        user_email: userEmail.toLowerCase()
      };
      
      // Si se proporciona basePrice, enviarlo al backend para calcular el descuento sobre ese precio
      if (basePrice !== undefined && basePrice > 0) {
        requestData.base_price = basePrice;
      }
      
      const response = await apiClient.validatepromocode(requestData);

      if (response && 'data' in response && response.data) {
        const validationData = response.data;
        
        if (!validationData.valid) {
          const result = {
            isValid: false,
            promoCode: null,
            finalPrice: 0,
            discountAmount: 0,
            error: validationData.message || "Código inválido"
          };
          setValidation(result);
          return result;
        }

        // Código válido
        const result: PromoCodeValidation = {
          isValid: true,
          promoCode: {
            id: validationData.promo_code_id || '',
            code: validationData.code || '',
            discount_percent: validationData.discount_percent || 0,
            base_price: validationData.base_price || 0,
            max_sessions: validationData.max_sessions || 1,
          },
          finalPrice: validationData.final_price || 0,
          discountAmount: validationData.discount_amount || 0,
          error: null,
        };
        
        setValidation(result);
        return result;
      }

      const result = { isValid: false, promoCode: null, finalPrice: 0, discountAmount: 0, error: "Error al validar el código" };
      setValidation(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al validar el código";
      const result = { isValid: false, promoCode: null, finalPrice: 0, discountAmount: 0, error: errorMessage };
      setValidation(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  };

  const recordUsage = async (
    promoCodeId: string,
    userEmail: string,
    appointmentId: string,
    discountApplied: number,
    finalAmount: number
  ) => {
    // Actualmente el backend registra el uso al crear la cita; usamos los argumentos para evitar unused y dejar trazabilidad.
    void promoCodeId;
    void userEmail;
    void appointmentId;
    void discountApplied;
    void finalAmount;
    return Promise.resolve();
  };

  const clearValidation = () => {
    setValidation({
      isValid: false,
      promoCode: null,
      finalPrice: 0,
      discountAmount: 0,
      error: null,
    });
  };

  return {
    isValidating,
    validation,
    validateCode,
    recordUsage,
    clearValidation,
  };
}
