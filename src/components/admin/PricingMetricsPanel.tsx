import { useQuery } from "@tanstack/react-query";
import { apiClient } from '@/integrations/api/client';
import type { Appointment as BackendAppointment } from '@/api/types';
import type { AppointmentWithDetails } from '@/integrations/api/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Users, Building2, Globe, DollarSign, Calendar, TrendingUp } from "lucide-react";

type PricingTier = 'university_pe' | 'university_international' | 'corporate' | 'public';
type AccountType = 'university_pe' | 'university_international' | 'corporate' | 'public';

interface MetricsData {
  usersByAccountType: Record<AccountType, number>;
  appointmentsByTier: Record<PricingTier, number>;
  revenueByTier: Record<PricingTier, number>;
  totalRevenue: number;
  totalAppointments: number;
  averagePrice: number;
}

export function PricingMetricsPanel() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["pricing-metrics"],
    queryFn: async (): Promise<MetricsData> => {
      // Fetch users by account type.
      // El backend ya expone GET /users y retorna `email_classification` (desde email_classifications).
      const usersByAccountType: Record<AccountType, number> = {
        university_pe: 0,
        university_international: 0,
        corporate: 0,
        public: 0,
      };

      try {
        const usersJson = await apiClient.get<{ data: Array<{ email_classification?: AccountType }> }>('/users');
        const users = (usersJson && 'data' in usersJson && Array.isArray(usersJson.data)) ? usersJson.data : [];

        for (const u of users) {
          const accountType = u.email_classification || 'public';
          if (accountType in usersByAccountType) {
            usersByAccountType[accountType]++;
          } else {
            usersByAccountType.public++;
          }
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }

      // Fetch appointments by tier with revenue
      // Hacer múltiples consultas para cada status o usar un formato que el backend pueda procesar
      const statuses = ['confirmed', 'completed', 'payment_review'];
      let allAppointments: BackendAppointment[] = [];

      for (const status of statuses) {
        try {
          const data = await apiClient.get<{ data: BackendAppointment[] }>(`/appointments?status=${status}`);
          if (data && 'data' in data && Array.isArray(data.data)) {
            allAppointments = [...allAppointments, ...data.data];
          }
        } catch (error) {
          console.error(`Error fetching appointments for status ${status}:`, error);
        }
      }

      const appointments = allAppointments;

      const appointmentsByTier: Record<PricingTier, number> = {
        university_pe: 0,
        university_international: 0,
        corporate: 0,
        public: 0
      };

      const revenueByTier: Record<PricingTier, number> = {
        university_pe: 0,
        university_international: 0,
        corporate: 0,
        public: 0
      };

      let totalRevenue = 0;

      (appointments || []).forEach(a => {
        const tier = (a.pricing_tier as PricingTier) || 'public';
        const apt = a as AppointmentWithDetails;
        // Usar final_price si existe y es mayor a 0, sino original_price, sino 0 (no contar citas sin pago)
        const finalPrice = apt.final_price;
        const originalPrice = apt.original_price;
        const price = (finalPrice && Number(finalPrice) > 0)
          ? Number(finalPrice)
          : (originalPrice && Number(originalPrice) > 0)
            ? Number(originalPrice)
            : 0;

        // Solo contar citas con precio mayor a 0
        if (price > 0) {
          appointmentsByTier[tier]++;
          revenueByTier[tier] += price;
          totalRevenue += price;
        }
      });

      const totalAppointments = appointments?.length || 0;
      const averagePrice = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

      return {
        usersByAccountType,
        appointmentsByTier,
        revenueByTier,
        totalRevenue,
        totalAppointments,
        averagePrice
      };
    }
  });

  const StatCard = ({
    icon: Icon,
    label,
    value,
    subtext,
    color = "text-primary"
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtext?: string;
    color?: string;
  }) => (
    <div className="flex items-start gap-3 p-4 border rounded-lg bg-card">
      <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Métricas de Precios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            icon={DollarSign}
            label="Ingresos Totales"
            value={`S/ ${metrics.totalRevenue.toFixed(2)}`}
            color="text-green-600"
          />
          <StatCard
            icon={Calendar}
            label="Total Citas"
            value={metrics.totalAppointments}
            color="text-blue-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Precio Promedio"
            value={`S/ ${metrics.averagePrice.toFixed(2)}`}
            color="text-purple-600"
          />
        </div>

        {/* Users by account type */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios por Tipo de Cuenta
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={GraduationCap}
              label="Universitarios PE"
              value={metrics.usersByAccountType.university_pe}
              color="text-green-600"
            />
            <StatCard
              icon={Globe}
              label="Universitarios Int."
              value={metrics.usersByAccountType.university_international}
              color="text-blue-600"
            />
            <StatCard
              icon={Building2}
              label="Corporativos"
              value={metrics.usersByAccountType.corporate}
              color="text-purple-600"
            />
            <StatCard
              icon={Users}
              label="Público General"
              value={metrics.usersByAccountType.public}
              color="text-gray-600"
            />
          </div>
        </div>

        {/* Appointments and revenue by tier */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Citas e Ingresos por Tier
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Tier</th>
                  <th className="text-right py-2 px-3">Citas</th>
                  <th className="text-right py-2 px-3">Ingresos</th>
                  <th className="text-right py-2 px-3">% Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {(['university_pe', 'university_international', 'corporate', 'public'] as PricingTier[]).map(tier => {
                  const appointments = metrics.appointmentsByTier[tier];
                  const revenue = metrics.revenueByTier[tier];
                  const percentage = metrics.totalRevenue > 0
                    ? ((revenue / metrics.totalRevenue) * 100).toFixed(1)
                    : '0';

                  const tierLabels: Record<PricingTier, string> = {
                    university_pe: 'Universitario PE',
                    university_international: 'Universitario Int.',
                    corporate: 'Corporativo',
                    public: 'Público General'
                  };

                  return (
                    <tr key={tier} className="border-b">
                      <td className="py-2 px-3">{tierLabels[tier]}</td>
                      <td className="text-right py-2 px-3">{appointments}</td>
                      <td className="text-right py-2 px-3">S/ {revenue.toFixed(2)}</td>
                      <td className="text-right py-2 px-3">{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
