// Email classification logic - Integrated with backend API
import { apiClient } from "@/integrations/api/client";

export type AccountType = 'university_pe' | 'university_international' | 'corporate' | 'public';
/** Alias for pricing tier (same as AccountType). */
export type PricingTier = AccountType;

export interface EmailDomainRule {
  id: string;
  domain: string;
  classification: AccountType;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Cache para reglas de dominio
let domainRulesCache: EmailDomainRule[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function getEmailDomainRules(): Promise<EmailDomainRule[]> {
  // Verificar si el cache es válido
  if (domainRulesCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    return domainRulesCache;
  }

  try {
    const response = await apiClient.getemaildomainrules();
    
    if (response && 'data' in response && Array.isArray(response.data)) {
      const raw = response.data as Array<{ id?: string; domain?: string; classification?: string; is_active?: boolean; created_at?: string; updated_at?: string }>;
      domainRulesCache = raw.map((rule: { id?: string; domain?: string; classification?: string; is_active?: boolean; created_at?: string; updated_at?: string }) => ({
        id: rule.id || '',
        domain: rule.domain || '',
        classification: (rule.classification as AccountType) || 'public',
        is_active: Boolean(rule.is_active),
        created_at: rule.created_at,
        updated_at: rule.updated_at
      }));
      cacheTimestamp = Date.now();
      return domainRulesCache;
    }
    
    // Si no hay datos válidos, retornar array vacío
    domainRulesCache = [];
    cacheTimestamp = Date.now();
    return domainRulesCache;
  } catch (error) {
    console.error('Error fetching email domain rules:', error);
    // En caso de error, usar cache existente si está disponible, o array vacío
    return domainRulesCache ?? [];
  }
}

export async function classifyEmail(email: string): Promise<AccountType> {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return 'public';
  }

  // Obtener reglas del backend
  const rules = await getEmailDomainRules();
  
  // Buscar coincidencia exacta de dominio en las reglas activas
  const exactMatch = rules.find(r => r.is_active && r.domain.toLowerCase() === domain);
  if (exactMatch) {
    return exactMatch.classification;
  }
  
  // Si no hay coincidencia exacta, buscar por subdominios
  // Por ejemplo: si el dominio es "cs.ulima.edu.pe", buscar "ulima.edu.pe"
  const domainParts = domain.split('.');
  for (let i = 0; i < domainParts.length - 1; i++) {
    const parentDomain = domainParts.slice(i).join('.');
    const parentMatch = rules.find(r => r.is_active && r.domain.toLowerCase() === parentDomain);
    if (parentMatch) {
      return parentMatch.classification;
    }
  }

  // Fallback: Clasificación por defecto basada en patrones comunes
  if (domain.endsWith('.edu.pe') || domain.endsWith('.ac.pe')) {
    return 'university_pe';
  }
  
  if (domain.endsWith('.edu') || domain.endsWith('.ac.uk') || domain.endsWith('.edu.ar')) {
    return 'university_international';
  }

  // Lista de dominios públicos comunes (gmail, hotmail, etc.)
  const publicDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com', 'msn.com'];
  if (publicDomains.includes(domain)) {
    return 'public';
  }

  // Si no es un dominio público común, asumir que es corporativo
  return 'corporate';
}

export function getAccountTypeLabel(type: AccountType): string {
  const labels: Record<AccountType, string> = {
    'university_pe': 'Universidad Peruana',
    'university_international': 'Universidad Internacional',
    'corporate': 'Corporativo',
    'public': 'Público'
  };
  
  return labels[type] || 'Público';
}

export function getAccountTypeDescription(type: AccountType): string {
  const descriptions: Record<AccountType, string> = {
    'university_pe': 'Cuenta de universidad peruana con descuentos especiales',
    'university_international': 'Cuenta de universidad internacional con tarifas preferenciales',
    'corporate': 'Cuenta corporativa con beneficios empresariales',
    'public': 'Cuenta pública con tarifas estándar'
  };
  
  return descriptions[type] || 'Cuenta pública con tarifas estándar';
}

export function getAccountTypeBadgeColor(type: AccountType): string {
  const colors: Record<AccountType, string> = {
    'university_pe': 'bg-blue-100 text-blue-800',
    'university_international': 'bg-purple-100 text-purple-800',
    'corporate': 'bg-green-100 text-green-800',
    'public': 'bg-gray-100 text-gray-800'
  };
  
  return colors[type] || 'bg-gray-100 text-gray-800';
}

export function invalidateCache() {
  domainRulesCache = null;
  cacheTimestamp = null;
}
