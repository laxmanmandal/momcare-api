import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'

export async function getConceive(type: string) {
  return prisma.concieve.findMany({
    select: {
      id: true,
      week: true,
      title: true,
      subtitle: true,
      type: true,
      description: true,
      thumbnail: true,
      image: true,
      height: true,
      weight: true,
      created_at: true,
      updated_at: true,
    },
    where: { type },
    take: 50,
    orderBy: { created_at: 'desc' }
  });
}
export async function getConceiveById(id: number) {
  return await prisma.concieve.findUnique({ where: { id } },
  )
}
export async function createConceive(data: any) {
  return prisma.concieve.create({ data })
}

export async function updateConceive(id: number, data: any) {
  const existing = await prisma.concieve.findUnique({ where: { id } })
  if (!existing) throw new Error('trying to conceive resourse not found')

  if (data.thumbnail && existing.thumbnail && existing.thumbnail !== data.thumbnail) {
    await deleteFileIfExists(existing.thumbnail)
  }
  if (data.image && existing.image && existing.image !== data.image) {
    await deleteFileIfExists(existing.image)
  }
  return prisma.concieve.update({ where: { id }, data })
}



