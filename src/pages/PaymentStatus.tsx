import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useEffect, useState } from 'react';

export default function PaymentStatus() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useTranslation(['payment', 'common']);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        const mpStatus = searchParams.get('status') || searchParams.get('collection_status');
        setStatus(mpStatus);
    }, [searchParams]);

    const renderContent = () => {
        switch (status) {
            case 'approved':
            case 'success':
                return (
                    <div className="text-center space-y-4">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                        <h2 className="text-2xl font-bold">{t('payment:page.successTitle')}</h2>
                        <p className="text-muted-foreground">{t('payment:page.successDesc')}</p>
                    </div>
                );
            case 'pending':
            case 'in_process':
                return (
                    <div className="text-center space-y-4">
                        <Clock className="h-16 w-16 text-amber-500 mx-auto" />
                        <h2 className="text-2xl font-bold">{t('payment:page.statusReview')}</h2>
                        <p className="text-muted-foreground">Tu pago está siendo procesado. Te avisaremos cuando se confirme.</p>
                    </div>
                );
            case 'rejected':
            case 'failure':
                return (
                    <div className="text-center space-y-4">
                        <XCircle className="h-16 w-16 text-destructive mx-auto" />
                        <h2 className="text-2xl font-bold">Error en el pago</h2>
                        <p className="text-muted-foreground">Tu pago fue rechazado o cancelado. Por favor, intenta nuevamente.</p>
                    </div>
                );
            default:
                return (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                );
        }
    };

    return (
        <PublicLayout>
            <div className="container py-20 flex justify-center">
                <Card className="max-w-md w-full shadow-lg">
                    <CardContent className="pt-10 pb-10">
                        {renderContent()}
                        <div className="mt-8 flex flex-col gap-2">
                            <Button onClick={() => navigate('/mi-cuenta')} className="w-full">
                                {t('payment:page.goToAppointments')}
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/terapeutas')} className="w-full">
                                {t('payment:page.backToTherapists')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PublicLayout>
    );
}
