import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from '@/integrations/api/client';
import type { PromoCode as ApiPromoCode } from '@/types/database';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Tag, Gift, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PromoCodeFormData {
  code: string;
  is_active: boolean;
  discount_percent: number;
  base_price: number;
  max_uses_total: number | null;
  max_uses_per_user: number;
  max_sessions: number;
  valid_from: string;
  valid_until: string;
  has_validity: boolean;
}

const defaultFormData: PromoCodeFormData = {
  code: "",
  is_active: true,
  discount_percent: 20,
  base_price: 25,
  max_uses_total: null,
  max_uses_per_user: 1,
  max_sessions: 1,
  valid_from: "",
  valid_until: "",
  has_validity: false,
};

export function PromoCodesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PromoCodeFormData>(defaultFormData);
  const queryClient = useQueryClient();

  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ["promo-codes"],
    queryFn: async () => {
      const response = await apiClient.getpromocodes();
      if (response && 'data' in response && Array.isArray(response.data)) {
        return (response.data as ApiPromoCode[]).sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
      }
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PromoCodeFormData) => {
      const payload = {
        code: data.code.toUpperCase().trim(),
        is_active: data.is_active,
        discount_percent: data.discount_percent,
        base_price: data.base_price,
        max_uses_total: data.max_uses_total ?? undefined,
        max_uses_per_user: data.max_uses_per_user,
        max_sessions: data.max_sessions,
        valid_from: data.has_validity && data.valid_from ? data.valid_from : undefined,
        valid_until: data.has_validity && data.valid_until ? data.valid_until : undefined,
      };
      await apiClient.createpromocode(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      toast.success("Código promocional creado");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message.includes("duplicate")
        ? "Este código ya existe"
        : "Error al crear código");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PromoCodeFormData }) => {
      const payload = {
        code: data.code.toUpperCase().trim(),
        is_active: data.is_active,
        discount_percent: data.discount_percent,
        base_price: data.base_price,
        max_uses_total: data.max_uses_total ?? undefined,
        max_uses_per_user: data.max_uses_per_user,
        max_sessions: data.max_sessions,
        valid_from: data.has_validity && data.valid_from ? data.valid_from : undefined,
        valid_until: data.has_validity && data.valid_until ? data.valid_until : undefined,
      };
      await apiClient.updatepromocode(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      toast.success("Código actualizado");
      resetForm();
    },
    onError: () => toast.error("Error al actualizar código"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.deletepromocode(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      toast.success("Código eliminado");
    },
    onError: () => toast.error("Error al eliminar código"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await apiClient.updatepromocode(id, { is_active } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      toast.success("Estado actualizado");
    },
    onError: () => toast.error("Error al cambiar estado"),
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (promo: ApiPromoCode) => {
    // Función helper para convertir fecha del backend al formato YYYY-MM-DD para el input date
    const formatDateForInput = (dateString: string | null): string => {
      if (!dateString) return "";

      // Manejar diferentes formatos de fecha del backend
      // Formato ISO: "2026-01-23T00:00:00" o "2026-01-23T00:00:00.000Z"
      // Formato MySQL: "2026-01-23 00:00:00"
      let datePart = dateString;

      // Si tiene 'T', tomar la parte antes de 'T'
      if (dateString.includes('T')) {
        datePart = dateString.split('T')[0];
      }
      // Si tiene espacio, tomar la parte antes del espacio
      else if (dateString.includes(' ')) {
        datePart = dateString.split(' ')[0];
      }

      // Validar que tenga el formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return datePart;
      }

      return "";
    };

    setFormData({
      code: promo.code ?? '',
      is_active: promo.is_active ?? true,
      discount_percent: promo.discount_percent ?? 0,
      base_price: promo.base_price ?? 0,
      max_uses_total: promo.max_uses_total ?? null,
      max_uses_per_user: promo.max_uses_per_user ?? 1,
      max_sessions: promo.max_sessions ?? 1,
      valid_from: formatDateForInput(promo.valid_from ?? null),
      valid_until: formatDateForInput(promo.valid_until ?? null),
      has_validity: !!(promo.valid_from || promo.valid_until),
    });
    setEditingId(promo.id ?? null);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error("El código es requerido");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const calculateFinalPrice = (basePrice: number, discountPercent: number) => {
    return basePrice * (1 - discountPercent / 100);
  };

  const getPromoStatus = (promo: ApiPromoCode) => {
    if (!promo.is_active) return { label: "Inactivo", variant: "secondary" as const };

    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return { label: "Programado", variant: "outline" as const };
    }
    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return { label: "Vencido", variant: "destructive" as const };
    }
    if (promo.max_uses_total != null && (promo.uses_count ?? 0) >= promo.max_uses_total) {
      return { label: "Agotado", variant: "destructive" as const };
    }
    return { label: "Activo", variant: "default" as const };
  };

  const finalPrice = calculateFinalPrice(formData.base_price, formData.discount_percent);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Promociones
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo código
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar código promocional" : "Crear código promocional"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Código</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="DESCUENTO20"
                    className="uppercase"
                  />
                </div>

                <div className="flex items-center justify-between col-span-2">
                  <Label>Estado activo</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div>
                  <Label>Descuento (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <Label>Precio base (S/)</Label>
                  <Input
                    type="number"
                    min={1}
                    step={0.5}
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="col-span-2 p-3 bg-primary/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Monto final:</span>
                    <span className="text-xl font-bold text-primary">S/ {finalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <Label>Usos máx. totales</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.max_uses_total ?? ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      max_uses_total: e.target.value ? parseInt(e.target.value) : null
                    })}
                    placeholder="Sin límite"
                  />
                </div>

                <div>
                  <Label>Usos máx. por usuario</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.max_uses_per_user}
                    onChange={(e) => setFormData({ ...formData, max_uses_per_user: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Sesiones cubiertas</Label>
                  <Select
                    value={formData.max_sessions.toString()}
                    onValueChange={(value) => setFormData({ ...formData, max_sessions: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 sesión</SelectItem>
                      <SelectItem value="2">2 sesiones</SelectItem>
                      <SelectItem value="3">3 sesiones</SelectItem>
                      <SelectItem value="4">4 sesiones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between col-span-2">
                  <Label>Definir vigencia</Label>
                  <Switch
                    checked={formData.has_validity}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_validity: checked })}
                  />
                </div>

                {formData.has_validity && (
                  <>
                    <div>
                      <Label>Fecha inicio</Label>
                      <Input
                        type="date"
                        value={formData.valid_from}
                        onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Fecha fin</Label>
                      <Input
                        type="date"
                        value={formData.valid_until}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Guardar cambios" : "Crear código"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : !promoCodes?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay códigos promocionales</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Precio base</TableHead>
                  <TableHead>Monto final</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Por usuario</TableHead>
                  <TableHead>Sesiones</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promo) => {
                  const status = getPromoStatus(promo);
                  const usesRemaining = promo.max_uses_total != null
                    ? promo.max_uses_total - (promo.uses_count ?? 0)
                    : "∞";
                  return (
                    <TableRow key={promo.id}>
                      <TableCell className="font-mono font-bold">{promo.code}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>{promo.discount_percent}%</TableCell>
                      <TableCell>S/ {Number(promo.base_price || 0).toFixed(2)}</TableCell>
                      <TableCell className="font-bold text-primary">
                        S/ {calculateFinalPrice(Number(promo.base_price ?? 0), promo.discount_percent ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {promo.uses_count ?? 0} / {promo.max_uses_total ?? "∞"}
                        {typeof usesRemaining === "number" && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({usesRemaining} rest.)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{promo.max_uses_per_user}x</TableCell>
                      <TableCell>{promo.max_sessions}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(promo.created_at ?? 0), "dd/MM/yy", { locale: es })}
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title={promo.is_active ? "Desactivar" : "Activar"}
                          onClick={() => promo.id && toggleMutation.mutate({ id: promo.id, is_active: !promo.is_active })}
                          disabled={toggleMutation.isPending}
                        >
                          <Power className={`h-4 w-4 ${promo.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(promo)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (promo.id && confirm('¿Eliminar este código promocional?')) {
                              deleteMutation.mutate(promo.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
