import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProductById } from './controllers/products.controller.js'

// Mock the Product model
vi.mock('./models/Product.js', () => ({
  default: {
    findById: vi.fn(),
  },
}))

// Helper: build minimal mock req/res objects
function makeReqRes(id) {
  const req = { params: { id } }
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(data) {
      this.body = data
      return this
    },
  }
  return { req, res }
}

describe('getProductById controller', () => {
  let Product

  beforeEach(async () => {
    vi.clearAllMocks()
    // Import the mocked module to control its behaviour per test
    const mod = await import('./models/Product.js')
    Product = mod.default
  })

  it('returns 200 and the full product JSON when a valid existing ObjectId is provided', async () => {
    const fakeProduct = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Fridge A',
      category: 'Refrigerators',
      price: 299,
      active: true,
    }
    Product.findById.mockResolvedValue(fakeProduct)

    const { req, res } = makeReqRes('507f1f77bcf86cd799439011')
    await getProductById(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(fakeProduct)
  })

  it('returns 404 when a valid ObjectId does not exist in the database', async () => {
    Product.findById.mockResolvedValue(null)

    const { req, res } = makeReqRes('507f1f77bcf86cd799439012')
    await getProductById(req, res)

    expect(res.statusCode).toBe(404)
    expect(res.body).toHaveProperty('message')
  })

  it('returns 400 when the ObjectId format is invalid', async () => {
    const castError = new Error('Cast to ObjectId failed')
    castError.name = 'CastError'
    Product.findById.mockRejectedValue(castError)

    const { req, res } = makeReqRes('not-a-valid-id')
    await getProductById(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.body).toHaveProperty('message')
  })
})
