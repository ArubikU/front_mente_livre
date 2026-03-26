/**
 * Cliente API auto-generado desde OpenAPI spec
 * Regenerar con: npm run generate-api
 */

import { API_BASE_URL } from './types';
import type * as Types from './types';

export class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    setToken(token: string | null) {
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Métodos HTTP genéricos
    async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    async post<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    // Endpoints específicos
    async getappointments(): Promise<Types.getAppointments_Response> {
        return this.get<Types.getAppointments_Response>(`/appointments`);
    }

    async createappointment(data: Types.AppointmentCreate): Promise<Types.createAppointment_Response> {
        return this.post<Types.createAppointment_Response>(`/appointments`, data);
    }

    async getappointment(id: string): Promise<Types.getAppointment_Response> {
        return this.get<Types.getAppointment_Response>(`/appointments/${id}`);
    }

    async updateappointment(id: string, data: Types.AppointmentUpdate): Promise<Types.updateAppointment_Response> {
        return this.put<Types.updateAppointment_Response>(`/appointments/${id}`, data);
    }

    async deleteappointment(id: string): Promise<Types.deleteAppointment_Response> {
        return this.delete<Types.deleteAppointment_Response>(`/appointments/${id}`);
    }

    async login(data: Types.login_Request): Promise<Types.login_Response> {
        return this.post<Types.login_Response>(`/auth/login`, data);
    }

    async refreshtoken(data: Types.refreshToken_Request): Promise<Types.refreshToken_Response> {
        return this.post<Types.refreshToken_Response>(`/auth/refresh`, data);
    }

    async register(data: Types.register_Request): Promise<Types.register_Response> {
        return this.post<Types.register_Response>(`/auth/register`, data);
    }

    async logout(): Promise<Types.logout_Response> {
        return this.post<Types.logout_Response>(`/auth/logout`, undefined);
    }

    async forgotpassword(data: Types.forgotPassword_Request): Promise<Types.forgotPassword_Response> {
        return this.post<Types.forgotPassword_Response>(`/auth/forgot-password`, data);
    }

    async resetpassword(data: Types.resetPassword_Request): Promise<Types.resetPassword_Response> {
        return this.post<Types.resetPassword_Response>(`/auth/reset-password`, data);
    }

    async getemaildomainrules(): Promise<Types.getEmailDomainRules_Response> {
        return this.get<Types.getEmailDomainRules_Response>(`/email-domain-rules`);
    }

    async createemaildomainrule(): Promise<Types.createEmailDomainRule_Response> {
        return this.post<Types.createEmailDomainRule_Response>(`/email-domain-rules`, undefined);
    }

    async getemaildomainrule(id: string): Promise<Types.getEmailDomainRule_Response> {
        return this.get<Types.getEmailDomainRule_Response>(`/email-domain-rules/${id}`);
    }

    async updateemaildomainrule(id: string): Promise<Types.updateEmailDomainRule_Response> {
        return this.put<Types.updateEmailDomainRule_Response>(`/email-domain-rules/${id}`, undefined);
    }

    async deleteemaildomainrule(id: string): Promise<Types.deleteEmailDomainRule_Response> {
        return this.delete<Types.deleteEmailDomainRule_Response>(`/email-domain-rules/${id}`);
    }

    async uploadtherapistphoto(): Promise<Types.uploadTherapistPhoto_Response> {
        return this.post<Types.uploadTherapistPhoto_Response>(`/upload/therapist-photo`, undefined);
    }

    async uploadteamphoto(): Promise<Types.uploadTeamPhoto_Response> {
        return this.post<Types.uploadTeamPhoto_Response>(`/upload/team-photo`, undefined);
    }

    async f89985e31d6e345ca06bb3c64c91cadd(data: Types.f89985e31d6e345ca06bb3c64c91cadd_Request): Promise<Types.f89985e31d6e345ca06bb3c64c91cadd_Response> {
        return this.post<Types.f89985e31d6e345ca06bb3c64c91cadd_Response>(`/auth/google`, data);
    }

    async getpromocodes(): Promise<Types.getPromoCodes_Response> {
        return this.get<Types.getPromoCodes_Response>(`/promo-codes`);
    }

    async createpromocode(data: Types.PromoCodeCreate): Promise<Types.createPromoCode_Response> {
        return this.post<Types.createPromoCode_Response>(`/promo-codes`, data);
    }

