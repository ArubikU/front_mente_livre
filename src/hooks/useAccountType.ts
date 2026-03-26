import { useState, useEffect, useCallback } from "react";
import { classifyEmail, getAccountTypeLabel, getAccountTypeDescription, getAccountTypeBadgeColor } from "@/lib/emailClassification";
import type { AccountType } from "@/lib/emailClassification";

interface AccountTypeResult {
  accountType: AccountType;
  domain: string;
  isUniversityVerified: boolean;
  label: string;
  description: string;
  badgeColor: string;
}

export function useAccountType(email: string) {
  const [result, setResult] = useState<AccountTypeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const classify = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      setResult(null);
      return null;
    }

    setIsLoading(true);
    try {
      const accountType = await classifyEmail(emailToCheck);
      const domain = emailToCheck.split('@')[1] || '';
      const fullResult: AccountTypeResult = {
        accountType,
        domain,
        isUniversityVerified: accountType === 'university_pe' || accountType === 'university_international',
        label: getAccountTypeLabel(accountType),
        description: getAccountTypeDescription(accountType),
        badgeColor: getAccountTypeBadgeColor(accountType)
      };
      setResult(fullResult);
      return fullResult;
    } catch (error) {
      console.error('Error classifying email:', error);
      setResult(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (email && email.includes('@')) {
        classify(email);
      } else {
        setResult(null);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [email, classify]);

  return {
    result,
    isLoading,
    classify
  };
}
