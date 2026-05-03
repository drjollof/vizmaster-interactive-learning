'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

export async function saveProgressToCloud(exerciseId: string) {
  const { userId } = await auth();
  if (!userId) return;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  
  const completed = (user.publicMetadata.completedExercises as string[]) || [];
  
  if (!completed.includes(exerciseId)) {
    const updated = [...completed, exerciseId];
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { completedExercises: updated }
    });
  }
}

export async function getProgressFromCloud(): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  
  return (user.publicMetadata.completedExercises as string[]) || [];
}
