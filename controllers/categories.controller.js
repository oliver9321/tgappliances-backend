import Category from '../models/Category.js'

// Public — returns all categories (frontend filters active ones client-side)
export async function getPublicCategories(req, res) {
  try {
    const categories = await Category.find();
    
    if (!categories) {
      return res.status(404).json({ message: 'No hay categorías disponibles' })
    }
    
    res.json(categories)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener categorías', error: err.message })
  }
}

// Admin — same but protected
export async function getCategories(req, res) {
  try {
    const categories = await Category.find()
    res.json(categories)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener categorías', error: err.message })
  }
}

export async function createCategory(req, res) {
  try {
    const { name, description, active } = req.body
    const category = new Category({
      name,
      description,
      active,
      dateCreation: new Date().toISOString(),
      createdBy: req.user.username,
    })
    const saved = await category.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(500).json({ message: 'Error al crear categoría', error: err.message })
  }
}

export async function updateCategory(req, res) {
  try {
    const { name, description, active } = req.body
    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, active },
      { new: true, runValidators: true }
    )
    if (!updated) {
      return res.status(404).json({ message: 'Categoría no encontrada' })
    }
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar categoría', error: err.message })
  }
}
