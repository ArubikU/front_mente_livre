// Auto-generated from OpenAPI spec
// DO NOT EDIT MANUALLY - Run 'npm run generate-api' to regenerate

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

// Schemas
export interface Appointment {
    id?: string;
    therapist_id?: string;
    therapist_name?: string;
    patient_email?: string;
    patient_name?: string;
    patient_phone?: string;
    consultation_reason?: string;
    appointment_date?: string;
    start_time?: string;
    end_time?: string;
    status?: "pending" | "confirmed" | "completed" | "cancelled" | "pending_payment" | "payment_review";
    pricing_tier?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

export interface AppointmentCreate {
    therapist_id: string;
    patient_email: string;
    patient_name: string;
    patient_phone?: string;
    consultation_reason?: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status?: "pending" | "confirmed";
    pricing_tier?: string;
    notes?: string;
    original_price?: number;
    discount_applied?: number;
    final_price?: number;
}

export interface AppointmentUpdate {
    status?: "pending" | "confirmed" | "completed" | "cancelled" | "pending_payment" | "payment_review";
    appointment_date?: string;
    start_time?: string;
    end_time?: string;
    consultation_reason?: string;
    notes?: string;
    patient_name?: string;
    patient_phone?: string;
}

export interface PromoCode {
    id?: string;
    code?: string;
    is_active?: boolean;
    discount_percent?: number;
    base_price?: number;
    max_uses_total?: number;
    max_uses_per_user?: number;
    max_sessions?: number;
    valid_from?: string;
    valid_until?: string;
    uses_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface PromoCodeCreate {
    code: string;
    is_active?: boolean;
    discount_percent: number;
    base_price?: number;
    max_uses_total?: number;
    max_uses_per_user?: number;
    max_sessions?: number;
    valid_from?: string;
    valid_until?: string;
}

export interface PromoCodeUpdate {
    code?: string;
    is_active?: boolean;
    discount_percent?: number;
    base_price?: number;
    max_uses_total?: number;
    max_uses_per_user?: number;
    max_sessions?: number;
    valid_from?: string;
    valid_until?: string;
}

export interface PromoCodeValidation {
    valid?: boolean;
    message?: string;
    promo_code_id?: string;
    code?: string;
    discount_percent?: number;
    base_price?: number;
    discount_amount?: number;
    final_price?: number;
    max_sessions?: number;
}

export interface SiteContent {
    id?: string;
    about_title?: string;
    about_intro?: string;
    mission?: string;
    vision?: string;
    approach?: string;
    purpose?: string;
    values?: string[];
    updated_by?: string;
    created_at?: string;
    updated_at?: string;
}

export interface SiteContentUpdate {
    about_title?: string;
    about_intro?: string;
    mission?: string;
    vision?: string;
    approach?: string;
    purpose?: string;
    values?: string[];
}

export interface TeamProfile {
    id?: string;
    member_type?: "clinical" | "institutional";
    linked_therapist_id?: string;
    linked_therapist_name?: string;
    full_name?: string;
    public_role_title?: string;
    professional_level?: string;
    public_bio?: string;
    friendly_photo_url?: string;
    is_visible_public?: boolean;
    order_index?: number;
    created_at?: string;
    updated_at?: string;
}

export interface TeamProfileCreate {
    member_type: "clinical" | "institutional";
    linked_therapist_id?: string;
    full_name: string;
    public_role_title: string;
    public_bio?: string;
    friendly_photo_url?: string;
    is_visible_public?: boolean;
    order_index?: number;
}

export interface TeamProfileUpdate {
    member_type?: "clinical" | "institutional";
    linked_therapist_id?: string;
    full_name?: string;
    public_role_title?: string;
    public_bio?: string;
    friendly_photo_url?: string;
    is_visible_public?: boolean;
    order_index?: number;
}

export interface Therapist {
    id?: string;
    user_id?: string;
    name?: string;
    university?: string;
    age?: number;
    years_experience?: number;
    role_title?: string;
    specialty?: string;
    therapeutic_approach?: string;
    short_description?: string;
    modality?: string;
    hourly_rate?: number;
    is_active?: boolean;
    is_visible_in_about?: boolean;
    field_visibility?: string;
    experience_topics?: string[];
    population_served?: string[];
    photos?: TherapistPhoto[];
    pricing?: Inline1;
    created_at?: string;
    updated_at?: string;
}

export interface TherapistCreate {
    user_id?: string;
    name: string;
    university: string;
    age?: number;
    years_experience?: number;
    role_title?: string;
    specialty?: string;
    therapeutic_approach?: string;
    short_description?: string;
    modality?: string;
    hourly_rate: number;
    is_active?: boolean;
    is_visible_in_about?: boolean;
    field_visibility?: Inline2;
    experience_topics?: string[];
    pricing?: Record<string, Inline3>;
}

export interface TherapistUpdate {
    user_id?: string;
    name?: string;
    university?: string;
    age?: number;
    years_experience?: number;
    role_title?: string;
    specialty?: string;
    therapeutic_approach?: string;
    short_description?: string;
    modality?: string;
    hourly_rate?: number;
    is_active?: boolean;
    is_visible_in_about?: boolean;
    field_visibility?: Inline2;
}

export interface TherapistPhoto {
    photo_type?: string;
    photo_url?: string;
    photo_position?: string;
    is_active?: boolean;
    created_at?: string;
}

export interface TherapistPricingTier {
    price?: number;
    enabled?: boolean;
}

export interface User {
    id?: string;
    email?: string;
    full_name?: string;
    email_classification?: string;
    verified_email?: boolean;
    first_name?: string;
    last_name?: string;
    phone?: string;
    date_of_birth?: string;
    university?: string;
    profile_photo_url?: string;
    about_me?: string;
    roles?: Inline4[];
    created_at?: string;
    updated_at?: string;
}

export interface UserUpdate {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    date_of_birth?: string;
    university?: string;
    profile_photo_url?: string;
    about_me?: string;
}

export interface WeeklySchedule {
    id?: string;
    therapist_id?: string;
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
    is_active?: boolean;
    updated_by_role?: string;
    created_at?: string;
    updated_at?: string;
}

export interface WeeklyScheduleCreate {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active?: boolean;
}

export interface WeeklyScheduleUpdate {
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
    is_active?: boolean;
}


// Inline Types
export interface Inline1 {
    [key: string]: never;
}

export interface Inline2 {
    [key: string]: never;
}

export interface Inline3 {
    price?: number;
    enabled?: boolean;
}

export interface Inline4 {
    id?: number;
    name?: string;
}

export interface Inline5 {
    username: string;
    password: string;
}

export interface Inline8 {
    [key: string]: never;
}

export interface Inline7 {
    token?: string;
    user?: Inline8;
}

export interface Inline6 {
    success?: boolean;
    data?: Inline7;
}

export interface Inline9 {
    refresh_token: string;
}

export interface Inline10 {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}

export interface Inline11 {
    email: string;
}

export interface Inline12 {
    success?: boolean;
    message?: string;
}

export interface Inline13 {
    token: string;
    new_password: string;
}

export interface Inline14 {
    idToken: string;
}

export interface Inline16 {
    token?: string;
    refresh_token?: string;
    user?: Inline8;
}

export interface Inline15 {
    success?: boolean;
    data?: Inline16;
}

export interface Inline17 {
    code: string;
    user_email: string;
    base_price?: number;
}

export interface Inline18 {
    role_name: string;
}


// API Endpoints
export const API_BASE_URL = "https://backend.mentelivre.org";

// Listar citas
// GET /appointments
export type getAppointments_Request = void;
export type getAppointments_Response = ApiResponse<Appointment[]>;

// Crear nueva cita
// POST /appointments
export type createAppointment_Request = AppointmentCreate;
export type createAppointment_Response = ApiResponse<unknown>;

// Obtener cita por ID
// GET /appointments/{id}
export type getAppointment_Request = void;
export type getAppointment_Response = ApiResponse<Appointment>;

// Actualizar cita
// PUT /appointments/{id}
export type updateAppointment_Request = AppointmentUpdate;
export type updateAppointment_Response = ApiResponse<unknown>;

// Eliminar cita
// DELETE /appointments/{id}
export type deleteAppointment_Request = void;
export type deleteAppointment_Response = ApiResponse<unknown>;

// Iniciar sesión
// POST /auth/login
export type login_Request = Inline5;
export type login_Response = ApiResponse<Inline6>;

// Refrescar token
// POST /auth/refresh
export type refreshToken_Request = Inline9;
export type refreshToken_Response = ApiResponse<unknown>;

// Registrar nuevo usuario
// POST /auth/register
export type register_Request = Inline10;
export type register_Response = ApiResponse<unknown>;

// Cerrar sesión
// POST /auth/logout
export type logout_Request = void;
export type logout_Response = ApiResponse<unknown>;

// Solicitar reset de contraseña
// POST /auth/forgot-password
export type forgotPassword_Request = Inline11;
export type forgotPassword_Response = ApiResponse<Inline12>;

// Resetear contraseña
// POST /auth/reset-password
export type resetPassword_Request = Inline13;
export type resetPassword_Response = ApiResponse<Inline12>;

// Obtener todas las reglas de dominios
// GET /email-domain-rules
export type getEmailDomainRules_Request = void;
export type getEmailDomainRules_Response = ApiResponse<unknown>;

// Crear regla de dominio
// POST /email-domain-rules
export type createEmailDomainRule_Request = void;
export type createEmailDomainRule_Response = ApiResponse<unknown>;

// Obtener regla por ID
// GET /email-domain-rules/{id}
export type getEmailDomainRule_Request = void;
export type getEmailDomainRule_Response = ApiResponse<unknown>;

// Actualizar regla de dominio
// PUT /email-domain-rules/{id}
export type updateEmailDomainRule_Request = void;
export type updateEmailDomainRule_Response = ApiResponse<unknown>;

// Eliminar regla de dominio
// DELETE /email-domain-rules/{id}
export type deleteEmailDomainRule_Request = void;
export type deleteEmailDomainRule_Response = ApiResponse<unknown>;

// Subir foto de terapeuta
// POST /upload/therapist-photo
export type uploadTherapistPhoto_Request = void;
export type uploadTherapistPhoto_Response = ApiResponse<unknown>;

// Subir foto de equipo
// POST /upload/team-photo
export type uploadTeamPhoto_Request = void;
export type uploadTeamPhoto_Response = ApiResponse<unknown>;

// Login con Google
// POST /auth/google
export type f89985e31d6e345ca06bb3c64c91cadd_Request = Inline14;
export type f89985e31d6e345ca06bb3c64c91cadd_Response = ApiResponse<Inline15>;

// Listar códigos promocionales
// GET /promo-codes
export type getPromoCodes_Request = void;
export type getPromoCodes_Response = ApiResponse<PromoCode[]>;

// Crear código promocional
// POST /promo-codes
export type createPromoCode_Request = PromoCodeCreate;
export type createPromoCode_Response = ApiResponse<unknown>;

// Obtener código por ID
// GET /promo-codes/{id}
export type getPromoCode_Request = void;
export type getPromoCode_Response = ApiResponse<PromoCode>;

// Actualizar código promocional
// PUT /promo-codes/{id}
export type updatePromoCode_Request = PromoCodeUpdate;
export type updatePromoCode_Response = ApiResponse<unknown>;

// Eliminar código promocional
// DELETE /promo-codes/{id}
export type deletePromoCode_Request = void;
export type deletePromoCode_Response = ApiResponse<unknown>;

// Validar código promocional
// POST /promo-codes/validate
export type validatePromoCode_Request = Inline17;
export type validatePromoCode_Response = ApiResponse<PromoCodeValidation>;

// Obtener contenido institucional
// GET /site-content
export type getSiteContent_Request = void;
export type getSiteContent_Response = ApiResponse<SiteContent>;

// Actualizar contenido institucional
// PUT /site-content
export type updateSiteContent_Request = SiteContentUpdate;
export type updateSiteContent_Response = ApiResponse<unknown>;

// Listar perfiles del equipo
// GET /team-profiles
export type getTeamProfiles_Request = void;
export type getTeamProfiles_Response = ApiResponse<TeamProfile[]>;

// Crear nuevo perfil
// POST /team-profiles
export type createTeamProfile_Request = TeamProfileCreate;
export type createTeamProfile_Response = ApiResponse<unknown>;

// Obtener perfil por ID
// GET /team-profiles/{id}
export type getTeamProfile_Request = void;
export type getTeamProfile_Response = ApiResponse<TeamProfile>;

// Actualizar perfil
// PUT /team-profiles/{id}
export type updateTeamProfile_Request = TeamProfileUpdate;
export type updateTeamProfile_Response = ApiResponse<unknown>;

// Eliminar perfil
// DELETE /team-profiles/{id}
export type deleteTeamProfile_Request = void;
export type deleteTeamProfile_Response = ApiResponse<unknown>;

// Listar terapeutas
// GET /therapists
export type getTherapists_Request = void;
export type getTherapists_Response = ApiResponse<Therapist[]>;

// Crear terapeuta
// POST /therapists
export type createTherapist_Request = TherapistCreate;
export type createTherapist_Response = ApiResponse<unknown>;

// Obtener terapeuta por ID
// GET /therapists/{id}
export type getTherapist_Request = void;
export type getTherapist_Response = ApiResponse<Therapist>;

// Actualizar terapeuta
// PUT /therapists/{id}
export type updateTherapist_Request = TherapistUpdate;
export type updateTherapist_Response = ApiResponse<unknown>;

// Obtener fotos de un terapeuta
// GET /therapists/{therapistId}/photos
export type getTherapistPhotos_Request = void;
export type getTherapistPhotos_Response = ApiResponse<unknown>;

// Crear foto para un terapeuta
// POST /therapists/{therapistId}/photos
export type createTherapistPhoto_Request = void;
export type createTherapistPhoto_Response = ApiResponse<unknown>;

// Obtener foto por ID
// GET /therapist-photos/{id}
export type getTherapistPhoto_Request = void;
export type getTherapistPhoto_Response = ApiResponse<unknown>;

// Actualizar foto
// PUT /therapist-photos/{id}
export type updateTherapistPhoto_Request = void;
export type updateTherapistPhoto_Response = ApiResponse<unknown>;

// Eliminar foto
// DELETE /therapist-photos/{id}
export type deleteTherapistPhoto_Request = void;
export type deleteTherapistPhoto_Response = ApiResponse<unknown>;

// Obtener precios de un terapeuta
// GET /therapists/{therapistId}/pricing
export type getTherapistPricing_Request = void;
export type getTherapistPricing_Response = ApiResponse<unknown>;

// Crear precio para un terapeuta
// POST /therapists/{therapistId}/pricing
export type createTherapistPricing_Request = void;
export type createTherapistPricing_Response = ApiResponse<unknown>;

// Obtener precio por ID
// GET /therapist-pricing/{id}
export type getTherapistPricingById_Request = void;
export type getTherapistPricingById_Response = ApiResponse<unknown>;

// Actualizar precio
// PUT /therapist-pricing/{id}
export type updateTherapistPricing_Request = void;
export type updateTherapistPricing_Response = ApiResponse<unknown>;

// Eliminar precio
// DELETE /therapist-pricing/{id}
export type deleteTherapistPricing_Request = void;
export type deleteTherapistPricing_Response = ApiResponse<unknown>;

// Actualizar múltiples precios de un terapeuta
// PUT /therapists/{therapistId}/pricing/batch
export type updateTherapistPricingBatch_Request = void;
export type updateTherapistPricingBatch_Response = ApiResponse<unknown>;

// Listar usuarios
// GET /users
export type getUsers_Request = void;
export type getUsers_Response = ApiResponse<User[]>;

// Obtener usuario por ID
// GET /users/{id}
export type getUser_Request = void;
export type getUser_Response = ApiResponse<User>;

// Actualizar usuario
// PUT /users/{id}
export type updateUser_Request = UserUpdate;
export type updateUser_Response = ApiResponse<unknown>;

// Obtener roles de un usuario
// GET /users/{userId}/roles
export type getUserRoles_Request = void;
export type getUserRoles_Response = ApiResponse<unknown>;

// Asignar rol a un usuario
// POST /users/{userId}/roles
export type assignUserRole_Request = Inline18;
export type assignUserRole_Response = ApiResponse<unknown>;

// Remover rol de un usuario
// DELETE /users/{userId}/roles/{roleName}
export type removeUserRole_Request = void;
export type removeUserRole_Response = ApiResponse<unknown>;

// Obtener horarios de un terapeuta
// GET /therapists/{therapistId}/schedules
export type getTherapistSchedules_Request = void;
export type getTherapistSchedules_Response = ApiResponse<WeeklySchedule[]>;

// Crear horario para un terapeuta
// POST /therapists/{therapistId}/schedules
export type createSchedule_Request = WeeklyScheduleCreate;
export type createSchedule_Response = ApiResponse<unknown>;

// Actualizar horario
// PUT /schedules/{id}
export type updateSchedule_Request = WeeklyScheduleUpdate;
export type updateSchedule_Response = ApiResponse<unknown>;

// Eliminar horario
// DELETE /schedules/{id}
export type deleteSchedule_Request = void;
export type deleteSchedule_Response = ApiResponse<unknown>;

// Obtener excepciones de horario de un terapeuta
// GET /therapists/{therapistId}/schedule-overrides
export type getScheduleOverrides_Request = void;
export type getScheduleOverrides_Response = ApiResponse<unknown>;

// Crear excepción de horario
// POST /therapists/{therapistId}/schedule-overrides
export type createScheduleOverride_Request = void;
export type createScheduleOverride_Response = ApiResponse<unknown>;

// Crear múltiples excepciones de horario
// POST /therapists/{therapistId}/schedule-overrides/batch
export type createScheduleOverridesBatch_Request = void;
export type createScheduleOverridesBatch_Response = ApiResponse<unknown>;

// Actualizar excepción de horario
// PUT /schedule-overrides/{id}
export type updateScheduleOverride_Request = void;
export type updateScheduleOverride_Response = ApiResponse<unknown>;

// Eliminar excepción de horario
// DELETE /schedule-overrides/{id}
export type deleteScheduleOverride_Request = void;
export type deleteScheduleOverride_Response = ApiResponse<unknown>;

// Eliminar todas las excepciones de una semana
// DELETE /therapists/{therapistId}/schedule-overrides/week
export type deleteScheduleOverridesByWeek_Request = void;
export type deleteScheduleOverridesByWeek_Response = ApiResponse<unknown>;

