import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "./adminApi";

describe("adminApi createUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an account with the supplied default password and role", async () => {
    const createdUser = {
      id: "user-1",
      name: "Abebe Kebede",
      displayName: "Abebe Kebede",
      email: "abebe@example.gov",
      username: null,
      role: "MANAGEMENT",
      authRole: "MANAGEMENT",
      status: "ACTIVE",
      isActive: true,
      createdAt: "2026-10-31T00:00:00.000Z",
      updatedAt: "2026-10-31T00:00:00.000Z",
      lastLoginAt: null,
    };
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: "User created", data: createdUser }),
          { status: 201 },
        ),
      );

    await expect(
      createUser({
        name: "Abebe Kebede",
        email: "abebe@example.gov",
        password: "Welcome123",
        role: "MANAGEMENT",
      }),
    ).resolves.toMatchObject({ data: createdUser });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/users"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Abebe Kebede",
          email: "abebe@example.gov",
          password: "Welcome123",
          role: "MANAGEMENT",
        }),
      }),
    );
  });
});
