import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './database/prisma.service';

const mockPrisma = {
  $queryRaw: jest.fn(),
};

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
    jest.clearAllMocks();
  });

  describe('health', () => {
    it('should return ok when database is reachable', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      const result = await appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.services.database).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded when database is unreachable', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));
      const result = await appController.getHealth();
      expect(result.status).toBe('degraded');
      expect(result.services.database).toBe('error');
    });
  });
});
