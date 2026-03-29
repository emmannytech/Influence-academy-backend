import { CampaignStatus } from '@prisma/client';

export const ALLOWED_CAMPAIGN_TRANSITIONS: Record<
  CampaignStatus,
  CampaignStatus[]
> = {
  [CampaignStatus.draft]: [CampaignStatus.submitted],
  [CampaignStatus.submitted]: [
    CampaignStatus.draft,
    CampaignStatus.active,
    CampaignStatus.rejected,
  ],
  [CampaignStatus.active]: [CampaignStatus.completed, CampaignStatus.rejected],
  [CampaignStatus.completed]: [],
  [CampaignStatus.rejected]: [CampaignStatus.draft, CampaignStatus.submitted],
};

export function isValidCampaignTransition(
  from: CampaignStatus,
  to: CampaignStatus,
): boolean {
  return ALLOWED_CAMPAIGN_TRANSITIONS[from].includes(to);
}
