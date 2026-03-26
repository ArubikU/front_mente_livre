import type { AccountType } from '@/lib/emailClassification';

export type PricingTier = AccountType;

export interface TherapistPricingData {
  price_public?: number;
  price_university_enabled?: boolean;
  price_university?: number;
  price_corporate?: number | null;
  price_international?: number | null;
  hourly_rate?: number; // fallback
}

export interface DisplayPriceResult {
  displayPrice: number;
  isUniversityRate: boolean;
  pricingTier: 'university_pe' | 'university_international' | 'corporate' | 'public';
  basePrice?: number;
  discount?: number;
  finalPrice?: number;
  label?: string;
}

const PRICING_CONFIG: Record<PricingTier, { basePrice: number; discount: number; label: string }> = {
  university_pe: {
    basePrice: 40,
    discount: 0,
    label: 'Tarifa Universitaria Peruana'
  },
  university_international: {
    basePrice: 30,
    discount: 0,
    label: 'Tarifa Universitaria Internacional'
  },
  corporate: {
    basePrice: 40,
    discount: 0,
    label: 'Tarifa Corporativa'
  },
  public: {
    basePrice: 50,
    discount: 0,
    label: 'Tarifa Público General'
  }
};

/**
 * Calcula el precio a mostrar según el account_type del usuario y los precios del terapeuta.
 * 
 * Reglas:
 * - Si account_type === "public" → mostrar price_public
 * - Si account_type === "university_pe" y price_university_enabled === true → mostrar price_university
 * - Si account_type === "university_pe" pero price_university_enabled === false → mostrar price_public
 * - Si no hay sesión (accountType === null) → mostrar price_public por defecto
 */
