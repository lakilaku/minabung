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
    getThisMonthIncomes(groupId: ID!): [Income]
    getThisMonthExpenses(groupId: ID!): [Expense]
    getThisMonthExpensesByBudgetId(groupId: ID!, budgetId: ID!): [Expense]
}

type Mutation {
    createGroup(name: String!, description: String): Group
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
    deleteBudget(id: ID!): Budget
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
    getThisMonthIncomes: async (_, { groupId }) => {
      const group = await GroupModel.collection().findOne({ _id: groupId });
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const incomes = group.incomes.filter((income) => {
        const date = new Date(income.date);
        return date >= startOfMonth && date <= endOfMonth;
      });
      return incomes;
    },
    getThisMonthExpenses: async (_, { groupId }) => {
      const group = await GroupModel.collection().findOne({ _id: groupId });
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const expenses = group.expenses.filter((expense) => {
        const date = new Date(expense.date);
        return date >= startOfMonth && date <= endOfMonth;
      });
      return expenses;
    },
    getThisMonthExpensesByBudgetId: async (_, { groupId, budgetId }) => {
      const group = await GroupModel.collection().findOne({ _id: groupId });
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const expenses = group.expenses.filter((expense) => {
        const date = new Date(expense.date);
        return (
          date >= startOfMonth &&
          date <= endOfMonth &&
          expense.budgetId === budgetId
        );
      });
      return expenses;
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
    addIncome: async (_, { groupId, name, note, amount, date }, context) => {
      const auth = await context.authentication();
      const result = await GroupModel.addIncome(
        auth,
        groupId,
        name,
        note,
        amount,
        date
      );
      return result;
    },
    updateIncome: async (_, { id, groupId, name, note, amount, date }) => {
      const auth = await context.authentication();
      const result = await GroupModel.updateIncome(
        auth,
        groupId,
        id,
        name,
        note,
        amount,
        date
      );
      return result;
    },
    deleteIncome: async (_, { groupId, id }) => {
      const auth = await context.authentication();
      const result = await GroupModel.deleteIncome(auth, id);
      return result;
    },
  },
};
