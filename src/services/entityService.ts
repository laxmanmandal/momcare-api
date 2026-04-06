import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'

// entityTables
export async function creatEntityTable(data: any) {
  console.log({
    name: data.name,
    type: data.type,
    email: data.email,
    phone: data.phone,
    location: data.location,
    description: data.description,
    imageUrl: data.imageUrl ?? null,
    isActive: data.isActive ?? true,
    belongsToId: data.belongsToId || 1,
    createdBy: data.createdBy || undefined,
  });

  return await prisma.entityTable.create({
    data: {
      name: data.name,
      type: data.type,
      email: data.email,
      phone: data.phone,
      location: data.location,
      description: data.description,
      imageUrl: data.imageUrl ?? null,
      isActive: data.isActive ?? true,
      belongsToId: data.belongsToId || 1,
      createdBy: data.createdBy || undefined,
    },

  });
}


// Partners
export async function getPartnerEntity(id: number) {
  return prisma.entityTable.findMany({
    where: { belongsToId: id, type: 'Partner' },
    include: {
      createdByUser: { select: { id: true, name: true } },
      belongsToEntity: { select: { id: true, name: true } },
      users: true
    }
  })
}
// channel
export async function getChannelEntity(id: number) {
  return prisma.entityTable.findMany({
    where: { belongsToId: id, type: 'Channel' },
    include: {
      createdByUser: { select: { id: true, name: true } },
      belongsToEntity: { select: { id: true, name: true } },
      users: true
    }
  })
}
export async function getAllentities(id: number) {
  return prisma.entityTable.findMany({
    where: { belongsToId: id },
    include: {
      createdByUser: { select: { id: true, name: true } },
      belongsToEntity: { select: { id: true, name: true } },
      users: true
    }
  })
}
export async function getentityTableById(id: number) {

  const user = await prisma.entityTable.findUnique({
    where: { id }, include: {
      createdByUser: { select: { id: true, name: true } },
      belongsToEntity: { select: { id: true, name: true } },
      users: true
    }
  })
  if (!user) throw new Error('entityTable not found')
  return user

}

export async function updateEntityTable(id: number, data: any) {


  const existing = await prisma.entityTable.findUnique({ where: { id } });

  if (!existing) {
    throw { statusCode: 404, message: 'entityTable not found' };
  }

  if (data.imageUrl && existing.imageUrl && existing.imageUrl !== data.imageUrl) {
    await deleteFileIfExists(existing.imageUrl);
  }

  return await prisma.entityTable.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      type: data.type ?? existing.type,
      email: data.email ?? existing.email,
      phone: data.phone ?? existing.phone,
      location: data.location ?? existing.location,
      description: data.descrition ?? existing.description,
      imageUrl: data.imageUrl ?? existing.imageUrl,
      isActive:
        data.isActive === undefined ? existing.isActive : Boolean(data.isActive)
    },

  });
}


