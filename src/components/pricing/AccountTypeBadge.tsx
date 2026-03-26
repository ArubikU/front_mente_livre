import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Globe, Building2, Users } from "lucide-react";
import type { AccountType } from "@/lib/emailClassification";

interface AccountTypeBadgeProps {
  accountType: AccountType;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const icons: Record<AccountType, React.ElementType> = {
  university_pe: GraduationCap,
  university_international: Globe,
  corporate: Building2,
  public: Users,
};

const colors: Record<AccountType, string> = {
  university_pe: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
  university_international: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100',
  corporate: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100',
  public: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100',
};

export function AccountTypeBadge({ accountType, showDescription = false, size = 'md' }: AccountTypeBadgeProps) {
  const { t } = useTranslation('common');
  
  const Icon = icons[accountType];
  const label = t(`account.${accountType}`);
  const colorClasses = colors[accountType];

  // Add preferential rate suffix for university accounts
  const displayLabel = accountType === 'university_pe' 
    ? `${label} — ${t('account.preferentialRate')}`
    : label;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div className="flex flex-col gap-1">
      <Badge 
        variant="outline" 
        className={`${colorClasses} ${sizeClasses[size]} inline-flex items-center gap-1.5 font-medium w-fit`}
      >
        <Icon className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
        {displayLabel}
      </Badge>
      {showDescription && (
        <p className="text-xs text-muted-foreground">
          {accountType === 'university_pe' && t('account.preferentialRate')}
        </p>
      )}
    </div>
  );
}
