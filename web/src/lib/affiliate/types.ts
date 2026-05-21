export type AffiliateType = 'client' | 'general';

export interface AffiliateProfile {
    id: string;
    name: string;
    email: string;
    type: AffiliateType;
    code: string;
    usageCount?: number;
    createdAt: string;
}
