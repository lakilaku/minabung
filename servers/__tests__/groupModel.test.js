import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";
import GroupModel from "../models/GroupModel.js";
import UserModel from "../models/UserModel.js";
import openai from "../helpers/openAI.js";
import { jest } from "@jest/globals";

openai.chat = { completions: { create: jest.fn() } };

let testUser;
let secondUser;
let connection;
let db;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  connection = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  db = connection.db();

  GroupModel.collection = () => db.collection("groups");
  UserModel.collection = () => db.collection("users");

  const testUserId = new ObjectId();
  const secondUserId = new ObjectId();
  await UserModel.collection().insertMany([
    { _id: testUserId, name: "Test User", groups: [] },
    { _id: secondUserId, name: "Second User", groups: [] },
  ]);

  testUser = { id: testUserId.toString(), name: "Test User" };
  secondUser = { id: secondUserId.toString(), name: "Second User" };
});

afterAll(async () => {
  await connection.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  await GroupModel.collection().deleteMany({});
});

describe("GroupModel Tests", () => {
  test("Should create a new group", async () => {
    const groupData = { name: "Test Group", description: "A test group" };
    const group = await GroupModel.createGroup(testUser, groupData);

    expect(group).toHaveProperty("_id");
    expect(group.name).toBe("Test Group");
    expect(group.description).toBe("A test group");
    expect(group.members.length).toBe(1);
    expect(group.members[0].role).toBe("Owner");
  });

  test("Should allow user to create multiple groups", async () => {
    const group1 = await GroupModel.createGroup(testUser, {
      name: "Group 1",
      description: "",
    });
    const group2 = await GroupModel.createGroup(testUser, {
      name: "Group 2",
      description: "",
    });
    const group3 = await GroupModel.createGroup(testUser, {
      name: "Group 3",
      description: "",
    });
    const group4 = await GroupModel.createGroup(testUser, {
      name: "Group 4",
      description: "Another group",
    });

    expect(group4).toHaveProperty("_id");
    expect(group4.name).toBe("Group 4");
  });

  test("Should allow user to join a group", async () => {
    const groupData = {
      name: "Joinable Group",
      description: "A group to join",
    };
    const createdGroup = await GroupModel.createGroup(testUser, groupData);

    const joinedGroup = await GroupModel.joinGroup(
      secondUser,
      createdGroup.invite
    );

    expect(joinedGroup.members.length).toBe(2);
    expect(
      joinedGroup.members.some((m) => m.name === secondUser.name)
    ).toBeTruthy();
  });

  test("Should allow user to join multiple groups", async () => {
    const groupA = await GroupModel.createGroup(testUser, {
      name: "Group A",
      description: "",
    });
    const groupB = await GroupModel.createGroup(testUser, {
      name: "Group B",
      description: "",
    });
    const groupC = await GroupModel.createGroup(testUser, {
      name: "Group C",
      description: "",
    });

    const joinedA = await GroupModel.joinGroup(secondUser, groupA.invite);
    const joinedB = await GroupModel.joinGroup(secondUser, groupB.invite);
    const joinedC = await GroupModel.joinGroup(secondUser, groupC.invite);

    expect(joinedA.members.length).toBeGreaterThanOrEqual(2);
    expect(joinedB.members.length).toBeGreaterThanOrEqual(2);
    expect(joinedC.members.length).toBeGreaterThanOrEqual(2);
  });

  test("Should allow updating group details by Owner/Admin", async () => {
    const groupData = {
      name: "Editable Group",
      description: "Original description",
    };
    const createdGroup = await GroupModel.createGroup(testUser, groupData);

    const updatedGroup = await GroupModel.updateGroup(
      testUser,
      createdGroup._id.toString(),
      "Updated Name",
      "Updated Description"
    );

    expect(updatedGroup.name).toBe("Updated Name");
    expect(updatedGroup.description).toBe("Updated Description");
  });

  test("Should prevent non-member from updating group details", async () => {
    const groupData = { name: "Protected Group", description: "" };
    const createdGroup = await GroupModel.createGroup(testUser, groupData);

    await expect(
      GroupModel.updateGroup(
        secondUser,
        createdGroup._id.toString(),
        "New Name",
        "New Description"
      )
    ).rejects.toThrow("You are not a member of this group");
  });

  test("Should delete group if owner", async () => {
    const groupData = { name: "Deletable Group", description: "" };
    const createdGroup = await GroupModel.createGroup(testUser, groupData);

    const result = await GroupModel.deleteGroup(
      testUser,
      createdGroup._id.toString()
    );
    expect(result).toBe("Delete Successful");
  });

  test("Should prevent non-owner from deleting a group", async () => {
    const groupData = { name: "Restricted Group", description: "" };
    const createdGroup = await GroupModel.createGroup(testUser, groupData);

    await expect(
      GroupModel.deleteGroup(secondUser, createdGroup._id.toString())
    ).rejects.toThrow("You are not a member of this group");
  });

  test("Should throw error when joining a non-existent group", async () => {
    await expect(
      GroupModel.joinGroup(testUser, "non-existent-invite")
    ).rejects.toThrow("Group not found");
  });

  test("Should throw error if non-member tries to update group details", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "desc",
    });
    await expect(
      GroupModel.updateGroup(
        secondUser,
        group._id.toString(),
        "New Name",
        "New Desc"
      )
    ).rejects.toThrow("You are not a member of this group");
  });

  test("Should throw error when user is already a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Test Group",
      description: "desc",
    });
    await GroupModel.joinGroup(secondUser, group.invite);
    await expect(
      GroupModel.joinGroup(secondUser, group.invite)
    ).rejects.toThrow("You are already a member of this group");
  });

  test("Should throw error when updating group details by non-member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "desc",
    });
    await expect(
      GroupModel.updateGroup(
        secondUser,
        group._id.toString(),
        "New Name",
        "New Desc"
      )
    ).rejects.toThrow("You are not a member of this group");
  });

  test("Should throw error when deleting group by non-owner", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "desc",
    });
    await GroupModel.joinGroup(secondUser, group.invite);
    await expect(
      GroupModel.deleteGroup(secondUser, group._id.toString())
    ).rejects.toThrow("Only owners can delete the group");
  });
});

