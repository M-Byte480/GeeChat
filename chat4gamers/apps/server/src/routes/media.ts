import {Hono} from 'hono'
import {db} from '../db/index.js'
import {authenticate, checkUserCanAccessMedia} from '../lib/authentication.js'
import {eq} from 'drizzle-orm'
import {media, members, users} from '../db/schema.js' // Import your db instance
import {writeFile} from 'fs/promises'
import {Buffer} from 'buffer'
import {createReadStream} from 'fs'
import {Readable} from 'stream'
import {requireAuth} from '../lib/middleware.js'

const app = new Hono()

app.post('/upload', requireAuth, async (c) => {
    const file = await c.req.formData()
    const image = file.get('file') as File

    // Validate mime type + size before saving
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!allowed.includes(image.type)) throw new Error('Invalid file type')
    if (image.size > 10 * 1024 * 1024) throw new Error('File too large') // 10MB cap

    const filename = `${crypto.randomUUID()}.${image.type.split('/')[1]}`
    const path = `./uploads/media/${filename}`

    await writeFile(path, Buffer.from(await image.arrayBuffer()))

    const url = `${filename}`
    const userPublicKey = ''

    // Save to DB
    await db.insert(media).values({
        uploaderKey: userPublicKey,
        url,
        mimeType: image.type,
        sizeBytes: image.size,
        context: 'message',
    })

    return c.json({url})
})

app.get('/uploads/:filename', requireAuth, async (c) => {
    const user = await authenticate(c) // verify their session/token

    if (!user) return c.json({error: 'Unauthorized'}, 401)
    const url = c.req.param('filename')

    const mediaRecord = await db.query.media.findFirst({
        where: eq(media.url, url),
    })

    if (!mediaRecord) return c.json({error: 'Not found'}, 404)

    const hasAccess = await checkUserCanAccessMedia('user.publicKey', mediaRecord)
    if (!hasAccess) return c.json({error: 'Forbidden'}, 403)

    // Stream the file
    const stream = createReadStream(`./uploads/media/${url}`)
    return new Response(Readable.toWeb(stream) as ReadableStream)
})

app.get('/users/:publicKey/avatar', requireAuth, async (c) => {
    const publicKey = c.req.param('publicKey')

    const user = db
        .select({pfp: users.pfp})
        .from(users)
        .where(eq(users.publicKey, publicKey))
        .get()

    if (!user) return c.json({error: 'User not found'}, 404)

    return c.json({pfp: user.pfp ?? null})
})

app.get('/users/:publicKey', requireAuth, async (c) => {
    const publicKey = c.req.param('publicKey')

    const result = db
        .select({
            publicKey: users.publicKey,
            username: users.username,
            pfp: users.pfp,
            nickname: members.nickname,
            role: members.role,
            status: members.status,
        })
        .from(users)
        .innerJoin(members, eq(members.userPublicKey, users.publicKey))
        .where(eq(users.publicKey, publicKey))
        .get()

    if (!result) return c.json({error: 'User not found'}, 404)

    return c.json(result)
})

export default app
