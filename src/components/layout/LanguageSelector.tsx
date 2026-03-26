import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const languages = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <Select value={i18n.language} onValueChange={(lng) => i18n.changeLanguage(lng)}>
      <SelectTrigger className="w-auto gap-2 border-none shadow-none hover:bg-muted px-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <SelectValue>
          <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
          <span className="sm:hidden">{currentLang.flag}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-2">
              {lang.flag} {lang.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