describe("Negative Cases", () => {
  test("findGroupByInvite returns null when not found", async () => {
    const group = await GroupModel.findGroupByInvite("invalidInvite");
    expect(group).toBeNull();
  });

  test("findGroupById returns null when group does not exist", async () => {
    const group = await GroupModel.findGroupById(new ObjectId().toString());
    expect(group).toBeNull();
  });

  test("getGroupById returns null when group does not exist", async () => {
    const group = await GroupModel.getGroupById(new ObjectId());
    expect(group).toBeNull();
  });

  test("createGroup throws error when insertOne fails", async () => {
    // Override insertOne to simulate failure
    const originalInsertOne = GroupModel.collection().insertOne;
    GroupModel.collection = () => ({
      insertOne: async () => ({}),
    });
    await expect(
      GroupModel.createGroup(testUser, { name: "Fail Group", description: "" })
    ).rejects.toThrow("Failed to create group");
    // Restore collection method
    GroupModel.collection = () => db.collection("groups");
  });

  test("updateGroup throws error when group not found", async () => {
    await expect(
      GroupModel.updateGroup(
        testUser,
        new ObjectId().toString(),
        "Name",
        "Desc"
      )
    ).rejects.toThrow("Group not found");
  });

  test("updateGroup throws error when member is not admin", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    await GroupModel.joinGroup(secondUser, group.invite);
    await expect(
      GroupModel.updateGroup(
        secondUser,
        group._id.toString(),
        "New Name",
        "New Desc"
      )
    ).rejects.toThrow("You are not the admin of this group");
  });

  test("deleteGroup throws error when group not found", async () => {
    await expect(
      GroupModel.deleteGroup(testUser, new ObjectId().toString())
    ).rejects.toThrow("Group not found");
  });

  test("deleteGroup throws error when user is not a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    await expect(
      GroupModel.deleteGroup(secondUser, group._id.toString())
    ).rejects.toThrow("You are not a member of this group");
  });

  test("addIncome throws error when group not found", async () => {
    await expect(
      GroupModel.addIncome(
        testUser,
        new ObjectId().toString(),
        "Income",
        "Note",
        1000
      )
    ).rejects.toThrow("Group not found");
  });

  test("addIncome throws error when user is not a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    await expect(
      GroupModel.addIncome(
        secondUser,
        group._id.toString(),
        "Income",
        "Note",
        1000
      )
    ).rejects.toThrow("You are not a member of this group");
  });

  test("updateIncome throws error when group not found", async () => {
    await expect(
      GroupModel.updateIncome(
        testUser,
        new ObjectId().toString(),
        new ObjectId().toString(),
        "Name",
        "Note",
        1000
      )
    ).rejects.toThrow("Group not found");
  });

  test("updateIncome throws error when income not found", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    await expect(
      GroupModel.updateIncome(
        testUser,
        group._id.toString(),
        new ObjectId().toString(),
        "Name",
        "Note",
        1000
      )
    ).rejects.toThrow("Income not found");
  });

  test("deleteIncome throws error when group not found", async () => {
    await expect(
      GroupModel.deleteIncome(
        testUser,
        new ObjectId().toString(),
        new ObjectId().toString()
      )
    ).rejects.toThrow("Group not found");
  });

  test("deleteIncome throws error when expense not found", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    await expect(
      GroupModel.deleteIncome(
        testUser,
        group._id.toString(),
        new ObjectId().toString()
      )
    ).rejects.toThrow("Income not found");
  });

  test("addBudget throws error when group not found", async () => {
    await expect(
      GroupModel.addBudget(
        testUser,
        new ObjectId().toString(),
        "Budget",
        1000,
        "icon",
        "red"
      )
    ).rejects.toThrow("Group not found");
  });

  test("addBudget throws error when user is not a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    await expect(
      GroupModel.addBudget(
        secondUser,
        group._id.toString(),
        "Budget",
        1000,
        "icon",
        "red"
      )
    ).rejects.toThrow("You are not a member of this group");
  });

  test("updateBudget throws error when budget not found", async () => {
    await expect(
      GroupModel.updateBudget(testUser, new ObjectId().toString(), {
        name: "New Budget",
      })
    ).rejects.toThrow("Budget not found");
  });

  test("updateBudget throws error when user is not a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    const budget = await GroupModel.addBudget(
      testUser,
      group._id.toString(),
      "Budget",
      1000,
      "icon",
      "red"
    );
    await expect(
      GroupModel.updateBudget(secondUser, budget._id.toString(), {
        name: "New Budget",
      })
    ).rejects.toThrow("You are not a member of this group");
  });

  test("deleteBudget throws error when budget not found", async () => {
    await expect(
      GroupModel.deleteBudget(testUser, new ObjectId().toString())
    ).rejects.toThrow("Budget not found");
  });

  test("deleteBudget throws error when user is not a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    const budget = await GroupModel.addBudget(
      testUser,
      group._id.toString(),
      "Budget",
      1000,
      "icon",
      "red"
    );
    await expect(
      GroupModel.deleteBudget(secondUser, budget._id.toString())
    ).rejects.toThrow("You are not a member of this group");
  });

  test("updateExpense throws error when group not found", async () => {
    await expect(
      GroupModel.updateExpense(testUser, new ObjectId().toString(), {
        name: "New Expense",
        note: "Note",
        amount: 1000,
      })
    ).rejects.toThrow("Expense not found");
  });

  test("updateExpense throws error when user is not a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    const expense = await GroupModel.addExpense(
      testUser,
      group._id.toString(),
      "Expense",
      "Note",
      1000
    );
    await expect(
      GroupModel.updateExpense(secondUser, expense._id.toString(), {
        name: "New Expense",
        note: "Note",
        amount: 1000,
      })
    ).rejects.toThrow("You are not a member of this group");
  });

  test("deleteExpense throws error when group not found", async () => {
    await expect(
      GroupModel.deleteExpense(
        testUser,
        new ObjectId().toString(),
        new ObjectId().toString()
      )
    ).rejects.toThrow("Group not found");
  });
});

