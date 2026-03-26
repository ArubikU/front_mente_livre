import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Users, Tag } from "lucide-react";
import type { PricingTier } from "@/lib/emailClassification";

interface PricingSummaryProps {
  pricingTier: PricingTier;
  originalPrice: number;
  discountApplied: number;
  finalPrice: number;
  isUniversityRate: boolean;
  promoCodeApplied?: string | null;
}

export function PricingSummary({
  pricingTier,
  originalPrice,
  discountApplied,
  finalPrice,
  isUniversityRate,
  promoCodeApplied
}: PricingSummaryProps) {
  const tierLabels: Record<PricingTier, string> = {
    university_pe: 'Tarifa Universitaria',
    university_international: 'Tarifa Internacional',
    corporate: 'Tarifa Corporativa',
    public: 'Tarifa Público General',
  };

  const tierColors: Record<PricingTier, string> = {
    university_pe: 'bg-green-100 text-green-800 border-green-200',
    university_international: 'bg-blue-100 text-blue-800 border-blue-200',
    corporate: 'bg-purple-100 text-purple-800 border-purple-200',
    public: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <Card className={isUniversityRate ? "border-green-200 bg-green-50/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge 
              variant="outline" 
              className={`${tierColors[pricingTier]} inline-flex items-center gap-1.5`}
            >
              {isUniversityRate ? (
                <GraduationCap className="h-4 w-4" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              {tierLabels[pricingTier]}
            </Badge>
            
            {isUniversityRate && (
              <p className="text-xs text-green-700">
                ✅ Tarifa subsidiada para estudiantes universitarios peruanos
              </p>
            )}

            {promoCodeApplied && (
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <Tag className="h-3 w-3" />
                <span>Código aplicado: <strong>{promoCodeApplied}</strong></span>
              </div>
            )}
          </div>

          <div className="text-right">
            {discountApplied > 0 ? (
              <>
                <p className="text-sm text-muted-foreground line-through">
                  S/ {originalPrice.toFixed(0)}
                </p>
                <p className="text-2xl font-bold text-primary">
                  S/ {finalPrice.toFixed(0)}
                </p>
                <p className="text-xs text-green-600">
                  -S/ {discountApplied.toFixed(0)} descuento
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold text-primary">
                S/ {finalPrice.toFixed(0)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
