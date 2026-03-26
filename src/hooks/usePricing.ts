import { useState, useCallback } from "react";
import { apiClient } from '@/integrations/api/client';
import { classifyEmail } from "@/lib/emailClassification";
import type { AccountType, PricingTier } from "@/lib/emailClassification";

interface TherapistPricing {
  price_public: number;
  price_university_enabled: boolean;
  price_university: number;
  price_corporate: number | null;
  price_international: number | null;
}

interface PricingResult {
  pricingTier: PricingTier;
  originalPrice: number;
  discountApplied: number;
  finalPrice: number;
  accountType: AccountType;
  promoCodeId: string | null;
  isUniversityRate: boolean;
}

interface PromoCodeData {
  id: string;
  discount_percent: number;
}

export function usePricing() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeAppointmentPrice = useCallback(async (
    userEmail: string,
    therapistId: string,
    serviceType: string = 'consejeria',
    promoCode?: PromoCodeData | null
  ): Promise<PricingResult | null> => {
    setIsCalculating(true);
    setError(null);

    try {
      // 1. Classify email
      const accountType = await classifyEmail(userEmail);

      // 2. Fetch therapist pricing
      const therapistResponse = await apiClient.gettherapist(therapistId);
      if (!therapistResponse || !('data' in therapistResponse) || !therapistResponse.data) {
        throw new Error('No se encontró el terapeuta');
      }

      const therapist = therapistResponse.data;
      
      // Get pricing from therapist.pricing object or fallback to hourly_rate
      const pricingData = (therapist as { pricing?: Record<string, { price?: number | string; enabled?: boolean }> }).pricing || {};
      const pricing: TherapistPricing = {
        price_public: pricingData.public?.price ? Number(pricingData.public.price) : (therapist.hourly_rate ? Number(therapist.hourly_rate) : 50),
        price_university_enabled: pricingData.university_pe?.enabled || false,
        price_university: pricingData.university_pe?.price ? Number(pricingData.university_pe.price) : 0,
        price_corporate: pricingData.corporate?.price ? Number(pricingData.corporate.price) : null,
        price_international: pricingData.university_international?.price ? Number(pricingData.university_international.price) : null,
      };

      // 3. Determine base price based on account type
      let basePrice: number;
      let pricingTier: PricingTier;
      let isUniversityRate = false;

      // Only apply university rate for "consejeria" service
      if (serviceType === 'consejeria' && accountType === 'university_pe' && pricing.price_university_enabled) {
        basePrice = pricing.price_university;
        pricingTier = 'university_pe';
        isUniversityRate = true;
      } else if (accountType === 'university_international') {
        // International students use public rate (or international if set)
        basePrice = pricing.price_international ?? pricing.price_public;
        pricingTier = 'university_international';
      } else if (accountType === 'corporate') {
        // Corporate users use corporate rate (or public if not set)
        basePrice = pricing.price_corporate ?? pricing.price_public;
        pricingTier = 'corporate';
      } else {
        // Default to public rate
        basePrice = pricing.price_public;
        pricingTier = 'public';
      }

      // 4. Apply promo code if provided
      let discountApplied = 0;
      let finalPrice = basePrice;
      let promoCodeId: string | null = null;

      if (promoCode) {
        discountApplied = basePrice * (promoCode.discount_percent / 100);
        finalPrice = basePrice - discountApplied;
        promoCodeId = promoCode.id;
      }

      return {
        pricingTier,
        originalPrice: basePrice,
        discountApplied,
        finalPrice,
        accountType,
        promoCodeId,
        isUniversityRate
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al calcular precio';
      setError(message);
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const validateAndComputePrice = useCallback(async (
    userEmail: string,
    therapistId: string,
    serviceType: string = 'consejeria',
    promoCode?: PromoCodeData | null,
    submittedPrice?: number
  ): Promise<{ valid: boolean; pricing: PricingResult | null; error?: string }> => {
    const pricing = await computeAppointmentPrice(userEmail, therapistId, serviceType, promoCode);
    
    if (!pricing) {
      return { valid: false, pricing: null, error: error || 'Error de cálculo' };
    }

    // Anti-bypass: validate that submitted price matches calculated price
    if (submittedPrice !== undefined && Math.abs(submittedPrice - pricing.finalPrice) > 0.01) {
      return { 
        valid: false, 
        pricing, 
        error: 'El precio enviado no coincide con el precio calculado. Intente de nuevo.' 
      };
    }

    return { valid: true, pricing };
  }, [computeAppointmentPrice, error]);

  return {
    isCalculating,
    error,
    computeAppointmentPrice,
    validateAndComputePrice
  };
}
