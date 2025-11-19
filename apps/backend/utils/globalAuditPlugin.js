const mongoose = require("mongoose");
const Audit = require("../models/auditModel");
const { getCurrentUser } = require("./auditContext");

function safeBranch(branch) {
  return mongoose.isValidObjectId(branch) ? branch : null;
}

function globalAuditPlugin(schema) {
  console.log("⚙️ Audit plugin attached →", schema.modelName);

  // CREATE
  schema.post("save", async function (doc) {
    try {
      const ctx = getCurrentUser() || {};
      const user = ctx.user || {};

      await Audit.create({
        collectionName: this.constructor.modelName,
        action: "create",
        modifiedBy: user._id || null,
        branch: safeBranch(user.branch),
        before: null,
        after: doc.toObject(),
        method: ctx.method || null,
        route: ctx.route || null,
        ip: ctx.ip || null,
      });

      console.log("🟢 AUDIT → CREATE →", this.constructor.modelName);
    } catch (err) {
      console.error("❌ AUDIT CREATE ERROR:", err.message);
    }
  });

  // UPDATE
  schema.pre("findOneAndUpdate", async function () {
    this._oldDoc = await this.model.findOne(this.getQuery()).lean();
  });

  schema.post("findOneAndUpdate", async function (res) {
    try {
      if (!res) return;

      const ctx = getCurrentUser() || {};
      const user = ctx.user || {};

      const beforeObj = this._oldDoc;
      const afterObj = res.toObject ? res.toObject() : res;

      await Audit.create({
        collectionName: this.model.modelName,
        action: "update",
        modifiedBy: user._id || null,
        branch: safeBranch(user.branch),
        before: beforeObj,
        after: afterObj,
        method: ctx.method || null,
        route: ctx.route || null,
        ip: ctx.ip || null,
      });

      console.log("🟢 AUDIT → UPDATE →", this.model.modelName);
    } catch (err) {
      console.error("❌ AUDIT UPDATE ERROR:", err.message);
    }
  });

  // DELETE
  schema.pre("findOneAndDelete", async function () {
    this._oldDoc = await this.model.findOne(this.getQuery()).lean();
  });

  schema.post("findOneAndDelete", async function (res) {
    try {
      if (!res) return;

      const ctx = getCurrentUser() || {};
      const user = ctx.user || {};

      await Audit.create({
        collectionName: this.model.modelName,
        action: "delete",
        modifiedBy: user._id || null,
        branch: safeBranch(user.branch),
        before: this._oldDoc,
        after: null,
        method: ctx.method || null,
        route: ctx.route || null,
        ip: ctx.ip || null,
      });

      console.log("🟢 AUDIT → DELETE →", this.model.modelName);
    } catch (err) {
      console.error("❌ AUDIT DELETE ERROR:", err.message);
    }
  });
}

module.exports = { globalAuditPlugin };
