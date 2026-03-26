// Helper to safely get and trim env vars
const getEnv = (key: string, defaultValue: string = '') => {
    return (import.meta.env[key] || defaultValue).trim();
};

export const paymentConfig = {
    // Parse methods from CSV
    methods: (getEnv('VITE_PAYMENT_METHODS', 'mp_direct,mp_card').split(',').map((m: string) => m.trim()) as string[]),

    // Getters for individual methods (for backward compatibility and cleaner code)
    get enableQr() { return this.methods.includes('qr'); },
    get enableMpCard() { return this.methods.includes('mp_card'); }, // MercadoPago Card (Brick)
    get enableMpModal() { return this.methods.includes('mp_modal'); }, // MercadoPago Checkout Pro (Modal) house
    get enableCulqi() { return this.methods.includes('culqi'); },
    get enableIzipay() { return this.methods.includes('izipay'); },
    get enableMpDirect() { return this.methods.includes('mp_direct'); }, // MercadoPago Link/Redirect

    // Default method logic
    get defaultMethod() {
        if (this.enableMpModal) return 'mp_modal';
        if (this.enableCulqi && !this.enableQr && !this.enableMpCard) return 'culqi';
        if (this.enableMpCard && !this.enableQr) return 'mp_card';
        if (this.enableIzipay) return 'izipay';
        return 'qr'; // Fallback
    },
};
