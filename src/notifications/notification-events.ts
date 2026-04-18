export const NotificationEvents = {
  CREATOR_STATUS_CHANGED: 'creator.status.changed',
  CAMPAIGN_STATUS_CHANGED: 'campaign.status.changed',
  CAMPAIGN_SUBMITTED: 'campaign.submitted',
  POST_SUBMITTED: 'campaign.post.submitted',
  POST_REVIEWED: 'campaign.post.reviewed',
  METRIC_OVERRIDE_SUBMITTED: 'campaign.metric_override.submitted',
  METRIC_OVERRIDE_REVIEWED: 'campaign.metric_override.reviewed',
  CAMPAIGN_DELIVERABLES_COMPLETE: 'campaign.deliverables.complete',
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

export interface PostSubmittedPayload {
  campaignId: string;
  campaignTitle: string;
  submissionId: string;
  creatorId: string;
}

export interface PostReviewedPayload {
  campaignId: string;
  campaignTitle: string;
  submissionId: string;
  creatorId: string;
  status: 'approved' | 'rejected';
  note: string | null;
}

export interface MetricOverrideSubmittedPayload {
  campaignId: string;
  overrideId: string;
  creatorId: string;
}

export interface MetricOverrideReviewedPayload {
  campaignId: string;
  overrideId: string;
  creatorId: string;
  status: 'approved' | 'rejected';
}

export interface CampaignDeliverablesCompletePayload {
  campaignId: string;
  campaignTitle: string;
  clientUserId: string;
}
