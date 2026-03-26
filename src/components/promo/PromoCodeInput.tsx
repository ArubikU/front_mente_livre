import { useState } from "react";
import { Tag, Loader2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePromoCode } from "@/hooks/usePromoCode";
import { cn } from "@/lib/utils";

interface PromoCodeInputProps {
  userEmail: string;
  basePrice: number;
  onValidCode: (validation: {
    promoCodeId: string;
    code: string;
    discountPercent: number;
    finalPrice: number;
    discountAmount: number;
  }) => void;
  onClear: () => void;
}

export function PromoCodeInput({ userEmail, basePrice, onValidCode, onClear }: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const { isValidating, validation, validateCode, clearValidation } = usePromoCode();

  const handleApply = async () => {
    if (!code.trim()) return;
    
    // Enviar el precio base del terapeuta para que el descuento se calcule sobre ese precio
    const result = await validateCode(code, userEmail, basePrice);
    if (result.isValid && result.promoCode) {
      onValidCode({
        promoCodeId: result.promoCode.id,
        code: result.promoCode.code,
        discountPercent: result.promoCode.discount_percent,
        finalPrice: result.finalPrice,
        discountAmount: result.discountAmount,
      });
    }
  };

  const handleClear = () => {
    setCode("");
    clearValidation();
    onClear();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código promocional"
            className={cn(
              "pl-9 uppercase",
              validation.isValid && "border-green-500 bg-green-50",
              validation.error && "border-destructive bg-destructive/5"
            )}
            disabled={validation.isValid || isValidating}
          />
        </div>
        {validation.isValid ? (
          <Button 
            type="button"
            variant="outline" 
            size="icon" 
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            type="button"
            onClick={handleApply} 
            disabled={!code.trim() || isValidating}
            variant="outline"
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Aplicar"
            )}
          </Button>
        )}
      </div>
      
      {validation.isValid && validation.promoCode && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
          <Check className="h-4 w-4" />
          <span>
            ¡Código aplicado! {validation.promoCode.discount_percent}% de descuento
          </span>
        </div>
      )}
      
      {validation.error && (
        <p className="text-sm text-destructive">{validation.error}</p>
      )}
    </div>
  );
}
