import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from '@/integrations/api/client';
import type { Therapist } from '@/api/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DollarSign, GraduationCap, Users, Edit2 } from "lucide-react";

interface TherapistPricing {
  id: string;
  name: string;
  is_active: boolean;
  price_public: number;
  price_university_enabled: boolean;
  price_university: number;
  price_corporate: number | null;
  price_international: number | null;
}

interface PricingTierData {
  price?: number;
  enabled?: boolean;
}

interface TherapistPricingStructure {
  public?: PricingTierData;
  university_pe?: PricingTierData;
  corporate?: PricingTierData;
  university_international?: PricingTierData;
}

interface PricingEntry {
  id: string;
  pricing_tier: string;
  price: number;
  is_enabled: boolean;
}

export function TherapistPricingManager() {
  const queryClient = useQueryClient();
  const [editingTherapist, setEditingTherapist] = useState<TherapistPricing | null>(null);

  const { data: therapists, isLoading } = useQuery({
    queryKey: ["admin-therapist-pricing"],
    queryFn: async () => {
      const response = await apiClient.gettherapists();
      if (response && 'data' in response && Array.isArray(response.data)) {
        return (response.data as Therapist[]).map(t => {
          const pricing = (t.pricing as TherapistPricingStructure | undefined) || {};
          return {
            id: t.id || '',
            name: t.name || '',
            is_active: t.is_active !== false,
            price_public: pricing.public?.price ? Number(pricing.public.price) : (t.hourly_rate ? Number(t.hourly_rate) : 0),
            price_university_enabled: pricing.university_pe?.enabled || false,
            price_university: pricing.university_pe?.price ? Number(pricing.university_pe.price) : 0,
            price_corporate: pricing.corporate?.price ? Number(pricing.corporate.price) : null,
            price_international: pricing.university_international?.price ? Number(pricing.university_international.price) : null,
          } as TherapistPricing;
        }).sort((a, b) => a.name.localeCompare(b.name));
      }
      return [];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<TherapistPricing> & { id: string }) => {
      const { id, price_public, price_university, price_university_enabled, price_corporate, price_international } = updates;

      // Construir objeto de pricing según el formato del backend
      const pricingData: TherapistPricingStructure = {
        public: { price: price_public },
        university_pe: {
          enabled: price_university_enabled,
          price: price_university
        }
      };

      if (price_corporate) {
        pricingData.corporate = { price: price_corporate };
      }

      if (price_international) {
        pricingData.university_international = { price: price_international };
      }

      // Usar el método put del apiClient
      await apiClient.put(`/therapists/${id}/pricing/batch`, pricingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-therapist-pricing"] });
      toast.success("Precios actualizados");
      setEditingTherapist(null);
    },
    onError: () => {
      toast.error("Error al actualizar precios");
    }
  });

  const toggleUniversityMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      // Obtener pricing actual usando apiClient
      const pricingData = await apiClient.get<{ data: PricingEntry[] }>(`/therapists/${id}/pricing`);
      const currentPricing: PricingEntry[] = pricingData?.data || [];

      // Encontrar el pricing de university_pe y actualizarlo
      const universityPricing = currentPricing.find((p) => p.pricing_tier === 'university_pe');

      if (universityPricing) {
        await apiClient.put(`/therapist-pricing/${universityPricing.id}`, { is_enabled: enabled });
      } else if (enabled) {
        // Crear nuevo pricing university_pe si no existe
        const therapistResponse = await apiClient.gettherapist(id);
        const therapist = therapistResponse?.data;
        const defaultPrice = therapist?.hourly_rate ? Number(therapist.hourly_rate) : 25;

        await apiClient.post(`/therapists/${id}/pricing`, {
          pricing_tier: 'university_pe',
          price: defaultPrice,
          is_enabled: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-therapist-pricing"] });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Precios por Psicólogo
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {therapists?.map(therapist => (
            <div key={therapist.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-card">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-lg">{therapist.name}</span>
                  {!therapist.is_active && (
                    <Badge variant="outline" className="text-xs">Inactivo</Badge>
                  )}
                </div>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                  <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> Público:
                    </span>
                    <strong className="text-foreground">S/ {therapist.price_public}</strong>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                    <span className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" /> Universitario:
                    </span>
                    <span className={therapist.price_university_enabled ? "font-bold text-green-600" : "line-through opacity-70"}>
                      S/ {therapist.price_university}
                    </span>
                  </div>
                  {therapist.price_corporate && (
                    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                      <span>Corp:</span>
                      <span>S/ {therapist.price_corporate}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`uni-${therapist.id}`} className="text-xs text-muted-foreground sm:hidden">
                    Univ.
                  </Label>
                  <Switch
                    id={`uni-${therapist.id}`}
                    checked={therapist.price_university_enabled}
                    onCheckedChange={(checked) =>
                      toggleUniversityMutation.mutate({ id: therapist.id, enabled: checked })
                    }
                  />
                  <Label className="text-xs text-muted-foreground hidden sm:block">
                    Univ.
                  </Label>
                </div>
                <Dialog open={editingTherapist?.id === therapist.id} onOpenChange={(open) => {
                  if (open) setEditingTherapist(therapist);
                  else setEditingTherapist(null);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <Edit2 className="h-4 w-4 mr-2" />
                      Wait
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Precios: {therapist.name}</DialogTitle>
                    </DialogHeader>
                    {editingTherapist && (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        updateMutation.mutate({
                          id: editingTherapist.id,
                          price_public: editingTherapist.price_public,
                          price_university: editingTherapist.price_university,
                          price_university_enabled: editingTherapist.price_university_enabled,
                          price_corporate: editingTherapist.price_corporate,
                          price_international: editingTherapist.price_international
                        });
                      }} className="space-y-4">
                        <div>
                          <Label htmlFor="price_public">Precio Público General (S/)</Label>
                          <Input
                            id="price_public"
                            type="number"
                            min="0"
                            step="1"
                            value={editingTherapist.price_public}
                            onChange={(e) => setEditingTherapist({
                              ...editingTherapist,
                              price_public: parseFloat(e.target.value) || 0
                            })}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            id="price_university_enabled"
                            checked={editingTherapist.price_university_enabled}
                            onCheckedChange={(checked) => setEditingTherapist({
                              ...editingTherapist,
                              price_university_enabled: checked
                            })}
                          />
                          <Label htmlFor="price_university_enabled">Habilitar tarifa universitaria</Label>
                        </div>
                        <div>
                          <Label htmlFor="price_university">Precio Universitario (S/)</Label>
                          <Input
                            id="price_university"
                            type="number"
                            min="0"
                            step="1"
                            value={editingTherapist.price_university}
                            onChange={(e) => setEditingTherapist({
                              ...editingTherapist,
                              price_university: parseFloat(e.target.value) || 0
                            })}
                            disabled={!editingTherapist.price_university_enabled}
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
