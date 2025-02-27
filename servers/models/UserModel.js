import { database } from "../config/Mongodb.js";
import { hashPassword, comparePassword } from "../helpers/bcrypt.js";
import { signToken } from "../helpers/jwt.js";

class UserModel {
  static collection() {
    return database.collection("users");
  }

  static async findAll() {
    return await this.collection().find().toArray();
  }

  static async Register(
    name,
    username,
    email,
    password,
    gender,
    role,
    profilePicture = null,
    birthDate = null,
    groupId = null
  ) {
    if (!gender) {
      throw new Error("Gender is required");
    }

    if (!["Parent", "Child"].includes(role)) {
      throw new Error("Role must be either 'Parent' or 'Child'");
    }

    const existingUser = await this.collection().findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new Error("Email or username already exists");
    }

    const newUser = {
      name,
      username,
      email,
      password: hashPassword(password),
      gender,
      role,
      profilePicture,
      birthDate,
      groupId,
      createdAt: new Date(),
    };

    const result = await this.collection().insertOne(newUser);
    newUser._id = result.insertedId;

    return newUser;
  }

  static async Login(email, password) {
    const user = await this.collection().findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || "Child",
    };

    return { access_token: signToken(payload), user };
  }
}

export default UserModel;
