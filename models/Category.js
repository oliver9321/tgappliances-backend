import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  active: { type: Boolean, default: true },
  dateCreation: { type: String },
  createdBy: { type: String },
})

export default mongoose.model('Category', categorySchema)