describe("GroupModel Income Operations", () => {
  test("Should add income to a group", async () => {
    const createdGroup = await GroupModel.createGroup(testUser, {
      name: "Income Group",
      description: "Group for income testing",
    });

    const incomeData = { name: "Salary", note: "Monthly salary", amount: 5000 };
    const income = await GroupModel.addIncome(
      testUser,
      createdGroup._id.toString(),
      incomeData.name,
      incomeData.note,
      incomeData.amount
    );

    expect(income).toHaveProperty("_id");
    expect(income.name).toBe("Salary");
    expect(income.amount).toBe(5000);

    const updatedGroup = await GroupModel.findGroupById(
      createdGroup._id.toString()
    );
    expect(updatedGroup.incomes).toHaveLength(1);
  });

  test("Should update income in a group", async () => {
    const createdGroup = await GroupModel.createGroup(testUser, {
      name: "Update Income Group",
      description: "Group for income update test",
    });
    const income = await GroupModel.addIncome(
      testUser,
      createdGroup._id.toString(),
      "Salary",
      "Initial note",
      5000
    );

    const updatedIncome = await GroupModel.updateIncome(
      testUser,
      createdGroup._id.toString(),
      income._id.toString(),
      "Updated Salary",
      "Updated note",
      6000
    );

    expect(updatedIncome.name).toBe("Updated Salary");
    expect(updatedIncome.note).toBe("Updated note");
    expect(updatedIncome.amount).toBe(6000);
  });

  test("Should delete income from a group", async () => {
    const createdGroup = await GroupModel.createGroup(testUser, {
      name: "Delete Income Group",
      description: "Group for income deletion test",
    });
    const income = await GroupModel.addIncome(
      testUser,
      createdGroup._id.toString(),
      "Salary",
      "To be deleted",
      5000
    );

    const result = await GroupModel.deleteIncome(
      testUser,
      createdGroup._id.toString(),
      income._id.toString()
    );

    expect(result).toBe("Delete Successful");

    const groupAfterDeletion = await GroupModel.findGroupById(
      createdGroup._id.toString()
    );
    expect(groupAfterDeletion.incomes).toHaveLength(0);
  });
});

