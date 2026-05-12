import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../api/baseQuery';
import type {
  ApiResponse,
  AppConfigRes,
  OrgConfigRes,
  OrgConfigUpdateReq,
  SmtpConfigRes,
  SmtpConfigUpdateReq,
  SmsConfigRes,
  SmsConfigUpdateReq,
  LdapConfigRes,
  LdapConfigUpdateReq,
  OtherConfigRes,
  OtherConfigUpdateReq,
  DbBackupConfigRes,
  DbBackupConfigUpdateReq,
  PublicOrgConfigRes,
} from '../../types/api';

export const configApi = createApi({
  reducerPath: 'configApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Config'],
  endpoints: (b) => ({

    // Full config (admin overview)
    getAppConfig: b.query<AppConfigRes, void>({
      query: () => '/config',
      transformResponse: (r: ApiResponse<AppConfigRes>) => r.data,
      providesTags: ['Config'],
    }),

    // Organization
    getOrganization: b.query<OrgConfigRes, void>({
      query: () => '/config/organization',
      transformResponse: (r: ApiResponse<OrgConfigRes>) => r.data,
      providesTags: ['Config'],
    }),
    updateOrganization: b.mutation<OrgConfigRes, OrgConfigUpdateReq>({
      query: (body) => {
        const form = new FormData();
        form.append('orgName', body.orgName);
        if (body.orgLogo) form.append('orgLogo', body.orgLogo);
        return { url: '/config/organization', method: 'PATCH', body: form };
      },
      transformResponse: (r: ApiResponse<OrgConfigRes>) => r.data,
      invalidatesTags: ['Config'],
    }),

    // SMTP
    getSmtp: b.query<SmtpConfigRes, void>({
      query: () => '/config/smtp',
      transformResponse: (r: ApiResponse<SmtpConfigRes>) => r.data,
      providesTags: ['Config'],
    }),
    updateSmtp: b.mutation<SmtpConfigRes, SmtpConfigUpdateReq>({
      query: (body) => ({ url: '/config/smtp', method: 'PATCH', body }),
      transformResponse: (r: ApiResponse<SmtpConfigRes>) => r.data,
      invalidatesTags: ['Config'],
    }),
    testEmail: b.mutation<void, string>({
      query: (toEmail) => ({ url: '/config/smtp/test-email', method: 'POST', body: { toEmail } }),
    }),

    // SMS
    getSms: b.query<SmsConfigRes, void>({
      query: () => '/config/sms',
      transformResponse: (r: ApiResponse<SmsConfigRes>) => r.data,
      providesTags: ['Config'],
    }),
    updateSms: b.mutation<SmsConfigRes, SmsConfigUpdateReq>({
      query: (body) => ({ url: '/config/sms', method: 'PATCH', body }),
      transformResponse: (r: ApiResponse<SmsConfigRes>) => r.data,
      invalidatesTags: ['Config'],
    }),

    // LDAP
    getLdap: b.query<LdapConfigRes, void>({
      query: () => '/config/ldap',
      transformResponse: (r: ApiResponse<LdapConfigRes>) => r.data,
      providesTags: ['Config'],
    }),
    updateLdap: b.mutation<LdapConfigRes, LdapConfigUpdateReq>({
      query: (body) => ({ url: '/config/ldap', method: 'PATCH', body }),
      transformResponse: (r: ApiResponse<LdapConfigRes>) => r.data,
      invalidatesTags: ['Config'],
    }),

    // Other / Features
    getOther: b.query<OtherConfigRes, void>({
      query: () => '/config/other',
      transformResponse: (r: ApiResponse<OtherConfigRes>) => r.data,
      providesTags: ['Config'],
    }),
    updateOther: b.mutation<OtherConfigRes, OtherConfigUpdateReq>({
      query: (body) => ({ url: '/config/other', method: 'PATCH', body }),
      transformResponse: (r: ApiResponse<OtherConfigRes>) => r.data,
      invalidatesTags: ['Config'],
    }),

    // DB Backup
    getDbBackup: b.query<DbBackupConfigRes, void>({
      query: () => '/config/db',
      transformResponse: (r: ApiResponse<DbBackupConfigRes>) => r.data,
      providesTags: ['Config'],
    }),
    updateDbBackup: b.mutation<DbBackupConfigRes, DbBackupConfigUpdateReq>({
      query: (body) => ({ url: '/config/db', method: 'PATCH', body }),
      transformResponse: (r: ApiResponse<DbBackupConfigRes>) => r.data,
      invalidatesTags: ['Config'],
    }),

    // Public (no auth)
    getPublicOrg: b.query<PublicOrgConfigRes, void>({
      query: () => '/public/config/org',
      transformResponse: (r: ApiResponse<PublicOrgConfigRes>) => r.data,
    }),
  }),
});

export const {
  useGetAppConfigQuery,
  useGetOrganizationQuery,
  useUpdateOrganizationMutation,
  useGetSmtpQuery,
  useUpdateSmtpMutation,
  useTestEmailMutation,
  useGetSmsQuery,
  useUpdateSmsMutation,
  useGetLdapQuery,
  useUpdateLdapMutation,
  useGetOtherQuery,
  useUpdateOtherMutation,
  useGetDbBackupQuery,
  useUpdateDbBackupMutation,
  useGetPublicOrgQuery,
} = configApi;
