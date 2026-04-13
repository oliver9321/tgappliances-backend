import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  category: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, default: null },
  discount: { type: Number, default: 0 },
  image: { type: String },
  gallery: { type: [String] },
  quantity: { type: Number, default: 0 },
  priority: { type: Number, default: 0 },
  dateEndPublish: { type: String, default: null },
  active: { type: Boolean, default: true },
  dateCreation: { type: String },
  createdBy: { type: String },
})

export default mongoose.model('Product', productSchema)
