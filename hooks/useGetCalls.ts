import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';

export const useGetCalls = () => {
  const { user } = useUser();
  const client = useStreamVideoClient();
  const [calls, setCalls] = useState<Call[]>();
  const [isLoading, setIsLoading] = useState(false);

  const loadCalls = useCallback(async () => {
    if (!client || !user?.id) return;
    
    setIsLoading(true);

    try {
      // https://getstream.io/video/docs/react/guides/querying-calls/#filters
      const { calls } = await client.queryCalls({
        sort: [{ field: 'starts_at', direction: -1 }],
        filter_conditions: {
          starts_at: { $exists: true },
          $or: [
            { created_by_user_id: user.id },
            { members: { $in: [user.id] } },
          ],
        },
      });

      setCalls(calls);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [client, user?.id]);

  // Initial load
  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  // Set up polling to refresh call data every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadCalls();
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
  }, [loadCalls]);

  // Get current time for filtering
  const now = new Date();

  const endedCalls = calls?.filter(({ state: { startsAt, endedAt } }: Call) => {
    return (startsAt && new Date(startsAt) < now) || !!endedAt
  })

  const upcomingCalls = calls?.filter(({ state: { startsAt } }: Call) => {
    return startsAt && new Date(startsAt) > now
  })

  return { 
    endedCalls, 
    upcomingCalls, 
    callRecordings: calls, 
    isLoading,
    refreshCalls: loadCalls // Expose refresh function for manual refresh
  }
};