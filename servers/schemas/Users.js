import { GraphQLUpload } from "graphql-upload-minimal";
import UserModel from "../models/UserModel.js";

const typeDefs = `#graphql
type User {
    _id: ID!
    name: String!
    username: String!
    email: String!
    password: String!
    gender: String!
    profilePicture: String
    birthDate: String
    groupId: ID
}

type LoginResponse {
    access_token: String
    user: User
}

type ProfilePictureResponse {
  message: String!
  profilePicture: String!
}

type Query {
    getUsers: [User]
    getUserById(id: ID!): User
}

scalar Upload
type Mutation {
    Register(
      name: String!,
      username: String!, 
      email: String!, 
      password: String!,
      gender: String!, 
      profilePicture: String,
      birthDate: String,
      groupId: ID
    ): User

    Login(email: String!, password: String!): LoginResponse

    updateProfile(
    name: String,
    username: String,
    email: String,
    birthDate: String
  ): User

  updateProfilePicture(profilePicture: Upload!): ProfilePictureResponse!
  
}
`;

const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    getUsers: async () => {
      return await UserModel.findAll();
    },
    getUserById: async (_, { id }) => {
      return await UserModel.collection().findOne({ _id: id });
    },
  },

  Mutation: {
    Register: async (
      _,
      {
        name,
        username,
        email,
        password,
        gender,
        profilePicture,
        birthDate,
        groupId,
      }
    ) => {
      return await UserModel.Register(
        name,
        username,
        email,
        password,
        gender,
        profilePicture,
        birthDate,
        groupId
      );
    },
    Login: async (_, { email, password }) => {
      return await UserModel.Login(email, password);
    },
    updateProfile: async (_, updates, { authentication }) => {
      const user = await authentication();
      if (!user) {
        throw new Error("Unauthorized");
      }

      return await UserModel.updateProfile(user, updates);
    },
    updateProfilePicture: async (_, { profilePicture }, { authentication }) => {
      const user = await authentication();
      if (!user) {
        throw new Error("Unauthorized");
      }

      return await UserModel.updateProfilePicture(user, profilePicture);
    },
  },
};

export { typeDefs as userTypeDefs, resolvers as userResolvers };
