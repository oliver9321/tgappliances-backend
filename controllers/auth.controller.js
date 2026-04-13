import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export async function login(req, res) {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(401).json({ message: 'Credenciales inválidas' })
  }

  try {
    const user = await User.findOne({ username })

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    if (user.active === false) {
      return res.status(401).json({ message: 'Cuenta inactiva' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const token = jwt.sign(
      { username: user.username, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({
      username: user.username,
      name: user.name,
      role: user.role,
      token,
    })
    
  } catch (err) {
    console.error('[login]', err)
    return res.status(500).json({ message: 'Error interno del servidor', detail: err.message })
  }
}

/**
 * Bootstrap: creates the first admin user.
 * Only works when there are NO users in the database.
 * Once any user exists, this endpoint returns 403.
 */
export async function setup(req, res) {
  try {
    const count = await User.countDocuments()
    if (count > 0) {
      return res.status(403).json({ message: 'Setup ya fue completado. Este endpoint está deshabilitado.' })
    }

    const { name, username, password } = req.body
    if (!name || !username || !password) {
      return res.status(400).json({ message: 'Los campos name, username y password son obligatorios' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({
      name,
      username,
      role: 'admin',
      password: hashedPassword,
      active: true,
      dateCreation: { $date: new Date().toISOString() },
      createdBy: 'system',
    })

    const saved = await user.save()
    const result = saved.toObject()
    delete result.password

    return res.status(201).json({ message: 'Usuario admin creado correctamente', user: result })
  } catch (err) {
    console.error('[setup]', err)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'El username ya está en uso' })
    }
    return res.status(500).json({ message: 'Error interno del servidor', detail: err.message })
  }
}
