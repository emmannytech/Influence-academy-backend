import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../database/prisma.service';

const mockPrisma = {
  client: { findFirst: jest.fn() },
  creator: { findFirst: jest.fn() },
  campaign: { findUnique: jest.fn(), update: jest.fn() },
  invitation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  shortlistCreator: { findMany: jest.fn() },
  campaignStatusLog: { create: jest.fn() },
  $transaction: jest.fn(),
};

const mockEventEmitter = { emit: jest.fn() };

describe('InvitationsService', () => {
  let service: InvitationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    jest.clearAllMocks();
  });

  describe('sendInvitations', () => {
    const supabaseId = 'supa-client-1';
    const clientId = 'client-1';
    const campaignId = 'camp-1';

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: clientId });
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.sendInvitations(campaignId, supabaseId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when client does not own campaign', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: clientId });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: campaignId,
        clientId: 'other-client',
        status: 'active',
        title: 'Test Campaign',
        client: {
          user: { id: 'user-1', email: 'c@test.com' },
          companyName: 'Acme',
        },
      });

      await expect(
        service.sendInvitations(campaignId, supabaseId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when campaign status is not allowed (e.g. draft)', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: clientId });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: campaignId,
        clientId,
        status: 'draft',
        title: 'Test Campaign',
        client: {
          user: { id: 'user-1', email: 'c@test.com' },
          companyName: 'Acme',
        },
      });

      await expect(
        service.sendInvitations(campaignId, supabaseId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when shortlist is empty', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: clientId });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: campaignId,
        clientId,
        status: 'active',
        title: 'Test Campaign',
        client: {
          user: { id: 'user-1', email: 'c@test.com' },
          companyName: 'Acme',
        },
      });
      mockPrisma.shortlistCreator.findMany.mockResolvedValue([]);

      await expect(
        service.sendInvitations(campaignId, supabaseId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should send invitations successfully and return counts', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: clientId });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: campaignId,
        clientId,
        status: 'active',
        title: 'Test Campaign',
        client: {
          user: { id: 'user-1', email: 'c@test.com' },
          companyName: 'Acme',
        },
      });
      mockPrisma.shortlistCreator.findMany.mockResolvedValue([
        {
          creatorId: 'creator-1',
          creator: {
            id: 'creator-1',
            fullName: 'Alice',
            user: { id: 'u-1', email: 'alice@test.com' },
          },
        },
        {
          creatorId: 'creator-2',
          creator: {
            id: 'creator-2',
            fullName: 'Bob',
            user: { id: 'u-2', email: 'bob@test.com' },
          },
        },
      ]);
      mockPrisma.invitation.findMany.mockResolvedValue([]);
      mockPrisma.invitation.createMany.mockResolvedValue({ count: 2 });

      const result = await service.sendInvitations(campaignId, supabaseId);

      expect(result).toEqual({ invited: 2, alreadyInvited: 0 });
      expect(mockPrisma.invitation.createMany).toHaveBeenCalledWith({
        data: [
          { campaignId, creatorId: 'creator-1' },
          { campaignId, creatorId: 'creator-2' },
        ],
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'invitation.sent',
        expect.objectContaining({ creatorName: 'Alice' }),
      );
    });

    it('should throw BadRequestException when all shortlisted creators are already invited', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: clientId });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: campaignId,
        clientId,
        status: 'active',
        title: 'Test Campaign',
        client: {
          user: { id: 'user-1', email: 'c@test.com' },
          companyName: 'Acme',
        },
      });
      mockPrisma.shortlistCreator.findMany.mockResolvedValue([
        {
          creatorId: 'creator-1',
          creator: {
            id: 'creator-1',
            fullName: 'Alice',
            user: { id: 'u-1', email: 'alice@test.com' },
          },
        },
      ]);
      mockPrisma.invitation.findMany.mockResolvedValue([
        { creatorId: 'creator-1' },
      ]);

      await expect(
        service.sendInvitations(campaignId, supabaseId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('respondToInvitation', () => {
    const supabaseId = 'supa-creator-1';
    const creatorId = 'creator-1';
    const invitationId = 'inv-1';

    const baseInvitation = {
      id: invitationId,
      creatorId,
      campaignId: 'camp-1',
      status: 'pending',
      campaign: {
        id: 'camp-1',
        title: 'Test Campaign',
        status: 'active',
        client: { user: { id: 'client-user-1' }, companyName: 'Acme' },
      },
    };

    it('should throw NotFoundException when invitation not found', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue({ id: creatorId });
      mockPrisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.respondToInvitation(invitationId, 'accept', supabaseId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when invitation does not belong to creator', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue({ id: creatorId });
      mockPrisma.invitation.findUnique.mockResolvedValue({
        ...baseInvitation,
        creatorId: 'other-creator',
      });

      await expect(
        service.respondToInvitation(invitationId, 'accept', supabaseId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully accept an invitation', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue({ id: creatorId });
      mockPrisma.invitation.findUnique.mockResolvedValue(baseInvitation);

      const updatedInvitation = { ...baseInvitation, status: 'accepted' };
      mockPrisma.invitation.update.mockResolvedValue(updatedInvitation);

      const result = await service.respondToInvitation(
        invitationId,
        'accept',
        supabaseId,
      );

      expect(result.status).toBe('accepted');
      expect(mockPrisma.invitation.update).toHaveBeenCalledWith({
        where: { id: invitationId },
        data: { status: 'accepted', respondedAt: expect.any(Date) },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'invitation.responded',
        expect.objectContaining({
          action: 'accept',
          creatorId,
          campaignId: 'camp-1',
        }),
      );
    });

    it('should throw BadRequestException when invitation already responded', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue({ id: creatorId });
      mockPrisma.invitation.findUnique.mockResolvedValue({
        ...baseInvitation,
        status: 'accepted',
      });

      await expect(
        service.respondToInvitation(invitationId, 'accept', supabaseId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully decline an invitation', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue({ id: creatorId });
      mockPrisma.invitation.findUnique.mockResolvedValue(baseInvitation);

      const updatedInvitation = { ...baseInvitation, status: 'declined' };
      mockPrisma.invitation.update.mockResolvedValue(updatedInvitation);

      const result = await service.respondToInvitation(
        invitationId,
        'decline',
        supabaseId,
      );

      expect(result.status).toBe('declined');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'invitation.responded',
        expect.objectContaining({ action: 'decline' }),
      );
    });
  });
});