describe("GroupModel Budget Operations", () => {
  test("Should add a new budget to a group", async () => {
    const createdGroup = await GroupModel.createGroup(testUser, {
      name: "Budget Group",
      description: "Group for budget testing",
    });
    const budget = await GroupModel.addBudget(
      testUser,
      createdGroup._id.toString(),
      "Family Budget",
      500000,
      "restaurant",
      "blue"
    );

    expect(budget).toHaveProperty("_id");
    expect(budget.name).toBe("Family Budget");
    expect(budget.limit).toBe(500000);
    expect(budget.icon).toBe("restaurant");
    expect(budget.color).toBe("blue");

    const updatedGroup = await GroupModel.findGroupById(
      createdGroup._id.toString()
    );
    expect(updatedGroup.budgets).toBeDefined();
    expect(updatedGroup.budgets.length).toBe(1);
    expect(updatedGroup.budgets[0].name).toBe("Family Budget");
  });

  test("Should update an existing budget", async () => {
    const createdGroup = await GroupModel.createGroup(testUser, {
      name: "Update Budget Group",
      description: "Group for budget update test",
    });
    const budget = await GroupModel.addBudget(
      testUser,
      createdGroup._id.toString(),
      "Old Budget",
      300000,
      "shopping-cart",
      "red"
    );

    const updatedBudget = await GroupModel.updateBudget(
      testUser,
      budget._id.toString(),
      {
        name: "New Budget",
        limit: 400000,
        icon: "attach-money",
        color: "green",
      }
    );

    expect(updatedBudget.name).toBe("New Budget");
    expect(updatedBudget.limit).toBe(400000);
    expect(updatedBudget.icon).toBe("attach-money");
    expect(updatedBudget.color).toBe("green");
  });

  test("Should delete a budget from a group", async () => {
    const createdGroup = await GroupModel.createGroup(testUser, {
      name: "Delete Budget Group",
      description: "Group for budget deletion test",
    });
    const budget = await GroupModel.addBudget(
      testUser,
      createdGroup._id.toString(),
      "Budget to Delete",
      200000,
      "wallet",
      "yellow"
    );

    const result = await GroupModel.deleteBudget(
      testUser,
      budget._id.toString()
    );

    expect(result._id.toString()).toBe(budget._id.toString());
    const groupAfterDeletion = await GroupModel.findGroupById(
      createdGroup._id.toString()
    );
    expect(groupAfterDeletion.budgets).toHaveLength(0);
  });
});