export function getDisplayPrice(
  therapist: TherapistPricingData | { hourly_rate?: number | string; pricing?: Record<string, unknown> },
  accountType: AccountType | null
): DisplayPriceResult {
  // Convertir therapist a TherapistPricingData si es necesario
  // El backend puede devolver hourly_rate como string o un objeto pricing
  const hourlyRate = 'hourly_rate' in therapist 
    ? (typeof therapist.hourly_rate === 'string' ? Number(therapist.hourly_rate) : therapist.hourly_rate)
    : undefined;
  
  // Extraer precios del objeto pricing si existe
  const pricing = 'pricing' in therapist && therapist.pricing ? therapist.pricing : null;
  const publicPrice = pricing && typeof pricing === 'object' && 'public' in pricing 
    ? (pricing.public as { price?: number; enabled?: boolean })?.price 
    : undefined;
  const universityPrice = pricing && typeof pricing === 'object' && 'university_pe' in pricing 
    ? (pricing.university_pe as { price?: number; enabled?: boolean })?.price 
    : undefined;
  const universityEnabled = pricing && typeof pricing === 'object' && 'university_pe' in pricing 
    ? (pricing.university_pe as { price?: number; enabled?: boolean })?.enabled 
    : undefined;
  
  const pricingData: TherapistPricingData = {
    price_public: publicPrice ?? ('price_public' in therapist ? (typeof therapist.price_public === 'string' ? Number(therapist.price_public) : therapist.price_public) : undefined),
    price_university_enabled: universityEnabled ?? ('price_university_enabled' in therapist ? therapist.price_university_enabled : undefined),
    price_university: universityPrice ?? ('price_university' in therapist ? (typeof therapist.price_university === 'string' ? Number(therapist.price_university) : therapist.price_university) : undefined),
    price_corporate: 'price_corporate' in therapist ? (typeof therapist.price_corporate === 'string' ? Number(therapist.price_corporate) : therapist.price_corporate) : undefined,
    price_international: 'price_international' in therapist ? (typeof therapist.price_international === 'string' ? Number(therapist.price_international) : therapist.price_international) : undefined,
    hourly_rate: hourlyRate,
  };

  // Default fallback to price_public o hourly_rate o precio por defecto
  const defaultPrice = pricingData.price_public ?? (hourlyRate ? Number(hourlyRate) : undefined) ?? PRICING_CONFIG.public.basePrice;

  // No session or public account → show public price
  if (!accountType || accountType === 'public') {
    const config = PRICING_CONFIG.public;
    return {
      displayPrice: defaultPrice,
      isUniversityRate: false,
      pricingTier: 'public',
      basePrice: config.basePrice,
      discount: config.discount,
      finalPrice: defaultPrice,
      label: config.label,
    };
  }

  // University Peru - prefer therapist-specific university price when enabled
  if (accountType === 'university_pe') {
    const fallbackPublic = pricingData.price_public ?? defaultPrice;
    const universityEnabled = pricingData.price_university_enabled;
    const hasUniversityPrice = typeof pricingData.price_university === 'number';
    const price = universityEnabled === false
      ? fallbackPublic
      : (hasUniversityPrice ? (pricingData.price_university as number) : fallbackPublic);
    const config = PRICING_CONFIG.university_pe;
    return {
      displayPrice: price,
      isUniversityRate: universityEnabled !== false && hasUniversityPrice,
      pricingTier: 'university_pe',
      basePrice: price,
      discount: config.discount,
      finalPrice: price,
      label: config.label,
    };
  }

  // International university
  if (accountType === 'university_international') {
    const price = pricingData.price_international ?? PRICING_CONFIG.university_international.basePrice;
    const config = PRICING_CONFIG.university_international;
    return {
      displayPrice: price,
      isUniversityRate: false,
      pricingTier: 'university_international',
      basePrice: config.basePrice,
      discount: config.discount,
      finalPrice: price,
      label: config.label,
    };
  }

  // Corporate
  if (accountType === 'corporate') {
    const price = pricingData.price_corporate ?? PRICING_CONFIG.corporate.basePrice;
    const config = PRICING_CONFIG.corporate;
    return {
      displayPrice: price,
      isUniversityRate: false,
      pricingTier: 'corporate',
      basePrice: config.basePrice,
      discount: config.discount,
      finalPrice: price,
      label: config.label,
    };
  }

  // Default fallback
  const config = PRICING_CONFIG.public;
  return {
    displayPrice: defaultPrice,
    isUniversityRate: false,
    pricingTier: 'public',
    basePrice: config.basePrice,
    discount: config.discount,
    finalPrice: defaultPrice,
    label: config.label,
  };
}

export function calculatePrice(accountType: AccountType, promoDiscount: number = 0): DisplayPriceResult {
  const config = PRICING_CONFIG[accountType];
  const basePrice = config.basePrice;
  const totalDiscount = config.discount + promoDiscount;
  const finalPrice = Math.max(basePrice * (1 - totalDiscount / 100), 0);

  return {
    displayPrice: finalPrice,
    isUniversityRate: accountType === 'university_pe',
    pricingTier: accountType,
    basePrice,
    discount: totalDiscount,
    finalPrice,
    label: config.label
  };
}

export function formatPrice(price: number): string {
  return `S/ ${price.toFixed(2)}`;
}

export function getPricingTierLabel(tier: PricingTier): string {
  return PRICING_CONFIG[tier]?.label || 'Tarifa Público General';
}

/**
 * Labels amigables para el usuario
 */
export function getAccountTypeLabel(accountType: AccountType | null): string {
  switch (accountType) {
    case 'university_pe':
      return 'Cuenta universitaria';
    case 'university_international':
      return 'Cuenta educativa internacional';
    case 'corporate':
      return 'Cuenta corporativa';
    case 'public':
    default:
      return 'Público general';
  }
}

export function getAccountTypeBadgeVariant(accountType: AccountType | null): 'default' | 'secondary' | 'outline' {
  if (accountType === 'university_pe') {
    return 'default';
  }
  return 'secondary';
}
