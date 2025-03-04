import { ObjectId } from "mongodb";
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

type Transaction {
    _id: ID
    name: String
    note: String
    amount: Float
    date: String
    budgetId: ID
    type: String
}

type Query {
    getGroupById(id: ID!): Group
    getGroupByUserId(userId: ID!): [Group]
    findGroupByInvite(invite: String!): Group
    findIncomeById(id: ID!): Income
    getThisMonthIncomes(groupId: ID!): [Income]
    getThisMonthExpenses(groupId: ID!): [Expense]
    getThisMonthExpensesByBudgetId(groupId: ID!, budgetId: ID!): [Expense]
    getThisMonthIncomesandExpenses(groupId: ID!): [Transaction]
    getAllIncomes(groupId: ID!): [Income]
    getAllExpenses(groupId: ID!): [Expense]
    getIncomesByMonth(groupId: ID!, month: Int!, year: Int!): [Income]
    getExpensesByMonth(groupId: ID!, month: Int!, year: Int!): [Expense]
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
    createAIGroup(userPrompt: String!): Group
}
`;

const resolvers = {
  Query: {
    getGroupById: async (_, { id }) => {
      let idHex = ObjectId.createFromHexString(id);
      return await GroupModel.collection().findOne({ _id: idHex });
    },
    getGroupByUserId: async (_, { userId }) => {
      let userIdHex = ObjectId.createFromHexString(userId);
      return await GroupModel.collection()
        .find({ "members._id": userIdHex })
        .toArray();
    },
    findGroupByInvite: async (_, { invite }) => {
      return await GroupModel.collection().findOne({ invite: invite });
    },
    findIncomeById: async (_, { id }) => {
      return await GroupModel.collection().findOne({ "incomes._id": id });
    },
    getThisMonthIncomes: async (_, { groupId }) => {
      const group = await GroupModel.collection().findOne({
        _id: ObjectId.createFromHexString(groupId),
      });
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
      const group = await GroupModel.collection().findOne({
        _id: ObjectId.createFromHexString(groupId),
      });
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
      const group = await GroupModel.collection().findOne({
        _id: ObjectId.createFromHexString(groupId),
      });
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const expenses = group.expenses.filter((expense) => {
        const date = new Date(expense.date);
        return (
          date >= startOfMonth &&
          date <= endOfMonth &&
          expense.budgetId.toString() ===
            ObjectId.createFromHexString(budgetId).toString()
        );
      });
      return expenses;
    },
    getThisMonthIncomesandExpenses: async (_, { groupId }) => {
      const group = await GroupModel.collection().findOne({
        _id: ObjectId.createFromHexString(groupId),
      });
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const incomes = group.incomes.filter((income) => {
        const date = new Date(income.date);
        return date >= startOfMonth && date <= endOfMonth;
      });
      const expenses = group.expenses.filter((expense) => {
        const date = new Date(expense.date);
        return date >= startOfMonth && date <= endOfMonth;
      });

      const incomeTransactions = incomes.map((income) => ({
        ...income,
        type: "income",
      }));
      const expenseTransactions = expenses.map((expense) => ({
        ...expense,
        type: "expense",
      }));
      const transactions = [...incomeTransactions, ...expenseTransactions];
      const sortedTransactions = transactions.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
      return sortedTransactions;
    },
    getAllIncomes: async (_, { groupId }) => {
      const group = await GroupModel.collection().findOne({
        _id: ObjectId.createFromHexString(groupId),
      });
      if (!group.incomes) {
        return [];
      }
      return group.incomes;
    },
    getAllExpenses: async (_, { groupId }) => {
      const group = await GroupModel.collection().findOne({
        _id: ObjectId.createFromHexString(groupId),
      });
      if (!group) {
        return [];
      }
      if (!group.expenses) {
        return [];
      }
      return group.expenses;
    },
    getIncomesByMonth: async (_, { groupId, month, year }) => {
      const group = await GroupModel.collection().findOne({
        _id: ObjectId.createFromHexString(groupId),
      });
      month = month - 1;
      const incomes = group.incomes.filter((income) => {
        const date = new Date(income.date);
        return date.getMonth() === month && date.getFullYear() === year;
      });
      return incomes;
    },
    getExpensesByMonth: async (_, { groupId, month, year }) => {
      const group = await GroupModel.collection().findOne({
        _id: ObjectId.createFromHexString(groupId),
      });
      month = month - 1;
      const expenses = group.expenses.filter((expense) => {
        const date = new Date(expense.date);
        return date.getMonth() === month && date.getFullYear() === year;
      });
      return expenses;
    },
  },

  Mutation: {
    createGroup: async (_, { name, description }, { authentication }) => {
      const user = await authentication();
      if (!user) {
        throw new Error("Unauthorized");
      }

      return await GroupModel.createGroup(user, { name, description });
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
    createAIGroup: async (_, { userPrompt }, { authentication }) => {
      const user = await authentication();
      return await GroupModel.createAIGroup(user, userPrompt);
    },
  },
};

export { typeDefs as groupTypeDefs, resolvers as groupResolvers };
