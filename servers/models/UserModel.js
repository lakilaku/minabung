import { ObjectId } from "mongodb";
import { database } from "../config/Mongodb.js";
import { hashPassword, comparePassword } from "../helpers/bcrypt.js";
import { signToken } from "../helpers/jwt.js";
import cloudinary from "../config/Cloudinary.js";

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
    profilePicture = null,
    birthDate = null,
    groupId = null
  ) {
    if (!gender) {
      throw new Error("Gender is required");
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
    };

    return { access_token: signToken(payload), user };
  }
  static async updateProfile(user, updates) {
    const id = ObjectId.createFromHexString(user.id);
    const findUser = await this.collection().findOne({ _id: id });

    if (!findUser) {
      throw new Error("User not found");
    }
    let profilePictureUrl = findUser.profilePicture;

    console.log("🔄 Received Updates:", updates);
    if (updates.profilePicture) {
      console.log("📤 Uploading image to Cloudinary...");

      const { createReadStream, filename } = await updates.profilePicture;
      const stream = createReadStream();

      try {
        const cloudinaryUpload = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "profile_pictures" },
            (error, result) => {
              if (error) {
                console.error("❌ Cloudinary Upload Failed:", error);
                reject(error);
              } else {
                console.log("✅ Cloudinary Upload Success:", result.secure_url);
                resolve(result.secure_url);
              }
            }
          );
          stream.pipe(uploadStream);
        });

        profilePictureUrl = cloudinaryUpload;
      } catch (error) {
        console.error("❌ Error Uploading to Cloudinary:", error);
        throw new Error("Failed to upload image to Cloudinary");
      }
    }
    console.log("🖼️ Updated Profile Picture URL:", profilePictureUrl);

    const updateData = {
      name: updates.name || findUser.name,
      username: updates.username || findUser.username,
      email: updates.email || findUser.email,
      profilePicture: profilePictureUrl,
      birthDate: updates.birthDate || findUser.birthDate,
    };
    const result = await this.collection().findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { returnDocument: "after" }
    );

    const updatedUser = await this.collection().findOne({ _id: id });

    return updatedUser;
  }

  static async updateUserGroup(userId, groupId) {
    const id = ObjectId.createFromHexString(userId);

    const result = await this.collection().updateOne(
      { _id: id },
      { $set: { groupId: groupId } }
    );

    if (result.modifiedCount < 1) {
      throw new Error("Failed to update user with new groupId");
    }

    console.log(`✅ User ${userId} now belongs to Group ${groupId}`);
  }
}

export default UserModel;
