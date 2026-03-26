import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TherapistSelector } from '@/components/admin/TherapistSelector';

export function AdminBookingShortcut() {
    const navigate = useNavigate();
    const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    return (
        <Card className="border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/30">
            <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setExpanded(!expanded)}
            >
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <CalendarPlus className="h-5 w-5 text-green-600" />
                    <span>Agendar Sesión</span>
                    {expanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                    )}
                </CardTitle>
                <CardDescription className="text-sm">
                    Agendar y pagar una sesión a nombre de un paciente
                </CardDescription>
            </CardHeader>

            {expanded && (
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Selecciona un psicólogo
                        </label>
                        <TherapistSelector
                            value={selectedTherapistId}
                            onChange={setSelectedTherapistId}
                        />
                    </div>

                    <Button
                        className="w-full gap-2"
                        disabled={!selectedTherapistId}
                        onClick={() => {
                            if (selectedTherapistId) {
                                navigate(`/reservar/${selectedTherapistId}`);
                            }
                        }}
                    >
                        <CalendarPlus className="h-4 w-4" />
                        Ir a Agendar Sesión
                    </Button>

                    {!selectedTherapistId && (
                        <p className="text-xs text-muted-foreground text-center">
                            Selecciona un psicólogo para continuar al formulario de reserva
                        </p>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
