import { jest } from "@jest/globals";

await jest.unstable_mockModule("../config/Cloudinary.js", () => ({
  default: {
    uploader: {
      upload_stream: (options, callback) => {
        const fakeResult = {
          secure_url:
            "https://res.cloudinary.com/test/image/upload/v1234567890/fake.jpg",
        };
        callback(null, fakeResult);

        return { pipe: () => {} };
      },
    },
  },
}));

import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";
import { hashPassword } from "../helpers/bcrypt.js";
import { signToken, verifyToken } from "../helpers/jwt.js";
import { Readable } from "stream";

const { default: UserModel } = await import("../models/UserModel.js");

let mongoServer;
let connection;
let db;
let testUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  connection = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  db = connection.db();
  UserModel.collection = () => db.collection("users");
  const testUserId = new ObjectId();
  await UserModel.collection().insertOne({
    _id: testUserId,
    name: "Test User",
    username: "testuser",
    email: "test@example.com",
    password: hashPassword("password123"),
    gender: "Male",
    profilePicture: null,
    birthDate: "1990-01-01",
    groupId: null,
    createdAt: new Date(),
  });
  testUser = {
    id: testUserId.toString(),
    name: "Test User",
    email: "test@example.com",
  };
});

afterAll(async () => {
  await connection.close();
  await mongoServer.stop();
});

describe("UserModel Tests", () => {
  test("findAll should return all users", async () => {
    const allUsers = await UserModel.findAll();
    expect(Array.isArray(allUsers)).toBeTruthy();
    expect(allUsers.length).toBeGreaterThanOrEqual(1);
  });
  test("Should register a new user", async () => {
    const newUser = await UserModel.Register(
      "Alice",
      "alice123",
      "alice@example.com",
      "alicepass",
      "Female",
      null,
      "1990-01-01"
    );

    expect(newUser).toHaveProperty("_id");
    expect(newUser.name).toBe("Alice");
    expect(newUser.email).toBe("alice@example.com");
    expect(newUser.password).not.toBe("alicepass");
  });

  test("Should throw error for duplicate email or username", async () => {
    await expect(
      UserModel.Register(
        "Test User",
        "testuser",
        "newemail@example.com",
        "newpass",
        "Male"
      )
    ).rejects.toThrow("Email or username already exists");
  });

  test("Should login an existing user", async () => {
    const loginResult = await UserModel.Login(
      "test@example.com",
      "password123"
    );
    expect(loginResult).toHaveProperty("access_token");
    expect(loginResult).toHaveProperty("user");
    expect(loginResult.user.email).toBe("test@example.com");
  });

  test("Should throw error for invalid password", async () => {
    await expect(
      UserModel.Login("test@example.com", "wrongpass")
    ).rejects.toThrow("Invalid password");
  });

  test("Should throw error when registering without gender", async () => {
    await expect(
      UserModel.Register("Bob", "bob123", "bob@example.com", "bobpass", null)
    ).rejects.toThrow("Gender is required");
  });

  test("Should throw error if login user not found", async () => {
    await expect(
      UserModel.Login("nonexistent@example.com", "pass")
    ).rejects.toThrow("User not found");
  });

  test("updateProfilePicture should throw 'User not found' if user does not exist", async () => {
    const nonExistentUser = {
      id: new ObjectId().toString(),
      name: "Nonexistent User",
    };
    const fakeFile = {
      createReadStream: () => {
        const stream = new Readable();
        stream.push("fake image data");
        stream.push(null);
        return stream;
      },
    };

    await expect(
      UserModel.updateProfilePicture(nonExistentUser, fakeFile)
    ).rejects.toThrow("User not found");
  });

  test("Should update user profile details", async () => {
    const updatedUser = await UserModel.updateProfile(testUser, {
      name: "Updated User",
      username: "updateduser",
      email: "updated@example.com",
      birthDate: "1995-05-05",
    });
    expect(updatedUser.name).toBe("Updated User");
    expect(updatedUser.username).toBe("updateduser");
    expect(updatedUser.email).toBe("updated@example.com");
    expect(updatedUser.birthDate).toBe("1995-05-05");
  });
  test("updateProfile should throw 'User not found' if user does not exist", async () => {
    const nonExistentUser = {
      id: new ObjectId().toString(),
      name: "Nonexistent User",
    };
    await expect(
      UserModel.updateProfile(nonExistentUser, { name: "New Name" })
    ).rejects.toThrow("User not found");
  });
  test("Should update profile picture", async () => {
    const fakeFile = {
      createReadStream: () => {
        const stream = new Readable();
        stream.push("fake image data");
        stream.push(null);
        return stream;
      },
    };

    const result = await UserModel.updateProfilePicture(testUser, fakeFile);
    expect(result).toHaveProperty(
      "message",
      "Profile picture updated successfully!"
    );
    expect(result.profilePicture).toContain(
      "https://res.cloudinary.com/test/image/upload"
    );
  });

  test("Should update user group", async () => {
    const fakeGroupId = new ObjectId().toString();
    await UserModel.updateUserGroup(testUser.id, fakeGroupId);
    const user = await UserModel.collection().findOne({
      _id: ObjectId.createFromHexString(testUser.id),
    });
    expect(user.groupId.toString()).toBe(fakeGroupId);
  });
});

describe("JWT Helper", () => {
  const payload = { id: "123", name: "Test" };

  test("should sign and verify token", () => {
    const token = signToken(payload);
    expect(token).toBeDefined();
    const verified = verifyToken(token);
    expect(verified).toMatchObject(payload);
  });

  test("should throw error for invalid token", () => {
    expect(() => verifyToken("invalid.token.here")).toThrow();
  });
});
