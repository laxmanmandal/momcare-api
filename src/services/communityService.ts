import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'

export async function getCommunity() {
  return prisma.community.findMany({
    include: {
      _count: {
        select: {
          posts: true,
          members: true,
        }
      }
    }
  });
}

export async function getCommunityById(id: number) {
  return await prisma.community.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          posts: true,
          members: true,
        }
      }
    }
  },
  )
}
export async function createCommunity(data: any) {
  return prisma.community.create({ data })
}

export async function updateCommunity(id: any, data: any) {
  const existing = await prisma.community.findUnique({ where: { id } })
  if (!existing) throw new Error('community not found')

  if (data.imageUrl && existing.imageUrl && existing.imageUrl !== data.imageUrl) {
    await deleteFileIfExists(existing.imageUrl)
  }

  return prisma.community.update({ where: { id }, data })
}

export async function CommunityStatus(id: number) {
  const tips = await prisma.community.findUnique({ where: { id } });
  if (!tips) throw new Error("Community not found");

  return prisma.community.update({
    where: { id },
    data: { isActive: !tips.isActive },
  });
}
export async function handleCommunityJoin({ communityId, userId }: {
  communityId: number,
  userId: number
}) {
  const existing = await prisma.communityJoin.findFirst({
    where: { communityId, userId }
  });

  if (existing) {
    await prisma.communityJoin.delete({ where: { id: existing.id } });

    return {
      success: true,
      subscribed: false,
      message: "Unsubscribed from the community"
    };
  }

  const created = await prisma.communityJoin.create({
    data: { communityId, userId }
  });

  return {
    success: true,
    subscribed: true,
    message: "Subscribed to the community",
    data: created
  };
}
