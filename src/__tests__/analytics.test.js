const request = require("supertest");
const app = require("../../src/index.js"); // Adjust if app export is different
const db = require("../../models");
const Tenant = db.Tenant;

describe("Analytics API", () => {
  let token;
  let tenantId;
  beforeAll(async () => {
    // Create a tenant for the test user
    const tenant = await Tenant.create({
      name: "Test Tenant"
    });
    tenantId = tenant.id;

    // Register the admin user (ignore error if already exists)
    await request(app)
      .post("/api/auth/register")
      .send({
        username: "Admin",
        email: "admin@tenant.com",
        password: "adminpass",
        role: "Admin",
        tenantId
      });

    // Login as admin to get JWT
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@tenant.com", password: "adminpass" });
    token = res.body.token;
  });

  it("should return analytics overview for valid tenant", async () => {
    const res = await request(app)
      .get("/api/analytics/overview")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("sales");
    expect(res.body).toHaveProperty("bookings");
    expect(res.body).toHaveProperty("empPerf");
  });

  it("should require authentication", async () => {
    const res = await request(app).get("/api/analytics/overview");
    expect(res.statusCode).toBe(401);
  });
});
