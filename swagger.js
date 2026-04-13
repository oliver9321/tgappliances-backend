import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TG Pre-Owned Appliances — Admin API',
      version: '1.0.0',
      description: 'REST API for the TG Admin Panel. Authenticate via POST /auth/login to get a JWT, then use the Authorize button.',
    },
    servers: [
      { url: '/api/v1', description: 'Current server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Category: {
          type: 'object',
          properties: {
            _id:          { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
            name:         { type: 'string', example: 'Refrigerators' },
            description:  { type: 'string', example: 'All fridge models' },
            active:       { type: 'boolean', example: true },
            dateCreation: { type: 'string', format: 'date-time' },
            createdBy:    { type: 'string', example: 'admin' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            _id:            { type: 'string' },
            category:       { type: 'string', description: '_id of the Category' },
            title:          { type: 'string', example: 'Samsung 18cu ft Fridge' },
            description:    { type: 'string' },
            price:          { type: 'number', nullable: true, example: 299.99 },
            discount:       { type: 'integer', minimum: 0, maximum: 100, example: 10 },
            image:          { type: 'string', format: 'uri' },
            gallery:        { type: 'array', items: { type: 'string', format: 'uri' } },
            quantity:       { type: 'integer', minimum: 0, example: 5 },
            priority:       { type: 'integer', example: 1 },
            dateEndPublish: { type: 'string', format: 'date-time', nullable: true },
            active:         { type: 'boolean', example: true },
            dateCreation:   { type: 'string', format: 'date-time' },
            createdBy:      { type: 'string', example: 'admin' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id:          { type: 'string' },
            name:         { type: 'string', example: 'John Doe' },
            username:     { type: 'string', example: 'johndoe' },
            role:         { type: 'string', example: 'admin' },
            active:       { type: 'boolean', example: true },
            dateCreation: { type: 'object' },
            createdBy:    { type: 'string', example: 'system' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      // ── Auth ──────────────────────────────────────────────
      '/auth/setup': {
        post: {
          tags: ['Auth'],
          summary: 'Bootstrap — create the first admin user',
          description: '**Only works when there are zero users in the database.** Once any user exists, this endpoint returns 403. No authentication required.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'username', 'password'],
                  properties: {
                    name:     { type: 'string', example: 'Admin TG' },
                    username: { type: 'string', example: 'admin' },
                    password: { type: 'string', example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Admin user created', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
            400: { description: 'Missing required fields' },
            403: { description: 'Setup already completed (users exist)' },
            409: { description: 'Username already in use' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and get JWT',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password'],
                  properties: {
                    username: { type: 'string', example: 'admin' },
                    password: { type: 'string', example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      name:     { type: 'string' },
                      role:     { type: 'string' },
                      token:    { type: 'string' },
                    },
                  },
                },
              },
            },
            401: { description: 'Invalid credentials or inactive account', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ── Categories ────────────────────────────────────────
      '/categories': {
        get: {
          tags: ['Categories'],
          summary: 'List all categories',
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } } },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          tags: ['Categories'],
          summary: 'Create a category',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'active'],
                  properties: {
                    name:        { type: 'string', example: 'Washers' },
                    description: { type: 'string' },
                    active:      { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/categories/{id}': {
        put: {
          tags: ['Categories'],
          summary: 'Update a category',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name:        { type: 'string' },
                    description: { type: 'string' },
                    active:      { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } },
            401: { description: 'Unauthorized' },
            404: { description: 'Not found' },
          },
        },
      },

      // ── Products ──────────────────────────────────────────
      '/products/by-category/{category}': {
        get: {
          tags: ['Products'],
          summary: 'Get active products by category, sorted by priority desc',
          description: 'Public endpoint — no auth required. Use `all` as category to get all active products.',
          security: [],
          parameters: [
            {
              name: 'category',
              in: 'path',
              required: true,
              description: '_id of the category, or "all" for every active product',
              schema: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
            },
          ],
          responses: {
            200: {
              description: 'List of active products sorted by category + priority',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } },
            },
            500: { description: 'Server error' },
          },
        },
      },
      '/products': {
        get: {
          tags: ['Products'],
          summary: 'List all products',
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } } },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          tags: ['Products'],
          summary: 'Create a product',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['category', 'title'],
                  properties: {
                    category:       { type: 'string' },
                    title:          { type: 'string' },
                    description:    { type: 'string' },
                    price:          { type: 'number', nullable: true },
                    discount:       { type: 'integer', minimum: 0, maximum: 100 },
                    image:          { type: 'string' },
                    gallery:        { type: 'array', items: { type: 'string' } },
                    quantity:       { type: 'integer', minimum: 0 },
                    priority:       { type: 'integer' },
                    dateEndPublish: { type: 'string', nullable: true },
                    active:         { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
            400: { description: 'Validation error' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/products/{id}': {
        put: {
          tags: ['Products'],
          summary: 'Update a product',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', description: 'Any updatable product fields' },
              },
            },
          },
          responses: {
            200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
            401: { description: 'Unauthorized' },
            404: { description: 'Not found' },
          },
        },
      },

      // ── Users ─────────────────────────────────────────────
      '/users': {
        get: {
          tags: ['Users'],
          summary: 'List all users (password excluded)',
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          tags: ['Users'],
          summary: 'Create a user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'username', 'role', 'password'],
                  properties: {
                    name:     { type: 'string', example: 'Jane Admin' },
                    username: { type: 'string', example: 'jane' },
                    role:     { type: 'string', example: 'admin' },
                    password: { type: 'string', example: 'secret123' },
                    active:   { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            401: { description: 'Unauthorized' },
            409: { description: 'Username already in use' },
          },
        },
      },
      '/users/{id}': {
        put: {
          tags: ['Users'],
          summary: 'Update a user',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name:     { type: 'string' },
                    username: { type: 'string' },
                    role:     { type: 'string' },
                    password: { type: 'string', description: 'Omit to keep existing hash' },
                    active:   { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            401: { description: 'Unauthorized' },
            404: { description: 'Not found' },
          },
        },
      },

      // ── Upload ────────────────────────────────────────────
      '/upload/image': {
        post: {
          tags: ['Upload'],
          summary: 'Upload a single image to S3',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'URL of uploaded image', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' } } } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/upload/gallery': {
        post: {
          tags: ['Upload'],
          summary: 'Upload multiple images to S3',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    files: { type: 'array', items: { type: 'string', format: 'binary' } },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'URLs of uploaded images', content: { 'application/json': { schema: { type: 'object', properties: { urls: { type: 'array', items: { type: 'string' } } } } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },
    },
  },
  apis: [],
}

export const swaggerSpec = swaggerJsdoc(options)
