import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-[hsl(var(--disabled))] disabled:text-[hsl(var(--disabled-foreground))] disabled:opacity-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Primary - Azul vibrante profesional
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-[hsl(217_91%_55%)] hover:shadow-lg hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
        // Outline - Borde con hover elegante (estilo Monterrico)
        outline:
          "border-2 border-primary bg-white text-primary hover:bg-primary hover:text-white",
        secondary:
          "bg-secondary text-secondary-foreground shadow-md hover:bg-[hsl(224_76%_35%)] hover:shadow-lg hover:-translate-y-0.5",
        // Ghost - Transparente con hover que cambia a primary (para "Entrar", etc.)
        ghost:
          "text-foreground hover:bg-primary/10 hover:text-primary",
        link:
          "text-primary underline-offset-4 hover:underline hover:text-secondary",
        // CTA Principal - Gradiente azul con efecto hover
        cta:
          "gradient-cta text-white shadow-lg hover:shadow-xl hover:brightness-110 hover:-translate-y-0.5",
        soft:
          "bg-primary/15 text-primary hover:bg-primary/25",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-full px-4 text-xs",
        lg: "h-12 rounded-full px-8 text-base",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
