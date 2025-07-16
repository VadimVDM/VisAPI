import axios from 'axios';

describe('Backend API E2E Tests', () => {
  describe('GET /api', () => {
    it('should return a message', async () => {
      const res = await axios.get(`/api`);

      expect(res.status).toBe(200);
      expect(res.data).toEqual({ message: 'Hello API' });
    });
  });

  describe('GET /api/v1/healthz', () => {
    it('should return health status', async () => {
      const res = await axios.get(`/api/v1/healthz`);

      expect(res.status).toBe(200);
      expect(res.data).toMatchObject({
        status: 'ok',
        service: 'visapi-backend',
      });
      expect(res.data.timestamp).toBeDefined();
      expect(res.data.uptime).toBeDefined();
    });
  });

  describe('GET /api/v1/livez', () => {
    it('should return liveness status', async () => {
      const res = await axios.get(`/api/v1/livez`);

      expect(res.status).toBe(200);
      expect(res.data).toEqual({ status: 'alive' });
    });
  });

  describe('GET /api/v1/version', () => {
    it('should return version info', async () => {
      const res = await axios.get(`/api/v1/version`);

      expect(res.status).toBe(200);
      expect(res.data).toMatchObject({
        version: '0.1.0',
        commit: expect.any(String),
        build: expect.any(String),
      });
    });
  });
});
