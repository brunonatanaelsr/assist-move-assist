import type { Request, Response } from 'express';
import { ValidationController } from '../controllers/ValidationController';

type SearchService = {
  searchBeneficiarias: jest.Mock;
};

const redisMock = {
  get: jest.fn(),
  setex: jest.fn(),
};

jest.mock('../lib/redis', () => ({
  __esModule: true,
  redis: redisMock,
  default: redisMock,
}));

describe('ValidationController - searchBeneficiarias', () => {
  let controller: ValidationController;
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = {
      searchBeneficiarias: jest.fn(),
    };
    controller = new ValidationController(service as any);
  });

  it('should fetch from service and store the result in cache when not cached', async () => {
    const req = { query: { query: 'Ana' } } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;
    const results = [{ id: 1, nome_completo: 'Ana Maria' }];

    redisMock.get.mockResolvedValueOnce(null);
    service.searchBeneficiarias.mockResolvedValueOnce(results);

    await controller.searchBeneficiarias(req, res);

    expect(service.searchBeneficiarias).toHaveBeenCalledWith('Ana');
    expect(redisMock.setex).toHaveBeenCalledWith('search:Ana', 60, JSON.stringify(results));
    expect(json).toHaveBeenCalledWith(results);
  });

  it('should return cached results without querying the service', async () => {
    const req = { query: { query: 'Ana' } } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;
    const cached = [{ id: 2, nome_completo: 'Ana Clara' }];

    redisMock.get.mockResolvedValueOnce(JSON.stringify(cached));

    await controller.searchBeneficiarias(req, res);

    expect(service.searchBeneficiarias).not.toHaveBeenCalled();
    expect(redisMock.setex).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(cached);
  });
});
