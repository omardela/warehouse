"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";

export type CategoryActionState =
  | { success: true; categoryId: string }
  | { error: string }
  | null;

const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Name must be 100 characters or fewer"),
});

export async function createCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const parsed = createCategorySchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.name?.[0] ?? "Invalid input" };
  }

  const { name } = parsed.data;

  const existing = await db.productCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, organizationId: session.orgId },
    select: { id: true },
  });

  if (existing) {
    return { error: `A category named "${name}" already exists.` };
  }

  const category = await db.productCategory.create({
    data: { name, organizationId: session.orgId },
    select: { id: true },
  });

  revalidatePath("/dashboard/products/categories");
  revalidatePath("/dashboard/products");

  return { success: true, categoryId: category.id };
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const categoryId = formData.get("categoryId") as string;
  if (!categoryId) return;

  const existing = await db.productCategory.findFirst({
    where: { id: categoryId, organizationId: session.orgId },
    include: { _count: { select: { products: true } } },
  });

  if (!existing || existing._count.products > 0) return;

  await db.productCategory.delete({ where: { id: categoryId } });

  revalidatePath("/dashboard/products/categories");
  revalidatePath("/dashboard/products");
}
