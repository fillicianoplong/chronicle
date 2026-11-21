import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { preview } from 'vite'

const dir = mkdtempSync(path.join(tmpdir(), 'chronicle-tls-'))
const keyPath = path.join(dir, 'key.pem')
const certPath = path.join(dir, 'cert.pem')

execFileSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-keyout',
    keyPath,
    '-out',
    certPath,
    '-days',
    '2',
    '-nodes',
    '-subj',
    '/CN=127.0.0.1',
    '-addext',
    'subjectAltName=IP:127.0.0.1,DNS:localhost',
  ],
  { stdio: 'ignore' },
)

const port = Number(process.env.PORT ?? 4173)
const server = await preview({
  preview: {
    host: '127.0.0.1',
    port,
    strictPort: true,
    https: {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
    },
  },
})

const urls = server.resolvedUrls?.local ?? []
console.log(urls.join('\n'))
