import UserModel from "../models/UserModel.js";

const typeDefs = `#graphql
type User {
    _id: ID!
    name: String!
    username: String!
    email: String!
    password: String!
    gender: String!
    role: String!
    profilePicture: String
    birthDate: String
    groupId: ID
}

type LoginResponse {
    access_token: String
    user: User
}

type Query {
    getUsers: [User]
    getUserById(id: ID!): User
}

type Mutation {
    Register(
      name: String!,
      username: String!, 
      email: String!, 
      password: String!,
      gender: String!, 
      role: String!, 
      profilePicture: String,
      birthDate: String,
      groupId: ID
    ): User
    Login(email: String!, password: String!): LoginResponse
}
`;

const resolvers = {
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
        role,
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
        role,
        profilePicture,
        birthDate,
        groupId
      );
    },
    Login: async (_, { email, password }) => {
      return await UserModel.Login(email, password);
    },
  },
};

export { typeDefs as userTypeDefs, resolvers as userResolvers };
