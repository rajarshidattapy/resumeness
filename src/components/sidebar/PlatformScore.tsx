import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { getCurrentUserId } from '@/lib/db/knowledgeBaseDb';
import { fetchPlatformScore } from '@/lib/api/quiz';

export const PlatformScore = () => {
  const [data, setData] = useState<{ platformScore: number; itemsVerified: number } | null>(null);
  const userId = getCurrentUserId();

  useEffect(() => {
    if (!userId) return;
    fetchPlatformScore(userId).then(setData).catch(() => setData(null));
  }, [userId]);

  if (!userId || !data || data.itemsVerified === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
      <Trophy className="w-3.5 h-3.5 text-primary" />
      <span className="text-xs text-foreground">
        <span className="font-semibold">{data.platformScore}</span> platform score
        <span className="text-muted-foreground"> · {data.itemsVerified} verified</span>
      </span>
    </div>
  );
};
