const typeDefs = `#graphql
type Group {
    _id: ID
    name: String
    description: String
    members: [User]
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
    getIncomesByGroupId(groupId: ID!): [Income]
    getExpensesByGroupId(groupId: ID!): [Expense]
    getBudgetsByGroupId(groupId: ID!): [Budget]
    findGroupByInvite(invite: String!): Group
}

type Mutation {
    createGroup(name: String!, description: String, members: [ID], incomes: [IncomeInput], expenses: [ExpenseInput], budgets: [BudgetInput]): Group
    joinGroup(invite: String!): Group
    updateGroup(id: ID!, name: String, description: String): Group
    deleteGroup(id: ID!): Group
    addIncome(groupId: ID!, name: String!, note: String, amount: Float!, date: String): Income
    updateIncome(id: ID!, name: String, note: String, amount: Float, date: String): Income
    deleteIncome(id: ID!): Income
    addExpense(groupId: ID!, name: String!, note: String, amount: Float!, date: String, budgetId: ID): Expense
    updateExpense(id: ID!, name: String, note: String, amount: Float, date: String, budgetId: ID): Expense
    deleteExpense(id: ID!): Expense
    addBudget(groupId: ID!, name: String!, limit: Float!, icon: String, color: String): Budget
    updateBudget(id: ID!, name: String, limit: Float, icon: String, color: String): Budget
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
    getIncomesByGroupId: async (_, { groupId }) => {
      return await IncomeModel.collection()
        .find({ groupId: groupId })
        .toArray();
    },
    getExpensesByGroupId: async (_, { groupId }) => {
      return await ExpenseModel.collection()
        .find({ groupId: groupId })
        .toArray();
    },
    getBudgetsByGroupId: async (_, { groupId }) => {
      return await BudgetModel.collection()
        .find({ groupId: groupId })
        .toArray();
    },
    findGroupByInvite: async (_, { invite }) => {
      return await GroupModel.collection().findOne({ invite: invite });
    },
  },

  Mutation: {
    createGroup: async (
      _,
      { name, description, members, incomes, expenses, budgets },
      context
    ) => {
      const auth = await context.authentication();
      const group = {
        name,
        description,
        members,
        incomes,
        expenses,
        budgets,
      };
      const result = await GroupModel.createGroup(auth, group);
      return result;
    },
    joinGroup: async (_, { invite }) => {
      const auth = await context.authentication();
      const result = await GroupModel.joinGroup(auth, invite);
      return result;
    },
    updateGroup: async (_, { id, name, description }) => {
      const auth = await context.authentication();
      const result = await GroupModel.updateGroup(auth, id, name, description);
      return result;
    },
    deleteGroup: async (_, { id }) => {
      const auth = await context.authentication();
      const result = await GroupModel.deleteGroup(auth, id);
      return result;
    },
  },
};
