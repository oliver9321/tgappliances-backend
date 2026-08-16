/**
 * Migrates stored product image references to stable image URLs.
 *
 * Historical values point at the s3-public-presigner service, which generated
 * presigned URLs without the bucket name and therefore always returned 403.
 * This rewrites `image` and `gallery` to the stable /api/v1/images/... form
 * served by this API.
 *
 * Usage:
 *   node scripts/migrate-image-urls.mjs --dry-run    # report only, no writes
 *   node scripts/migrate-image-urls.mjs              # apply changes
 *
 * A JSON backup of every modified document's original values is written to
 * scripts/backups/ before anything is updated. Re-running is safe: the
 * transform is idempotent.
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import { toStableImagePath } from '../utils/imageUrl.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.argv.includes('--dry-run')

const uri = process.env.MONGO_MIGRATION_URL
  || (process.env.ENVIROMENT === 'dev' ? process.env.MONGO_PUBLIC_URL : process.env.MONGO_URL)

const dbName = process.env.MIGRATION_DB_NAME
  || (process.env.ENVIROMENT === 'dev' ? 'tgappliances-dev' : 'tgappliances-production')

if (!uri) {
  console.error('No MongoDB connection string. Set MONGO_MIGRATION_URL or MONGO_URL.')
  process.exit(1)
}

function mapGallery(gallery) {
  if (!Array.isArray(gallery)) return { value: gallery, changed: false }
  const next = gallery.filter(Boolean).map(toStableImagePath)
  const changed = next.length !== gallery.length
    || next.some((v, i) => v !== gallery[i])
  return { value: next, changed }
}

await mongoose.connect(uri, { dbName })
console.log(`Connected to ${dbName}${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`)

const products = await Product.find({}).lean()
console.log(`Scanning ${products.length} products\n`)

const backup = []
const planned = []

for (const p of products) {
  const changes = {}

  if (p.image) {
    const next = toStableImagePath(p.image)
    if (next !== p.image) changes.image = next
  }

  const gal = mapGallery(p.gallery)
  if (gal.changed) changes.gallery = gal.value

  if (Object.keys(changes).length === 0) continue

  planned.push({ id: p._id, title: p.title, changes })
  backup.push({
    _id: String(p._id),
    title: p.title,
    image: p.image,
    gallery: p.gallery,
  })
}

console.log(`${planned.length} document(s) need updating.\n`)

for (const item of planned) {
  console.log(`- ${(item.title || '(untitled)').slice(0, 40)}`)
  if (item.changes.image) console.log(`    image:   ${item.changes.image}`)
  if (item.changes.gallery) console.log(`    gallery: ${item.changes.gallery.length} item(s)`)
}

if (planned.length === 0) {
  console.log('\nNothing to do.')
  await mongoose.disconnect()
  process.exit(0)
}

if (DRY_RUN) {
  console.log('\nDry run complete. Re-run without --dry-run to apply.')
  await mongoose.disconnect()
  process.exit(0)
}

// Persist the backup before touching anything.
const backupDir = path.join(__dirname, 'backups')
fs.mkdirSync(backupDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupFile = path.join(backupDir, `products-images-${dbName}-${stamp}.json`)
fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
console.log(`\nBackup written: ${backupFile}`)

let updated = 0
for (const item of planned) {
  await Product.updateOne({ _id: item.id }, { $set: item.changes })
  updated++
}

console.log(`Updated ${updated} document(s).`)
await mongoose.disconnect()
console.log('Done.')
