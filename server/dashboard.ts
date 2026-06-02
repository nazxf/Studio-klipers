import { JobStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round((seconds % 60) * 10) / 10;

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toFixed(remainingSeconds % 1 === 0 ? 0 : 1)
    .padStart(2, "0")}`;
}

export async function getDashboardStats(userId: string) {
  const [videoCount, clipCount, processingCount, readyClipCount] = await prisma.$transaction([
    prisma.video.count({
      where: { userId },
    }),
    prisma.clip.count({
      where: { userId },
    }),
    prisma.processingJob.count({
      where: {
        userId,
        status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
      },
    }),
    prisma.clip.count({
      where: {
        userId,
        status: "COMPLETED",
      },
    }),
  ]);

  return {
    videoCount,
    clipCount,
    processingCount,
    readyClipCount,
  };
}

export async function getRecentProcessingJobs(userId: string) {
  const jobs = await prisma.processingJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      status: true,
      progress: true,
      createdAt: true,
      video: {
        select: {
          title: true,
          fileName: true,
        },
      },
      clip: {
        select: {
          title: true,
          startSeconds: true,
          endSeconds: true,
        },
      },
    },
  });

  return jobs.map((job) => ({
    id: job.id,
    title: job.clip?.title ?? job.video.title ?? job.video.fileName,
    detail: job.clip
      ? `${formatSeconds(job.clip.startSeconds)} to ${formatSeconds(job.clip.endSeconds)}`
      : "Clip range not assigned yet",
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt.toISOString(),
  }));
}
