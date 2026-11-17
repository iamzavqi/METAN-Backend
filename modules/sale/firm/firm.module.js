const {Schema, model} = require("mongoose")

const firmModel = new Schema(
	{
		firmName: {type: String, required: true},
		inn: {type: String, required: true},
		balance: {type: Number, default: 0},
    userId: { type: Schema.ObjectId, ref: "User", required: true }, 
		companyId: { type: Schema.ObjectId, ref: "Company", required: true },
	},
	{timestamps: true}
)

module.exports = model("Firm", firmModel)