    async getpromocode(id: string): Promise<Types.getPromoCode_Response> {
        return this.get<Types.getPromoCode_Response>(`/promo-codes/${id}`);
    }

    async updatepromocode(id: string, data: Types.PromoCodeUpdate): Promise<Types.updatePromoCode_Response> {
        return this.put<Types.updatePromoCode_Response>(`/promo-codes/${id}`, data);
    }

    async deletepromocode(id: string): Promise<Types.deletePromoCode_Response> {
        return this.delete<Types.deletePromoCode_Response>(`/promo-codes/${id}`);
    }

    async validatepromocode(data: Types.validatePromoCode_Request): Promise<Types.validatePromoCode_Response> {
        return this.post<Types.validatePromoCode_Response>(`/promo-codes/validate`, data);
    }

    async getsitecontent(): Promise<Types.getSiteContent_Response> {
        return this.get<Types.getSiteContent_Response>(`/site-content`);
    }

    async updatesitecontent(data: Types.SiteContentUpdate): Promise<Types.updateSiteContent_Response> {
        return this.put<Types.updateSiteContent_Response>(`/site-content`, data);
    }

    async getteamprofiles(): Promise<Types.getTeamProfiles_Response> {
        return this.get<Types.getTeamProfiles_Response>(`/team-profiles`);
    }

    async createteamprofile(data: Types.TeamProfileCreate): Promise<Types.createTeamProfile_Response> {
        return this.post<Types.createTeamProfile_Response>(`/team-profiles`, data);
    }

    async getteamprofile(id: string): Promise<Types.getTeamProfile_Response> {
        return this.get<Types.getTeamProfile_Response>(`/team-profiles/${id}`);
    }

    async updateteamprofile(id: string, data: Types.TeamProfileUpdate): Promise<Types.updateTeamProfile_Response> {
        return this.put<Types.updateTeamProfile_Response>(`/team-profiles/${id}`, data);
    }

    async deleteteamprofile(id: string): Promise<Types.deleteTeamProfile_Response> {
        return this.delete<Types.deleteTeamProfile_Response>(`/team-profiles/${id}`);
    }

    async gettherapists(): Promise<Types.getTherapists_Response> {
        return this.get<Types.getTherapists_Response>(`/therapists`);
    }

    async createtherapist(data: Types.TherapistCreate): Promise<Types.createTherapist_Response> {
        return this.post<Types.createTherapist_Response>(`/therapists`, data);
    }

    async gettherapist(id: string): Promise<Types.getTherapist_Response> {
        return this.get<Types.getTherapist_Response>(`/therapists/${id}`);
    }

    async updatetherapist(id: string, data: Types.TherapistUpdate): Promise<Types.updateTherapist_Response> {
        return this.put<Types.updateTherapist_Response>(`/therapists/${id}`, data);
    }

    async gettherapistphotos(therapistId: string): Promise<Types.getTherapistPhotos_Response> {
        return this.get<Types.getTherapistPhotos_Response>(`/therapists/${therapistId}/photos`);
    }

    async createtherapistphoto(therapistId: string): Promise<Types.createTherapistPhoto_Response> {
        return this.post<Types.createTherapistPhoto_Response>(`/therapists/${therapistId}/photos`, undefined);
    }

    async gettherapistphoto(id: string): Promise<Types.getTherapistPhoto_Response> {
        return this.get<Types.getTherapistPhoto_Response>(`/therapist-photos/${id}`);
    }

    async updatetherapistphoto(id: string): Promise<Types.updateTherapistPhoto_Response> {
        return this.put<Types.updateTherapistPhoto_Response>(`/therapist-photos/${id}`, undefined);
    }

    async deletetherapistphoto(id: string): Promise<Types.deleteTherapistPhoto_Response> {
        return this.delete<Types.deleteTherapistPhoto_Response>(`/therapist-photos/${id}`);
    }

    async gettherapistpricing(therapistId: string): Promise<Types.getTherapistPricing_Response> {
        return this.get<Types.getTherapistPricing_Response>(`/therapists/${therapistId}/pricing`);
    }

    async createtherapistpricing(therapistId: string): Promise<Types.createTherapistPricing_Response> {
        return this.post<Types.createTherapistPricing_Response>(`/therapists/${therapistId}/pricing`, undefined);
    }