describe("GroupModel Expense Operations", () => {
  let createdGroup;
  beforeEach(async () => {
    createdGroup = await GroupModel.createGroup(testUser, {
      name: "Expense Group",
      description: "Group for expense testing",
    });
  });

  test("Should add an expense to a group", async () => {
    const expenseData = {
      name: "Lunch",
      note: "Office lunch",
      amount: 50,
      date: new Date("2023-03-20T12:00:00Z").toISOString(),
      budgetId: null,
    };

    const expense = await GroupModel.addExpense(
      testUser,
      createdGroup._id.toString(),
      expenseData.name,
      expenseData.note,
      expenseData.amount,
      expenseData.date,
      expenseData.budgetId
    );

    expect(expense).toHaveProperty("_id");
    expect(expense.name).toBe("Lunch");
    expect(expense.amount).toBe(50);

    const updatedGroup = await GroupModel.findGroupById(
      createdGroup._id.toString()
    );
    expect(updatedGroup.expenses).toHaveLength(1);
  });

  test("Should update an expense in a group", async () => {
    const expense = await GroupModel.addExpense(
      testUser,
      createdGroup._id.toString(),
      "Lunch",
      "Office lunch",
      50,
      new Date("2023-03-20T12:00:00Z").toISOString(),
      null
    );
    const updatedExpense = await GroupModel.updateExpense(
      testUser,
      expense._id.toString(),
      {
        name: "Dinner",
        note: "Office dinner",
        amount: 70,
        date: new Date("2023-03-20T18:00:00Z").toISOString(),
        budgetId: null,
      }
    );

    expect(updatedExpense.name).toBe("Dinner");
    expect(updatedExpense.note).toBe("Office dinner");
    expect(updatedExpense.amount).toBe(70);
  });

  test("Should delete an expense from a group", async () => {
    const expense = await GroupModel.addExpense(
      testUser,
      createdGroup._id.toString(),
      "Snack",
      "Afternoon snack",
      20,
      new Date("2023-03-20T15:00:00Z").toISOString(),
      null
    );

    const deleteResult = await GroupModel.deleteExpense(
      testUser,
      createdGroup._id.toString(),
      expense._id.toString()
    );

    expect(deleteResult._id.toString()).toBe(expense._id.toString());

    const groupAfterDeletion = await GroupModel.findGroupById(
      createdGroup._id.toString()
    );
    expect(groupAfterDeletion.expenses).toHaveLength(0);
  });
});

describe("GroupModel AI Group Creation", () => {
  test("Should create an AI-generated group", async () => {
    const fakeAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: "Generated Group Name",
              description: "Short description of the group purpose",
              budgets: [
                {
                  name: "Budget Category",
                  limit: 500000,
                  icon: "restaurant",
                  color: "blue",
                },
              ],
            }),
          },
        },
      ],
    };

    openai.chat.completions.create.mockResolvedValue(fakeAIResponse);

    const aiGroup = await GroupModel.createAIGroup(
      testUser,
      "Manage a family budget with savings for kids"
    );

    expect(aiGroup).toHaveProperty("_id");
    expect(aiGroup.name).toBe("Generated Group Name");
    expect(aiGroup.description).toBe("Short description of the group purpose");
    expect(aiGroup.members).toHaveLength(1);
    expect(aiGroup.budgets).toHaveLength(1);
    expect(aiGroup.budgets[0]).toHaveProperty("_id");
    expect(aiGroup.budgets[0].name).toBe("Budget Category");
  });
});

