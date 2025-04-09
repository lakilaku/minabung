import e from "express";
import { ApolloServer } from "@apollo/server";
import { userResolvers, userTypeDefs } from "./schemas/Users.js";
import { verifyToken } from "./helpers/jwt.js";
import { groupResolvers, groupTypeDefs } from "./schemas/Groups.js";
import { graphqlUploadExpress } from "graphql-upload-minimal";
import { expressMiddleware } from "@apollo/server/express4";

const app = e();
app.use(e.json());
app.use(e.urlencoded({ extended: true }));

app.use(graphqlUploadExpress({ maxFileSize: 5 * 1024 * 1024, maxFiles: 1 }));
const server = new ApolloServer({
  typeDefs: [userTypeDefs, groupTypeDefs],
  resolvers: [userResolvers, groupResolvers],
  csrfPrevention: false,
});

async function startServer() {
  await server.start();
  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => ({
        authentication: async () => {
          const token = req.headers.authorization || "";
          if (!token) throw new Error("No token provided");

          const [type, tkn] = token.split(" ");
          if (type !== "Bearer") throw new Error("Invalid token type");
          if (!tkn) throw new Error("No token provided");

          return verifyToken(tkn);
        },
      }),
    })
  );

  app.listen(process.env.PORT || 4000, () =>
    console.log("🚀 Server running at http://localhost:4000/graphql")
  );
}

startServer();
