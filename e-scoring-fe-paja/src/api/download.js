import client from './client'

// Unduh file (Excel/PDF) dari endpoint yang butuh JWT
export async function downloadFile(url, fallbackName = 'download') {
  const { data, headers } = await client.get(url, { responseType: 'blob' })
  const cd = headers['content-disposition'] || ''
  const match = cd.match(/filename="?([^";]+)"?/)
  const name = match ? match[1] : fallbackName

  const link = document.createElement('a')
  link.href = URL.createObjectURL(data)
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}