describe("GroupModel Extra Negative & Edge Case Tests", () => {
  // --- Utility Methods ---
  test("findGroupByInvite returns null when invite not found", async () => {
    const group = await GroupModel.findGroupByInvite("invalidInvite");
    expect(group).toBeNull();
  });

  test("findGroupById returns null when group not found", async () => {
    const group = await GroupModel.findGroupById(new ObjectId().toString());
    expect(group).toBeNull();
  });

  test("getGroupById returns null when group not found", async () => {
    const group = await GroupModel.getGroupById(new ObjectId());
    expect(group).toBeNull();
  });

  test("createGroup throws error when insertOne fails", async () => {
    const originalInsertOne = GroupModel.collection().insertOne;
    // Override insertOne to simulate failure
    GroupModel.collection = () => ({
      insertOne: async () => ({}),
      findOne: originalInsertOne,
    });
    await expect(
      GroupModel.createGroup(testUser, { name: "Fail Group", description: "" })
    ).rejects.toThrow("Failed to create group");
    // Restore
    GroupModel.collection = () => db.collection("groups");
  });

  // --- joinGroup error branches ---
  test("joinGroup throws error when group not found", async () => {
    await expect(
      GroupModel.joinGroup(testUser, "nonexistentInvite")
    ).rejects.toThrow("Group not found");
  });

  test("joinGroup throws error when user already a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    await GroupModel.joinGroup(secondUser, group.invite);
    await expect(
      GroupModel.joinGroup(secondUser, group.invite)
    ).rejects.toThrow("You are already a member of this group");
  });
  test("updateGroup throws error when group not found", async () => {
    await expect(
      GroupModel.updateGroup(
        testUser,
        new ObjectId().toString(),
        "Name",
        "Desc"
      )
    ).rejects.toThrow("Group not found");
  });

  test("updateGroup throws error when user is not a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "desc",
    });
    await expect(
      GroupModel.updateGroup(
        secondUser,
        group._id.toString(),
        "New Name",
        "New Desc"
      )
    ).rejects.toThrow("You are not a member of this group");
  });

  test("updateGroup throws error when member is not admin", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "desc",
    });
    await GroupModel.joinGroup(secondUser, group.invite); // secondUser becomes a normal member
    await expect(
      GroupModel.updateGroup(
        secondUser,
        group._id.toString(),
        "New Name",
        "New Desc"
      )
    ).rejects.toThrow("You are not the admin of this group");
  });
  test("deleteGroup throws error when group not found", async () => {
    await expect(
      GroupModel.deleteGroup(testUser, new ObjectId().toString())
    ).rejects.toThrow("Group not found");
  });

  test("deleteGroup throws error when user is not a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "desc",
    });
    await expect(
      GroupModel.deleteGroup(secondUser, group._id.toString())
    ).rejects.toThrow("You are not a member of this group");
  });

  test("deleteGroup throws error when non-owner tries to delete", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "desc",
    });
    await GroupModel.joinGroup(secondUser, group.invite);
    await expect(
      GroupModel.deleteGroup(secondUser, group._id.toString())
    ).rejects.toThrow("Only owners can delete the group");
  });

  test("addIncome throws error when group not found", async () => {
    await expect(
      GroupModel.addIncome(
        testUser,
        new ObjectId().toString(),
        "Income",
        "Note",
        1000
      )
    ).rejects.toThrow("Group not found");
  });

  test("addIncome throws error when user is not a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    await expect(
      GroupModel.addIncome(
        secondUser,
        group._id.toString(),
        "Income",
        "Note",
        1000
      )
    ).rejects.toThrow("You are not a member of this group");
  });

  test("updateIncome throws error when group not found", async () => {
    await expect(
      GroupModel.updateIncome(
        testUser,
        new ObjectId().toString(),
        new ObjectId().toString(),
        "Name",
        "Note",
        1000
      )
    ).rejects.toThrow("Group not found");
  });
  test("updateIncome throws error when user is not a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    const income = await GroupModel.addIncome(
      testUser,
      group._id.toString(),
      "Income",
      "Note",
      1000
    );
    await expect(
      GroupModel.updateIncome(
        secondUser,
        group._id.toString(),
        income._id.toString(),
        "New Name",
        "New Note",
        2000
      )
    ).rejects.toThrow("You are not a member of this group");
  });
  test("updateIncome throws error when income not found", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    await expect(
      GroupModel.updateIncome(
        testUser,
        group._id.toString(),
        new ObjectId().toString(),
        "Name",
        "Note",
        1000
      )
    ).rejects.toThrow("Income not found");
  });
  test("deleteBudget throws error when budget not found", async () => {
    await expect(
      GroupModel.deleteBudget(testUser, new ObjectId().toString())
    ).rejects.toThrow("Budget not found");
  });

  test("deleteBudget throws error when user is not a member", async () => {
    const group = await GroupModel.createGroup(testUser, {
      name: "Group",
      description: "",
    });
    const budget = await GroupModel.addBudget(
      testUser,
      group._id.toString(),
      "Budget",
      1000,
      "icon",
      "red"
    );
    await expect(
      GroupModel.deleteBudget(secondUser, budget._id.toString())
    ).rejects.toThrow("You are not a member of this group");
  });
  describe("GroupModel AI Group Creation Negative Cases", () => {
    test("createAIGroup throws error when AI response is invalid JSON", async () => {
      // Suppress console.error for this test so error logs don't clutter output
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const fakeAIResponse = {
        choices: [{ message: { content: "Invalid JSON response" } }],
      };
      openai.chat.completions.create.mockResolvedValue(fakeAIResponse);

      await expect(
        GroupModel.createAIGroup(testUser, "Some prompt")
      ).rejects.toThrow("AI failed to generate group");

      // Restore console.error
      console.error = originalConsoleError;
    });
  });
});
