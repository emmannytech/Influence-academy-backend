export const NotificationEvents = {
  CREATOR_STATUS_CHANGED: 'creator.status.changed',
  CAMPAIGN_STATUS_CHANGED: 'campaign.status.changed',
  CAMPAIGN_SUBMITTED: 'campaign.submitted',
} as const;

export interface CreatorStatusChangedPayload {
  creatorId: string;
  userId: string;
  email: string;
  creatorName: string;
  newStatus: string;
  reason?: string;
}

export interface CampaignStatusChangedPayload {
  campaignId: string;
  campaignTitle: string;
  clientUserId: string;
  clientEmail: string;
  fromStatus: string;
  toStatus: string;
  note?: string;
}

export interface CampaignSubmittedPayload {
  campaignId: string;
  campaignTitle: string;
  clientName: string;
}
