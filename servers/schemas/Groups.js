import GroupModel from "../models/GroupModel.js";
const typeDefs = `#graphql
type Group {
    _id: ID
    name: String
    description: String
    members: [UserGroup]
    incomes: [Income]
    expenses: [Expense]
    budgets: [Budget]
    invite: String
}

type Budget {
    _id: ID
    name: String
    limit: Float
    icon: String
    color: String
}

type UserGroup {
  _id: ID!
  name: String
  role: String
}

type Income {
    _id: ID
    name: String
    note: String
    amount: Float
    date: String
}

type Expense {
    _id: ID
    name: String
    note: String
    amount: Float
    date: String
    budgetId: ID
}

type Query {
    getGroupById(id: ID!): Group
    getGroupByUserId(userId: ID!): [Group]
    findGroupByInvite(invite: String!): Group
    findIncomeById(id: ID!): Income
}

type Mutation {
    createGroup(name: String!, description: String): Group
    joinGroup(invite: String!): Group
    updateGroup(id: ID!, name: String, description: String): Group
    deleteGroup(id: ID!): String
    addIncome(groupId: ID!, name: String!, note: String, amount: Float!): Income
    updateIncome(id: ID!, name: String, note: String, amount: Float , groupId: ID!): Income
    deleteIncome(id: ID!, groupId: ID!): String
    addBudget(groupId: ID!, name: String!, limit: Float!, icon: String, color: String): Budget
    updateBudget(id: ID!, name: String, limit: Float, icon: String, color: String): Budget
    deleteBudget(id: ID!): Budget
    addExpense(groupId: ID!, name: String!, note: String, amount: Float!, date: String, budgetId: ID): Expense
    updateExpense(id: ID!, name: String, note: String, amount: Float, date: String, budgetId: ID): Expense
    deleteExpense(id: ID!): Expense
}
`;

const resolvers = {
  Query: {
    getGroupById: async (_, { id }) => {
      return await GroupModel.collection().findOne({ _id: id });
    },
    getGroupByUserId: async (_, { userId }) => {
      return await GroupModel.collection().find({ members: userId }).toArray();
    },
    findGroupByInvite: async (_, { invite }) => {
      return await GroupModel.collection().findOne({ invite: invite });
    },
    findIncomeById: async (_, { id }) => {
      return await GroupModel.collection().findOne({ "incomes._id": id });
    },
  },

  Mutation: {
    createGroup: async (_, { name, description }, context) => {
      const auth = await context.authentication();
      const group = {
        name,
        description,
      };
      const result = await GroupModel.createGroup(auth, group);
      return result;
    },
    joinGroup: async (_, { invite }, context) => {
      const auth = await context.authentication();
      const result = await GroupModel.joinGroup(auth, invite);
      return result;
    },
    updateGroup: async (_, { id, name, description }, context) => {
      const auth = await context.authentication();
      const result = await GroupModel.updateGroup(auth, id, name, description);
      return result;
    },
    deleteGroup: async (_, { id }, context) => {
      const auth = await context.authentication();
      const result = await GroupModel.deleteGroup(auth, id);
      return result;
    },
    addIncome: async (_, { groupId, name, note, amount }, context) => {
      const auth = await context.authentication();
      const result = await GroupModel.addIncome(
        auth,
        groupId,
        name,
        note,
        amount
      );
      return result;
    },
    updateIncome: async (_, { id, groupId, name, note, amount }, context) => {
      const auth = await context.authentication();
      const result = await GroupModel.updateIncome(
        auth,
        groupId,
        id,
        name,
        note,
        amount
      );
      return result;
    },
    deleteIncome: async (_, { groupId, id }, context) => {
      const auth = await context.authentication();
      const result = await GroupModel.deleteIncome(auth, groupId, id);
      return result;
    },
    addBudget: async (
      _,
      { groupId, name, limit, icon, color },
      { authentication }
    ) => {
      const user = await authentication();
      if (!user) {
        throw new Error("Unauthorized");
      }

      return await GroupModel.addBudget(
        user,
        groupId,
        name,
        limit,
        icon,
        color
      );
    },
    updateBudget: async (
      _,
      { id, name, limit, icon, color },
      { authentication }
    ) => {
      const user = await authentication();
      if (!user) {
        throw new Error("Unauthorized");
      }

      return await GroupModel.updateBudget(user, id, {
        name,
        limit,
        icon,
        color,
      });
    },
    deleteBudget: async (_, { id }, { authentication }) => {
      const user = await authentication();
      if (!user) {
        throw new Error("Unauthorized");
      }

      return await GroupModel.deleteBudget(user, id);
    },
    addExpense: async (
      _,
      { groupId, name, note, amount, date, budgetId },
      { authentication }
    ) => {
      const user = await authentication();
      if (!user) {
        throw new Error("Unauthorized");
      }

      return await GroupModel.addExpense(
        user,
        groupId,
        name,
        note,
        amount,
        date,
        budgetId
      );
    },
    updateExpense: async (
      _,
      { id, name, note, amount, date, budgetId },
      { authentication }
    ) => {
      const user = await authentication();
      if (!user) {
        throw new Error("Unauthorized");
      }

      return await GroupModel.updateExpense(user, id, {
        name,
        note,
        amount,
        date,
        budgetId,
      });
    },
    deleteExpense: async (_, { id }, { authentication }) => {
      const user = await authentication();
      if (!user) {
        throw new Error("Unauthorized");
      }

      return await GroupModel.deleteExpense(user, id);
    },
  },
};

export { typeDefs as groupTypeDefs, resolvers as groupResolvers };
