import request from "supertest";
import app from "../../app";
import { User } from "../../models/User";
import { clearDatabase } from "../../../tests/setup";
import userData from "../../../tests/fixtures/users.json";

describe("Auth Controller", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user with valid data", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData.validUser)
        .expect(201);

      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe(userData.validUser.email);
      expect(response.body.user.name).toBe(userData.validUser.name);
      expect(response.body.user).not.toHaveProperty("password");
    });

    it("should not register user with invalid email", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData.invalidEmailUser)
        .expect(400);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("email");
    });

    it("should not register user without password", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData.userWithoutPassword)
        .expect(400);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("password");
    });

    it("should not register user with existing email", async () => {
      // Crear usuario primero
      await User.create(userData.validUser);

      // Intentar crear otro usuario con el mismo email
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData.validUser)
        .expect(409);

      expect(response.body.message).toContain("ya existe");
    });

    it("should hash password before saving", async () => {
      await request(app)
        .post("/api/auth/register")
        .send(userData.validUser)
        .expect(201);

      const savedUser = await User.findOne({ email: userData.validUser.email });
      expect(savedUser?.password).not.toBe(userData.validUser.password);
      expect(savedUser?.password).toHaveLength(60); // bcrypt hash length
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Crear usuario para las pruebas de login
      await User.create(userData.validUser);
    });

    it("should login with valid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send(userData.loginCredentials.valid)
        .expect(200);

      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe(
        userData.loginCredentials.valid.email
      );
      expect(response.body.user).not.toHaveProperty("password");
    });

    it("should not login with invalid email", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send(userData.loginCredentials.invalidEmail)
        .expect(401);

      expect(response.body.message).toBe("Credenciales inválidas");
    });

    it("should not login with invalid password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send(userData.loginCredentials.invalidPassword)
        .expect(401);

      expect(response.body.message).toBe("Credenciales inválidas");
    });

    it("should not login with missing fields", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send(userData.loginCredentials.missingFields)
        .expect(400);

      expect(response.body).toHaveProperty("message");
    });

    it("should not login inactive user", async () => {
      // Crear usuario inactivo
      await User.create(userData.inactiveUser);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.inactiveUser.email,
          password: userData.inactiveUser.password,
        })
        .expect(401);

      expect(response.body.message).toContain("inactivo");
    });

    it("should return valid JWT token", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send(userData.loginCredentials.valid)
        .expect(200);

      const token = response.body.token;
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      // Verificar que el token tiene el formato JWT (3 partes separadas por puntos)
      const tokenParts = token.split(".");
      expect(tokenParts).toHaveLength(3);
    });
  });

  describe("POST /api/auth/logout", () => {
    let authToken: string;

    beforeEach(async () => {
      // Crear usuario y obtener token
      await User.create(userData.validUser);
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send(userData.loginCredentials.valid);

      authToken = loginResponse.body.token;
    });

    it("should logout successfully with valid token", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe("Logout exitoso");
    });

    it("should not logout without token", async () => {
      const response = await request(app).post("/api/auth/logout").expect(401);

      expect(response.body.message).toContain("token");
    });

    it("should not logout with invalid token", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.message).toContain("token");
    });
  });

  describe("GET /api/auth/me", () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Crear usuario y obtener token
      const user = await User.create(userData.validUser);
      userId = user._id.toString();

      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send(userData.loginCredentials.valid);

      authToken = loginResponse.body.token;
    });

    it("should return user profile with valid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe(userData.validUser.email);
      expect(response.body.name).toBe(userData.validUser.name);
      expect(response.body).not.toHaveProperty("password");
    });

    it("should not return profile without token", async () => {
      const response = await request(app).get("/api/auth/me").expect(401);

      expect(response.body.message).toContain("token");
    });

    it("should not return profile with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.message).toContain("token");
    });
  });
});
