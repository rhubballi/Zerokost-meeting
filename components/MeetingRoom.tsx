'use client';
import { useState, useEffect } from 'react';
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from '@stream-io/video-react-sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, LayoutList, MessageSquare, X } from 'lucide-react';
import { Chat, Channel, ChannelHeader, MessageInput, MessageList, Window } from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Loader from './Loader';
import EndCallButton from './EndCallButton';
import { cn } from '@/lib/utils';
import { useStreamChatClient } from '@/hooks/useStreamChatClient';

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom = () => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const meetingId = searchParams.get('id') || '';
  const router = useRouter();
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const { useCallCallingState } = useCallStateHooks();
  const call = useCall();
  const chatClient = useStreamChatClient();
  const [channelId, setChannelId] = useState('');

  useEffect(() => {
    if (meetingId) {
      setChannelId(`meeting-chat-${meetingId}`);
    }
  }, [meetingId]);

  // for more detail about types of CallingState see: https://getstream.io/video/docs/react/ui-cookbook/ringing-call/#incoming-call-panel
  const callingState = useCallCallingState();

  if (callingState !== CallingState.JOINED) return <Loader />;

  const CallLayout = () => {
    switch (layout) {
      case 'grid':
        return <PaginatedGridLayout />;
      case 'speaker-right':
        return <SpeakerLayout participantsBarPosition="left" />;
      default:
        return <SpeakerLayout participantsBarPosition="right" />;
    }
  };

  return (
    <section className="relative h-screen w-full overflow-hidden pt-4 text-white">
      <div className="relative flex size-full items-center justify-center">
        <div className=" flex size-full max-w-[1000px] items-center">
          <CallLayout />
        </div>
        <div
          className={cn('h-[calc(100vh-86px)] ml-2', {
            'show-block': showParticipants,
            'hidden': !showParticipants
          })}
        >
          <CallParticipantsList onClose={() => setShowParticipants(false)} />
        </div>
        <div 
          className={cn('h-[calc(100vh-86px)] w-80 ml-2 bg-white text-black rounded-md overflow-hidden relative', {
            'show-block': showChat,
            'hidden': !showChat
          })}
        >
          {showChat && chatClient && channelId && (
            <>
              <button 
                onClick={() => setShowChat(false)}
                className="absolute top-2 right-2 z-10 bg-gray-200 rounded-full p-1"
              >
                <X size={16} className="text-gray-700" />
              </button>
              <Chat client={chatClient} theme="messaging light">
                <Channel channel={chatClient.channel('messaging', channelId)}>
                  <Window>
                    <ChannelHeader title="Meeting Chat" />  
                    <MessageList />  
                    <MessageInput focus />  
                  </Window>
                </Channel>
              </Chat>
            </>
          )}
        </div>
      </div>
      {/* video layout and call controls */}
      <div className="fixed bottom-0 flex w-full items-center justify-center gap-5">
        <CallControls 
          onLeave={() => {
            // Ensure camera and microphone are turned off when leaving
            if (call) {
              const localParticipant = call.state.localParticipant;
              if (localParticipant) {
                // Turn off camera
                if (localParticipant.publishedTracks.includes('camera')) {
                  localParticipant.setCameraEnabled(false);
                }
                // Turn off microphone
                if (localParticipant.publishedTracks.includes('microphone')) {
                  localParticipant.setMicrophoneEnabled(false);
                }
              }
            }
            router.push(`/`);
          }} 
        />

        <DropdownMenu>
          <div className="flex items-center">
            <DropdownMenuTrigger className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]  ">
              <LayoutList size={20} className="text-white" />
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent className="border-dark-1 bg-dark-1 text-white">
            {['Grid', 'Speaker-Left', 'Speaker-Right'].map((item, index) => (
              <div key={index}>
                <DropdownMenuItem
                  onClick={() =>
                    setLayout(item.toLowerCase() as CallLayoutType)
                  }
                >
                  {item}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-dark-1" />
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <CallStatsButton />
        <button onClick={() => setShowParticipants((prev) => !prev)}>
          <div className=" cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]  ">
            <Users size={20} className="text-white" />
          </div>
        </button>
        <button onClick={() => setShowChat((prev) => !prev)}>
          <div className={cn("cursor-pointer rounded-2xl px-4 py-2", {
            "bg-[#4c535b]": showChat,
            "bg-[#19232d] hover:bg-[#4c535b]": !showChat
          })}>
            <MessageSquare size={20} className="text-white" />
          </div>
        </button>
        {!isPersonalRoom && <EndCallButton />}
      </div>
    </section>
  );
};

export default MeetingRoom;
