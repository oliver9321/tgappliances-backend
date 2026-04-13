import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  password: { type: String, required: true },
  active: { type: Boolean, default: true },
  dateCreation: { type: Object },
  createdBy: { type: String },
})

export default mongoose.model('User', userSchema)
