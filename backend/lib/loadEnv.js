import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load backend/.env (ignored by git — copy from .env.example)
dotenv.config({ path: path.join(__dirname, '../.env') })
