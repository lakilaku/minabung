import { ObjectId } from "mongodb";
import { database } from "../config/Mongodb.js";
import UserModel from "./UserModel.js";
import openai from "../helpers/openAI.js";

export default class GroupModel {
  static collection() {
    return database.collection("groups");
  }

  static async findGroupByInvite(invite) {
    return await this.collection().findOne({ invite });
  }
  static async findGroupById(groupId) {
    return await this.collection().findOne({
      _id: ObjectId.createFromHexString(groupId),
    });
  }
  static async getGroupById(groupId) {
    return await this.collection().findOne({
      _id: groupId,
    });
  }

  static async createGroup(auth, group) {
    const userGroups = await this.collection().countDocuments({
      "members._id": ObjectId.createFromHexString(auth.id),
      "members.role": "Owner",
    });

    if (userGroups >= 3) {
      throw new Error("You have reached the maximum limit of 3 groups.");
    }

    const invite = (Math.random() * 100000).toString();
    const newGroup = {
      name: group.name,
      description: group.description,
      members: [
        {
          _id: ObjectId.createFromHexString(auth.id),
          name: auth.name,
          role: "Owner",
        },
      ],
      invite: invite,
    };
    const result = await this.collection().insertOne(newGroup);
    if (!result.insertedId) {
      throw new Error("Failed to create group");
    }
    await UserModel.updateUserGroup(auth.id, result.insertedId);

    return { _id: result.insertedId, ...newGroup };
  }
  static async joinGroup(auth, invite) {
    if (!auth.id || typeof auth.id !== "string" || auth.id.length !== 24) {
      throw new Error("Invalid user ID: Must be a 24-character hex string.");
    }

    console.log("🔍 Checking User ID:", auth.id);

    const userId = new ObjectId(auth.id);
    const userGroups = await this.collection().countDocuments({
      "members._id": userId,
    });

    if (userGroups >= 3) {
      throw new Error("You can only join up to 3 groups.");
    }
    const group = await this.findGroupByInvite(invite);
    if (!group) {
      throw new Error("Group not found");
    }
    if (group.members.some((member) => member._id.toString() === auth.id)) {
      throw new Error("You are already a member of this group");
    }
    const result = await this.collection().updateOne(
      { _id: group._id },
      {
        $push: {
          members: {
            _id: userId,
            name: auth.name,
            role: "Member",
          },
        },
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error("Failed to join the group");
    }

    return await this.findGroupById(group._id);
  }
  static async updateGroup(auth, id, name, description) {
    const group = await this.getGroupById(ObjectId.createFromHexString(id));
    if (!group) {
      throw new Error("Group not found");
    }
    let member = group.members.find(
      (member) => member._id.toString() === auth.id.toString()
    );
    if (!member) {
      throw new Error("You are not a member of this group");
    }

    if (member.role !== "Owner" && member.role !== "Admin") {
      throw new Error("You are not the admin of this group");
    }
    const result = await this.collection().updateOne(
      { _id: ObjectId.createFromHexString(id) },
      { $set: { name, description } }
    );
    const newGroup = await this.getGroupById(ObjectId.createFromHexString(id));
    return newGroup;
  }

  static async deleteGroup(auth, id) {
    const group = await this.getGroupById(ObjectId.createFromHexString(id));
    if (!group) {
      throw new Error("Group not found");
    }
    let member = group.members.find(
      (member) => member._id.toString() === auth.id.toString()
    );
    if (!member) {
      throw new Error("You are not a member of this group");
    }
    if (member.role !== "Owner") {
      throw new Error("Only owners can delete the group");
    }
    const result = await this.collection().deleteOne({
      _id: ObjectId.createFromHexString(id),
    });
    return "Delete Successful";
  }

  static async addIncome(auth, groupId, name, note, amount) {
    const group = await this.getGroupById(
      ObjectId.createFromHexString(groupId)
    );
    if (!group) {
      throw new Error("Group not found");
    }
    let member = group.members.find(
      (member) => member._id.toString() === auth.id.toString()
    );
    if (!member) {
      throw new Error("You are not a member of this group");
    }
    const income = {
      _id: new ObjectId(),
      name,
      note,
      amount,
      date: new Date(),
    };
    const result = await this.collection().updateOne(
      { _id: ObjectId.createFromHexString(groupId) },
      { $push: { incomes: income } }
    );
    if (result.modifiedCount < 1) {
      throw new Error("Failed to add income");
    }
    return income;
  }

  static async updateIncome(auth, groupId, id, name, note, amount) {
    const group = await this.getGroupById(
      ObjectId.createFromHexString(groupId)
    );
    if (!group) {
      throw new Error("Group not found");
    }
    let member = group.members.find(
      (member) => member._id.toString() === auth.id.toString()
    );
    if (!member) {
      throw new Error("You are not a member of this group");
    }
    const income = group.incomes.find((income) => income._id.toString() === id);
    if (!income) {
      throw new Error("Income not found");
    }
    const result = await this.collection().updateOne(
      {
        _id: ObjectId.createFromHexString(groupId),
        "incomes._id": ObjectId.createFromHexString(id),
      },
      {
        $set: {
          "incomes.$.name": name,
          "incomes.$.note": note,
          "incomes.$.amount": amount,
        },
      }
    );
    if (result.modifiedCount < 1) {
      throw new Error("Failed to update income");
    }
    const updatedGroup = await this.getGroupById(
      ObjectId.createFromHexString(groupId)
    );
    const updatedGroupIncome = updatedGroup.incomes.find(
      (income) => income._id.toString() === id
    );

    return updatedGroupIncome;
  }

  static async deleteIncome(auth, groupId, id) {
    const group = await this.getGroupById(
      ObjectId.createFromHexString(groupId)
    );
    if (!group) {
      throw new Error("Group not found");
    }
    let member = group.members.find(
      (member) => member._id.toString() === auth.id.toString()
    );
    if (!member) {
      throw new Error("You are not a member of this group");
    }
    const income = group.incomes.find((income) => income._id.toString() === id);
    if (!income) {
      throw new Error("Income not found");
    }
    const result = await this.collection().updateOne(
      { _id: ObjectId.createFromHexString(groupId) },
      { $pull: { incomes: { _id: ObjectId.createFromHexString(id) } } }
    );
    if (result.modifiedCount < 1) {
      throw new Error("Failed to delete income");
    }
    return "Delete Successful";
  }
  static async addBudget(auth, groupId, name, limit, icon, color) {
    const group = await this.collection().findOne({
      _id: ObjectId.createFromHexString(groupId),
    });

    if (!group) {
      throw new Error("Group not found");
    }

    const member = group.members.find(
      (member) => member._id.toString() === auth.id.toString()
    );
    if (!member) {
      throw new Error("You are not a member of this group");
    }

    const newBudget = {
      _id: new ObjectId(),
      name,
      limit,
      icon: icon || "",
      color: color || "",
    };

    const result = await this.collection().updateOne(
      { _id: ObjectId.createFromHexString(groupId) },
      { $push: { budgets: newBudget } }
    );

    if (result.modifiedCount < 1) {
      throw new Error("Failed to add budget");
    }

    return newBudget;
  }
  static async updateBudget(auth, budgetId, updates) {
    const group = await this.collection().findOne({
      "budgets._id": ObjectId.createFromHexString(budgetId),
    });

    if (!group) {
      throw new Error("Budget not found");
    }
    const member = group.members.find(
      (member) => member._id.toString() === auth.id.toString()
    );
    if (!member) {
      throw new Error("You are not a member of this group");
    }

    const updatedFields = {};
    if (updates.name) updatedFields["budgets.$.name"] = updates.name;
    if (updates.limit) updatedFields["budgets.$.limit"] = updates.limit;
    if (updates.icon) updatedFields["budgets.$.icon"] = updates.icon;
    if (updates.color) updatedFields["budgets.$.color"] = updates.color;

    const result = await this.collection().updateOne(
      { "budgets._id": ObjectId.createFromHexString(budgetId) },
      { $set: updatedFields }
    );

    if (result.modifiedCount < 1) {
      throw new Error("Failed to update budget");
    }

    return await this.collection()
      .findOne(
        { "budgets._id": ObjectId.createFromHexString(budgetId) },
        { projection: { "budgets.$": 1 } }
      )
      .then((doc) => doc?.budgets[0]);
  }
  static async deleteBudget(auth, budgetId) {
    const group = await this.collection().findOne({
      "budgets._id": ObjectId.createFromHexString(budgetId),
    });

    if (!group) {
      throw new Error("Budget not found");
    }

    const member = group.members.find(
      (member) => member._id.toString() === auth.id.toString()
    );
    if (!member) {
      throw new Error("You are not a member of this group");
    }

    const budgetToDelete = group.budgets.find(
      (budget) => budget._id.toString() === budgetId
    );

    const result = await this.collection().updateOne(
      { _id: group._id },
      { $pull: { budgets: { _id: ObjectId.createFromHexString(budgetId) } } }
    );

    if (result.modifiedCount < 1) {
      throw new Error("Failed to delete budget");
    }

    return budgetToDelete;
  }

  static async addExpense(auth, groupId, name, note, amount, date, budgetId) {
    const group = await this.collection().findOne({
      _id: ObjectId.createFromHexString(groupId),
    });

    if (!group) {
      throw new Error("Group not found");
    }
    const member = group.members.find(
      (member) => member._id.toString() === auth.id.toString()
    );
    if (!member) {
      throw new Error("You are not a member of this group");
    }

    const newExpense = {
      _id: new ObjectId(),
      name,
      note: note || "",
      amount,
      date: date || new Date(),
      budgetId: budgetId ? ObjectId.createFromHexString(budgetId) : null,
    };

    const result = await this.collection().updateOne(
      { _id: ObjectId.createFromHexString(groupId) },
      { $push: { expenses: newExpense } }
    );

    if (result.modifiedCount < 1) {
      throw new Error("Failed to add expense");
    }

    return newExpense;
  }

  static async updateExpense(auth, expenseId, updates) {
    const group = await this.collection().findOne({
      "expenses._id": ObjectId.createFromHexString(expenseId),
    });

    if (!group) {
      throw new Error("Expense not found");
    }
    const member = group.members.find(
      (member) => member._id.toString() === auth.id.toString()
    );
    if (!member) {
      throw new Error("You are not a member of this group");
    }

    const updatedFields = {};
    if (updates.name) updatedFields["expenses.$.name"] = updates.name;
    if (updates.note) updatedFields["expenses.$.note"] = updates.note;
    if (updates.amount) updatedFields["expenses.$.amount"] = updates.amount;
    if (updates.date) updatedFields["expenses.$.date"] = updates.date;
    if (updates.budgetId)
      updatedFields["expenses.$.budgetId"] = ObjectId.createFromHexString(
        updates.budgetId
      );

    const result = await this.collection().updateOne(
      { "expenses._id": ObjectId.createFromHexString(expenseId) },
      { $set: updatedFields }
    );

    if (result.modifiedCount < 1) {
      throw new Error("Failed to update expense");
    }

    return await this.collection()
      .findOne(
        { "expenses._id": ObjectId.createFromHexString(expenseId) },
        { projection: { "expenses.$": 1 } }
      )
      .then((doc) => doc?.expenses[0]);
  }

  static async deleteExpense(auth, expenseId) {
    const group = await this.collection().findOne({
      "expenses._id": ObjectId.createFromHexString(expenseId),
    });

    if (!group) {
      throw new Error("Expense not found");
    }

    const member = group.members.find(
      (member) => member._id.toString() === auth.id.toString()
    );
    if (!member) {
      throw new Error("You are not a member of this group");
    }

    const expenseToDelete = group.expenses.find(
      (expense) => expense._id.toString() === expenseId
    );

    const result = await this.collection().updateOne(
      { _id: group._id },
      { $pull: { expenses: { _id: ObjectId.createFromHexString(expenseId) } } }
    );

    if (result.modifiedCount < 1) {
      throw new Error("Failed to delete expense");
    }

    return expenseToDelete;
  }
  static async createAIGroup(auth, userPrompt) {
    const aiPrompt = `
      You are an expert in financial planning.
      A user wants to create a financial management group.
      The user's request: "${userPrompt}".
      If the user gives a specific budget amount, make sure that all of the limit is distributed to all of the budgets. 

      For the icons use the following list as icon-name :
      [
          "restaurant", 
          "shopping-cart", 
          "attach-money", 
          "wallet", 
          "car-rental", 
          "card-giftcard", 
          "local-hospital", 
          "home", 
          "school", 
          "flight", 
          "subscriptions", 
          "movie", 
          "fitness-center", 
          "pets", 
          "child-care", 
          "house-siding", 
          "lightbulb",
          "gas-meter", 
          "water-drop",  
          "trending-up", 
          "savings", 
          "luggage", 
          "celebration",
          "handyman", 
          "diversity-3", 
          "workspace-premium", 
          "security", 
          "groups", 
          "volunteer-activism", 
          "delivery-dining",
          "liquor", 
          "local-bar", 
      ]
      Generate a JSON response with the following structure:
      {
        "name": "Generated Group Name",
        "description": "Short description of the group purpose",
        "budgets": [
          { "name": "Budget Category", "limit": 500000, "icon": "icon-name", "color": "blue" }
        ]
      }
  
      Keep the response strictly in valid JSON format without extra text.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "system", content: aiPrompt }],
        temperature: 0.7,
      });

      console.log("🔍 AI Response:", response);

      let aiGeneratedData;
      try {
        aiGeneratedData = JSON.parse(response.choices[0].message.content);
      } catch (jsonError) {
        console.error("❌ JSON Parsing Error:", jsonError);
        throw new Error("AI response is not in valid JSON format");
      }
      const budgetsWithIds = (aiGeneratedData.budgets || []).map((budget) => ({
        _id: new ObjectId(),
        ...budget,
      }));

      const newGroup = {
        name: aiGeneratedData.name || "Default Group Name",
        description: aiGeneratedData.description || "No description provided",
        members: [
          {
            _id: ObjectId.createFromHexString(auth.id),
            name: auth.name,
            role: "Owner",
          },
        ],
        incomes: [],
        expenses: [],
        budgets: budgetsWithIds,
        invite: (Math.random() * 100000).toString(),
      };

      const result = await this.collection().insertOne(newGroup);
      if (!result.insertedId) throw new Error("Failed to create AI group");

      return { _id: result.insertedId, ...newGroup };
    } catch (error) {
      console.error("❌ AI Group Creation Failed:", error);
      throw new Error("AI failed to generate group");
    }
  }
}
