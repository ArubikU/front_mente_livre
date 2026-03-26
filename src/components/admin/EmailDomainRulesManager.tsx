import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from '@/integrations/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Shield, ShieldOff, Globe } from "lucide-react";

type DomainRuleType = 'whitelist' | 'blacklist';

interface DomainRule {
  id: string;
  domain: string;
  rule_type: DomainRuleType;
  note: string | null;
  is_active: boolean;
  created_at: string;
}

export function EmailDomainRulesManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newRuleType, setNewRuleType] = useState<DomainRuleType>("whitelist");
  const [newNote, setNewNote] = useState("");

  const { data: rules, isLoading } = useQuery({
    queryKey: ["email-domain-rules"],
    queryFn: async () => {
      // Usar el método get del apiClient
      const data = await apiClient.get<{ data: DomainRule[] }>('/email-domain-rules');
      if (data && 'data' in data && Array.isArray(data.data)) {
        return data.data.sort((a, b) => a.domain.localeCompare(b.domain));
      }
      return [];
    }
  });

  const addMutation = useMutation({
    mutationFn: async (rule: { domain: string; rule_type: DomainRuleType; note: string }) => {
      // Usar el método post del apiClient
      await apiClient.post('/email-domain-rules', {
        domain: rule.domain.toLowerCase().trim(),
        rule_type: rule.rule_type,
        note: rule.note || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-domain-rules"] });
      toast.success("Dominio agregado");
      setIsDialogOpen(false);
      setNewDomain("");
      setNewNote("");
    },
    onError: (error: Error) => {
      toast.error(error.message.includes("unique") ? "Este dominio ya existe" : "Error al agregar");
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      // Usar el método put del apiClient
      await apiClient.put(`/email-domain-rules/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-domain-rules"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Usar el método delete del apiClient
      await apiClient.delete(`/email-domain-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-domain-rules"] });
      toast.success("Dominio eliminado");
    }
  });

  const whitelistRules = rules?.filter(r => r.rule_type === "whitelist") || [];
  const blacklistRules = rules?.filter(r => r.rule_type === "blacklist") || [];

  const RulesList = ({ items, type }: { items: DomainRule[]; type: DomainRuleType }) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No hay dominios en la {type === "whitelist" ? "lista blanca" : "lista negra"}
        </p>
      ) : (
        items.map(rule => (
          <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{rule.domain}</span>
                {!rule.is_active && (
                  <Badge variant="outline" className="text-xs">Inactivo</Badge>
                )}
              </div>
              {rule.note && (
                <p className="text-xs text-muted-foreground mt-1 ml-6">{rule.note}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={rule.is_active}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, is_active: checked })}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar dominio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminará la regla para el dominio <strong>{rule.domain}</strong>.
                      {rule.rule_type === "whitelist"
                        ? " Los usuarios con este dominio ya no calificarán para la tarifa universitaria."
                        : " Este dominio ya no estará en la lista negra."}
                      Esta acción se puede revertir agregando nuevamente el dominio.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        deleteMutation.mutate(rule.id);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Reglas de Dominios de Correo
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Dominio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Regla de Dominio</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate({ domain: newDomain, rule_type: newRuleType, note: newNote });
            }} className="space-y-4">
              <div>
                <Label htmlFor="domain">Dominio</Label>
                <Input
                  id="domain"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="ejemplo.edu.pe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="ruleType">Tipo de Regla</Label>
                <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as DomainRuleType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whitelist">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        Lista Blanca (Universitario)
                      </div>
                    </SelectItem>
                    <SelectItem value="blacklist">
                      <div className="flex items-center gap-2">
                        <ShieldOff className="h-4 w-4 text-red-600" />
                        Lista Negra (Excluido)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="note">Nota (opcional)</Label>
                <Textarea
                  id="note"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Razón o descripción..."
                  rows={2}
                />
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Guardando..." : "Agregar Dominio"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="whitelist">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="whitelist" className="gap-2">
              <Shield className="h-4 w-4" />
              Lista Blanca ({whitelistRules.length})
            </TabsTrigger>
            <TabsTrigger value="blacklist" className="gap-2">
              <ShieldOff className="h-4 w-4" />
              Lista Negra ({blacklistRules.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="whitelist" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Dominios que califican como universitarios peruanos (tarifa S/ 25)
            </p>
            <RulesList items={whitelistRules} type="whitelist" />
          </TabsContent>
          <TabsContent value="blacklist" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Dominios excluidos de la tarifa universitaria aunque terminen en .edu.pe
            </p>
            <RulesList items={blacklistRules} type="blacklist" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
