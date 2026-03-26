import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function TermsAndConditions() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      <div className="container py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            TÉRMINOS Y CONDICIONES DE USO Y CONSENTIMIENTO INFORMADO
          </h1>
          
          <p className="text-muted-foreground mb-8 text-lg">
            Bienvenido a MenteLivre. Al utilizar nuestros servicios, usted acepta los siguientes términos y condiciones que rigen la relación entre el usuario (estudiante) y nuestra plataforma de acompañamiento psicológico.
          </p>

          <div className="space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">1</span>
                NATURALEZA DEL SERVICIO
              </h2>
              <p className="text-muted-foreground leading-relaxed pl-10">
                MenteLivre es una plataforma de salud mental que conecta a estudiantes universitarios con psicólogos, egresados y practicantes pre-profesionales de psicología. El servicio brindado es de consejería y acompañamiento, y no reemplaza el tratamiento psiquiátrico de emergencia o intervenciones en crisis severas.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">2</span>
                CLÁUSULA DE SUPERVISIÓN CLÍNICA Y MEJORA CONTINUA
              </h2>
              <div className="pl-10 space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Para garantizar la excelencia académica y la seguridad del paciente, el usuario acepta y otorga su consentimiento para lo siguiente:
                </p>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-primary font-medium">•</span>
                    <div>
                      <span className="font-medium text-foreground">Supervisión en vivo:</span>
                      <span className="text-muted-foreground"> Las sesiones podrán contar con la presencia silenciosa de un Supervisor Clínico (Esmeralda Sánchez Soca) para evaluar el desempeño del especialista y asegurar la calidad del servicio.</span>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-medium">•</span>
                    <div>
                      <span className="font-medium text-foreground">Grabación de sesiones:</span>
                      <span className="text-muted-foreground"> Las videollamadas podrán ser grabadas con fines estrictamente de control de calidad, supervisión docente y mejora continua.</span>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-medium">•</span>
                    <div>
                      <span className="font-medium text-foreground">Confidencialidad:</span>
                      <span className="text-muted-foreground"> Todo material grabado o supervisado es confidencial. El acceso está restringido exclusivamente al equipo de supervisión clínica de la plataforma y está protegido por el secreto profesional.</span>
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">3</span>
                PROTECCIÓN DE DATOS PERSONALES (LEY N° 29733)
              </h2>
              <div className="pl-10 space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  De conformidad con la Ley de Protección de Datos Personales de Perú, los datos del usuario y el contenido de las sesiones son tratados con estrictas medidas de seguridad.
                </p>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-primary font-medium">•</span>
                    <span className="text-muted-foreground">Los registros audiovisuales se almacenarán de forma encriptada.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-medium">•</span>
                    <span className="text-muted-foreground">
                      El usuario tiene derecho a solicitar la eliminación de sus datos o grabaciones una vez finalizado el proceso de evaluación clínica, enviando un correo a{' '}
                      <a href="mailto:mentelivre.pe@gmail.com" className="text-primary hover:underline font-medium">
                        mentelivre.pe@gmail.com
                      </a>.
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">4</span>
                SOBRE LOS ESPECIALISTAS
              </h2>
              <p className="text-muted-foreground leading-relaxed pl-10">
                Nuestra red está compuesta por profesionales titulados, egresados y practicantes de último año. Todos los miembros no titulados operan bajo la supervisión directa de psicólogos colegiados y habilitados, cumpliendo con los estándares éticos del Colegio de Psicólogos del Perú.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">5</span>
                CONSENTIMIENTO DEL USUARIO
              </h2>
              <div className="pl-10 bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-foreground leading-relaxed">
                  Al marcar la casilla de aceptación y proceder con la reserva, el Usuario declara haber leído, comprendido y aceptado voluntariamente todos los puntos anteriores, otorgando su consentimiento libre y expreso para la supervisión y/o grabación de sus sesiones en los términos aquí descritos.
                </p>
              </div>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-border">
            <Button onClick={() => navigate(-1)} size="lg" className="w-full sm:w-auto">
              Volver a la reserva
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
