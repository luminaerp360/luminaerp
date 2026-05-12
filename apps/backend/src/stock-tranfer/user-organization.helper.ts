export async function checkUserOrganizationAccess(
  prisma: any,
  userId: number,
  organizationId: number,
): Promise<boolean> {
  const access = await prisma.userOrganizationAccess.findFirst({
    where: {
      userId,
      organizationId,
      isActive: true,
    },
  });
  return !!access;
}
