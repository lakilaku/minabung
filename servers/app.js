import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { userResolvers, userTypeDefs } from "./schemas/Users.js";
import { verifyToken } from "./helpers/jwt.js";
import { groupResolvers, groupTypeDefs } from "./schemas/Groups.js";

const server = new ApolloServer({
  typeDefs: [userTypeDefs, groupTypeDefs],
  resolvers: [userResolvers, groupResolvers],
});

async function startServer() {
  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.PORT || 4000 },
    context: async ({ req }) => {
      return {
        authentication: async () => {
          const token = req.headers.authorization || "";
          if (!token) {
            throw new Error("No token provided");
          }

          const [type, tkn] = token.split(" ");
          if (type !== "Bearer") {
            throw new Error("Invalid token type");
          }

          if (!tkn) {
            throw new Error("No token provided");
          }

          const payload = verifyToken(tkn);
          return payload;
        },
      };
    },
  });

  console.log(`🚀 Server ready at: ${url}`);
}

startServer();
