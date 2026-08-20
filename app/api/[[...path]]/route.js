import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

let client
let db
async function database() { if (!client) { client = new MongoClient(process.env.MONGO_URL); await client.connect(); db = client.db(process.env.DB_NAME || undefined) } return db }
const cors = (response) => { response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*'); response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS'); response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); return response }
export async function OPTIONS() { return cors(new NextResponse(null, { status: 204 })) }
async function handler(request, { params }) {
  const path = (await params)?.path || []
  const route = `/${path.join('/')}`
  try {
    const databaseRef = await database()
    if (route === '/' || route === '/root') return cors(NextResponse.json({ message: 'Zalio ERP API aktif' }))
    if (route === '/products' && request.method === 'GET') { const rows = await databaseRef.collection('products').find({}).sort({ createdAt: -1 }).toArray(); return cors(NextResponse.json(rows.map(({ _id, ...row }) => row))) }
    if (route === '/products' && request.method === 'POST') { const body = await request.json(); if (!body.name?.trim()) return cors(NextResponse.json({ error: 'Nama produk wajib diisi' }, { status: 400 })); const product = { id: uuidv4(), name: body.name.trim(), brand: body.brand || '', category: body.category || '', price: Number(body.price || 0), cost: Number(body.cost || 0), active: body.active !== false, createdAt: new Date() }; await databaseRef.collection('products').insertOne(product); return cors(NextResponse.json(product, { status: 201 })) }
    const productMatch = route.match(/^\/products\/([^/]+)$/)
    if (productMatch && ['PATCH', 'PUT'].includes(request.method)) { const body = await request.json(); const update = {}; ['name', 'brand', 'category', 'active', 'price', 'cost'].forEach(key => { if (body[key] !== undefined) update[key] = ['price', 'cost'].includes(key) ? Number(body[key]) : body[key] }); const result = await databaseRef.collection('products').findOneAndUpdate({ id: productMatch[1] }, { $set: update }, { returnDocument: 'after' }); const updated = result?.value || result; if (!updated) return cors(NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })); const { _id, ...clean } = updated; return cors(NextResponse.json(clean)) }
    if (productMatch && request.method === 'DELETE') { const result = await databaseRef.collection('products').deleteOne({ id: productMatch[1] }); return cors(NextResponse.json({ deleted: result.deletedCount === 1 })) }
    return cors(NextResponse.json({ error: `Route ${route} tidak ditemukan` }, { status: 404 }))
  } catch (error) { console.error('API Error:', error); return cors(NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })) }
}
export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler