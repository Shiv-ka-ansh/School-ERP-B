process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_which_is_long_enough';

const request = require('supertest');
const app = require('../server');

describe('Backend platform routes', () => {
  test('GET /health returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
  });

  test('GET /ready returns status ready', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ready');
  });

  test('Unknown route returns 404 envelope', async () => {
    const res = await request(app).get('/api/v1/unknown');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
