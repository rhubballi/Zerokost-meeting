'use client';

import { useUser } from '@clerk/nextjs';
import { StreamChat } from 'stream-chat';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type StreamChatType = StreamChat | null;

export const useStreamChatClient = () => {
  const { user } = useUser();
  const [chatClient, setChatClient] = useState<StreamChatType>(null);
  const searchParams = useSearchParams();
  const meetingId = searchParams.get('id') || '';

  useEffect(() => {
    if (!user?.id) return;

    const initChat = async () => {
      try {
        // Initialize the Stream Chat client with your API key
        const client = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_KEY!);

        // Connect the user to Stream Chat
        await client.connectUser(
          {
            id: user.id,
            name: user.fullName || user.username || user.id,
            image: user.imageUrl,
          },
          client.devToken(user.id)
        );

        // Create a channel for the meeting
        if (meetingId) {
          const channelId = `meeting-chat-${meetingId}`;
          const channel = client.channel('messaging', channelId, {
            name: `Meeting Chat ${meetingId}`,
            // Don't specify members to allow anyone to join
          });

          // Use watch() to join an existing channel or create it if it doesn't exist
          await channel.watch();
        }

        setChatClient(client);
      } catch (error) {
        console.error('Error initializing chat client:', error);
      }
    };

    initChat();

    // Cleanup function to disconnect the user when the component unmounts
    return () => {
      if (chatClient) {
        chatClient.disconnectUser();
      }
    };
  }, [user, meetingId, chatClient]);

  return chatClient;
};