    async gettherapistpricingbyid(id: string): Promise<Types.getTherapistPricingById_Response> {
        return this.get<Types.getTherapistPricingById_Response>(`/therapist-pricing/${id}`);
    }

    async updatetherapistpricing(id: string): Promise<Types.updateTherapistPricing_Response> {
        return this.put<Types.updateTherapistPricing_Response>(`/therapist-pricing/${id}`, undefined);
    }

    async deletetherapistpricing(id: string): Promise<Types.deleteTherapistPricing_Response> {
        return this.delete<Types.deleteTherapistPricing_Response>(`/therapist-pricing/${id}`);
    }

    async updatetherapistpricingbatch(therapistId: string): Promise<Types.updateTherapistPricingBatch_Response> {
        return this.put<Types.updateTherapistPricingBatch_Response>(`/therapists/${therapistId}/pricing/batch`, undefined);
    }

    async getusers(): Promise<Types.getUsers_Response> {
        return this.get<Types.getUsers_Response>(`/users`);
    }

    async getuser(id: string): Promise<Types.getUser_Response> {
        return this.get<Types.getUser_Response>(`/users/${id}`);
    }

    async updateuser(id: string, data: Types.UserUpdate): Promise<Types.updateUser_Response> {
        return this.put<Types.updateUser_Response>(`/users/${id}`, data);
    }

    async getuserroles(userId: string): Promise<Types.getUserRoles_Response> {
        return this.get<Types.getUserRoles_Response>(`/users/${userId}/roles`);
    }

    async assignuserrole(userId: string, data: Types.assignUserRole_Request): Promise<Types.assignUserRole_Response> {
        return this.post<Types.assignUserRole_Response>(`/users/${userId}/roles`, data);
    }

    async removeuserrole(userId: string, roleName: string): Promise<Types.removeUserRole_Response> {
        return this.delete<Types.removeUserRole_Response>(`/users/${userId}/roles/${roleName}`);
    }

    async gettherapistschedules(therapistId: string): Promise<Types.getTherapistSchedules_Response> {
        return this.get<Types.getTherapistSchedules_Response>(`/therapists/${therapistId}/schedules`);
    }

    async createschedule(therapistId: string, data: Types.WeeklyScheduleCreate): Promise<Types.createSchedule_Response> {
        return this.post<Types.createSchedule_Response>(`/therapists/${therapistId}/schedules`, data);
    }

    async updateschedule(id: string, data: Types.WeeklyScheduleUpdate): Promise<Types.updateSchedule_Response> {
        return this.put<Types.updateSchedule_Response>(`/schedules/${id}`, data);
    }

    async deleteschedule(id: string): Promise<Types.deleteSchedule_Response> {
        return this.delete<Types.deleteSchedule_Response>(`/schedules/${id}`);
    }

    async getscheduleoverrides(therapistId: string): Promise<Types.getScheduleOverrides_Response> {
        return this.get<Types.getScheduleOverrides_Response>(`/therapists/${therapistId}/schedule-overrides`);
    }

    async createscheduleoverride(therapistId: string): Promise<Types.createScheduleOverride_Response> {
        return this.post<Types.createScheduleOverride_Response>(`/therapists/${therapistId}/schedule-overrides`, undefined);
    }

    async createscheduleoverridesbatch(therapistId: string): Promise<Types.createScheduleOverridesBatch_Response> {
        return this.post<Types.createScheduleOverridesBatch_Response>(`/therapists/${therapistId}/schedule-overrides/batch`, undefined);
    }

    async updatescheduleoverride(id: string): Promise<Types.updateScheduleOverride_Response> {
        return this.put<Types.updateScheduleOverride_Response>(`/schedule-overrides/${id}`, undefined);
    }

    async deletescheduleoverride(id: string): Promise<Types.deleteScheduleOverride_Response> {
        return this.delete<Types.deleteScheduleOverride_Response>(`/schedule-overrides/${id}`);
    }

    async deletescheduleoverridesbyweek(therapistId: string): Promise<Types.deleteScheduleOverridesByWeek_Response> {
        return this.delete<Types.deleteScheduleOverridesByWeek_Response>(`/therapists/${therapistId}/schedule-overrides/week`);
    }

}

// Instancia singleton
export const apiClient = new ApiClient();
