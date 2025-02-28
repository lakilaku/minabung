import { ObjectId } from "mongodb";
import { database } from "../config/Mongodb.js";

export default class GroupModel {
  static collection() {
    return database.collection("groups");
  }

  static async getGroupById(id) {
    return await this.collection().findOne({ _id: id });
  }

  static async getGroupByUserId(userId) {
    return await this.collection().find({ members: userId }).toArray();
  }

  static async findGroupByInvite(invite) {
    return await this.collection().findOne({ invite: invite });
  }

  static async createGroup(auth, group) {
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
    if (result.insertedCount === 1) {
      throw new Error("Failed to create group");
    }
    return newGroup;
  }

  static async joinGroup(auth, invite) {
    const group = await this.findGroupByInvite(invite);
    if (!group) {
      throw new Error("Group not found");
    }
    if (
      group.members.some(
        (member) => member._id.toString() === auth.id.toString()
      )
    ) {
      throw new Error("You are already a member of this group");
    }
    const result = await this.collection().updateOne(
      { _id: group._id },
      {
        $push: {
          members: {
            _id: ObjectId.createFromHexString(auth.id),
            name: auth.name,
            role: "Member",
          },
        },
      }
    );
    return group;
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
    return group;
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
    return group;
  }

  static async addIncome(auth, groupId, name, note, amount, date) {
    const group = await this.getGroupById(groupId);
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
      name,
      note,
      amount,
      date,
    };
    const result = await this.collection().updateOne(
      { _id: groupId },
      { $push: { incomes: income } }
    );
    if (result.modifiedCount < 1) {
      throw new Error("Failed to add income");
    }
    return income;
  }

  static async updateIncome(auth, groupId, id, name, note, amount, date) {
    const group = await this.getGroupById(groupId);
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
      { _id: groupId, "incomes._id": id },
      {
        $set: {
          "incomes.$.name": name,
          "incomes.$.note": note,
          "incomes.$.amount": amount,
          "incomes.$.date": date,
        },
      }
    );
    if (result.modifiedCount < 1) {
      throw new Error("Failed to update income");
    }
  }

  static async deleteIncome(auth, groupId, id) {
    const group = await this.getGroupById(groupId);
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
      { _id: groupId },
      { $pull: { incomes: { _id: id } } }
    );
    if (result.modifiedCount < 1) {
      throw new Error("Failed to delete income");
    }
  }
}
