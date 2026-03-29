import { isValidCampaignTransition } from './campaign-transitions';
import { CampaignStatus } from '@prisma/client';

describe('isValidCampaignTransition', () => {
  it('should allow draft → submitted', () => {
    expect(
      isValidCampaignTransition(CampaignStatus.draft, CampaignStatus.submitted),
    ).toBe(true);
  });

  it('should allow submitted → active', () => {
    expect(
      isValidCampaignTransition(
        CampaignStatus.submitted,
        CampaignStatus.active,
      ),
    ).toBe(true);
  });

  it('should allow submitted → rejected', () => {
    expect(
      isValidCampaignTransition(
        CampaignStatus.submitted,
        CampaignStatus.rejected,
      ),
    ).toBe(true);
  });

  it('should allow submitted → draft', () => {
    expect(
      isValidCampaignTransition(
        CampaignStatus.submitted,
        CampaignStatus.draft,
      ),
    ).toBe(true);
  });

  it('should allow rejected → draft', () => {
    expect(
      isValidCampaignTransition(CampaignStatus.rejected, CampaignStatus.draft),
    ).toBe(true);
  });

  it('should allow active → completed', () => {
    expect(
      isValidCampaignTransition(
        CampaignStatus.active,
        CampaignStatus.completed,
      ),
    ).toBe(true);
  });

  it('should allow active → rejected', () => {
    expect(
      isValidCampaignTransition(
        CampaignStatus.active,
        CampaignStatus.rejected,
      ),
    ).toBe(true);
  });

  it('should disallow draft → active', () => {
    expect(
      isValidCampaignTransition(CampaignStatus.draft, CampaignStatus.active),
    ).toBe(false);
  });

  it('should disallow completed → anything', () => {
    expect(
      isValidCampaignTransition(CampaignStatus.completed, CampaignStatus.draft),
    ).toBe(false);
  });

  it('should disallow same status transition', () => {
    expect(
      isValidCampaignTransition(CampaignStatus.draft, CampaignStatus.draft),
    ).toBe(false);
  });
});
