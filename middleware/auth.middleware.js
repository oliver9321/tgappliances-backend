import jwt from 'jsonwebtoken'

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token requerido' })
  }

  const token = authHeader.slice(7)

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' })
  }

  if (payload.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: se requiere rol admin' })
  }

  req.user = { username: payload.username, role: payload.role }
  next()
}
