import bcrypt from 'bcryptjs'
import User from '../models/User.js'

export async function getUsers(req, res) {
  try {
    const users = await User.find().select('-password')
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: err.message })
  }
}

export async function createUser(req, res) {
  try {
    const { name, username, role, password, active } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({
      name,
      username,
      role,
      password: hashedPassword,
      active,
      dateCreation: { $date: new Date().toISOString() },
      createdBy: req.user.username,
    })
    const saved = await user.save()
    const result = saved.toObject()
    delete result.password
    res.status(201).json(result)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'El username ya está en uso' })
    }
    res.status(500).json({ message: 'Error al crear usuario', error: err.message })
  }
}

export async function updateUser(req, res) {
  try {
    const { name, username, role, active, password } = req.body
    const updateData = { name, username, role, active }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password')

    if (!updated) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: err.message })
  }
}
