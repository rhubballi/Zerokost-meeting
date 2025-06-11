/* eslint-disable camelcase */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import HomeCard from './HomeCard';
import MeetingModal from './MeetingModal';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import Loader from './Loader';
import { Textarea } from './ui/textarea';
import ReactDatePicker from 'react-datepicker';
import { useToast } from './ui/use-toast';
import { Input } from './ui/input';

const initialValues = {
  dateTime: new Date(),
  description: '',
  link: '',
};

const MeetingTypeList = () => {
  const router = useRouter();
  const [meetingState, setMeetingState] = useState<
    'isScheduleMeeting' | 'isJoiningMeeting' | 'isInstantMeeting' | 'isShowingInstantLink' | undefined
  >(undefined);
  const [values, setValues] = useState(initialValues);
  const [callDetail, setCallDetail] = useState<Call>();
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const client = useStreamVideoClient();
  const { user } = useUser();
  const { toast } = useToast();

  // Reset values when modal closes
  useEffect(() => {
    if (!meetingState) {
      // Only reset if not showing the meeting created confirmation
      if (!callDetail) {
        setValues(initialValues);
      }
    }
  }, [meetingState, callDetail]);

  const createMeeting = async () => {
    if (!client || !user) {
      toast({ title: 'Not authenticated or client not initialized', variant: 'destructive' });
      return;
    }
    
    try {
      // Validate inputs
      if (meetingState === 'isScheduleMeeting' && !values.dateTime) {
        toast({ title: 'Please select a date and time' });
        return;
      }
      
      // Don't allow scheduling in the past
      if (meetingState === 'isScheduleMeeting' && values.dateTime < new Date()) {
        toast({ title: 'Cannot schedule meetings in the past' });
        return;
      }
      
      setIsCreatingMeeting(true);
      
      const id = crypto.randomUUID();
      console.log('Creating meeting with ID:', id);
      
      // Create the call object
      const call = client.call('default', id);
      console.log('Call object created:', call);
      
      if (!call) {
        throw new Error('Failed to create call object');
      }
      
      // Prepare meeting data
      const startsAt = values.dateTime.toISOString();
      const description = values.description || 'Instant Meeting';
      
      console.log('Calling getOrCreate with:', {
        starts_at: startsAt,
        description
      });
      
      // Create or get the call
      const response = await call.getOrCreate({
        data: {
          starts_at: startsAt,
          custom: {
            description,
          },
        },
      });
      
      console.log('Call created successfully:', response);
      setCallDetail(call);
      
      // For instant meetings, show the link first instead of navigating directly
      if (meetingState === 'isInstantMeeting') {
        setMeetingState('isShowingInstantLink');
      }
      
      toast({
        title: meetingState === 'isScheduleMeeting' ? 'Meeting Scheduled' : 'Meeting Created',
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({ 
        title: 'Failed to create meeting', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  // Function to join the meeting after showing the link
  const joinMeeting = () => {
    if (callDetail) {
      router.push(`/meeting/${callDetail.id}`);
    }
  };

  if (!client || !user) return <Loader />;

  const meetingLink = `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${callDetail?.id}`;

  return (
    <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      <HomeCard
        img="/icons/add-meeting.svg"
        title="New Meeting"
        description="Start an instant meeting"
        handleClick={() => setMeetingState('isInstantMeeting')}
      />
      <HomeCard
        img="/icons/join-meeting.svg"
        title="Join Meeting"
        description="via invitation link"
        className="bg-blue-1"
        handleClick={() => setMeetingState('isJoiningMeeting')}
      />
      <HomeCard
        img="/icons/schedule.svg"
        title="Schedule Meeting"
        description="Plan your meeting"
        className="bg-purple-1"
        handleClick={() => setMeetingState('isScheduleMeeting')}
      />
      <HomeCard
        img="/icons/recordings.svg"
        title="View Recordings"
        description="Meeting Recordings"
        className="bg-yellow-1"
        handleClick={() => router.push('/recordings')}
      />

      {!callDetail ? (
        <MeetingModal
          isOpen={meetingState === 'isScheduleMeeting'}
          onClose={() => setMeetingState(undefined)}
          title="Create Meeting"
          handleClick={createMeeting}
          buttonText={isCreatingMeeting ? 'Scheduling...' : 'Schedule Meeting'}
          buttonDisabled={isCreatingMeeting}
        >
          <div className="flex flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-sky-2">
              Add a description
            </label>
            <Textarea
              className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={values.description}
              onChange={(e) =>
                setValues({ ...values, description: e.target.value })
              }
            />
          </div>
          <div className="flex w-full flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-sky-2">
              Select Date and Time
            </label>
            <ReactDatePicker
              selected={values.dateTime}
              onChange={(date) => setValues({ ...values, dateTime: date! })}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="time"
              dateFormat="MMMM d, yyyy h:mm aa"
              className="w-full rounded bg-dark-3 p-2 focus:outline-none"
              minDate={new Date()}
            />
          </div>
        </MeetingModal>
      ) : (
        <MeetingModal
          isOpen={meetingState === 'isScheduleMeeting'}
          onClose={() => {
            setMeetingState(undefined);
            setCallDetail(undefined);
          }}
          title="Meeting Created"
          handleClick={() => {
            navigator.clipboard.writeText(meetingLink);
            toast({ title: 'Link Copied' });
          }}
          image={'/icons/checked.svg'}
          buttonIcon="/icons/copy.svg"
          className="text-center"
          buttonText="Copy Meeting Link"
        />
      )}

      <MeetingModal
        isOpen={meetingState === 'isJoiningMeeting'}
        onClose={() => {
          setMeetingState(undefined);
          // Reset link value when closing modal
          setValues(prev => ({ ...prev, link: '' }));
        }}
        title="Type the link here"
        className="text-center"
        buttonText="Join Meeting"
        handleClick={() => {
          // Validate input first
          if (!values.link.trim()) {
            toast({ title: 'Please enter a meeting link or ID' });
            return;
          }
          
          // Extract meeting ID from the link or use the link directly if it's just an ID
          let meetingId = values.link.trim();
          
          // Check if the input is a full URL
          if (meetingId.includes('/meeting/')) {
            // Extract the meeting ID from the URL
            const parts = meetingId.split('/meeting/');
            if (parts.length > 1) {
              meetingId = parts[1].split('?')[0]; // Remove any query parameters
            }
          }
          
          // Navigate to the meeting if we have an ID
          if (meetingId) {
            router.push(`/meeting/${meetingId}`);
          } else {
            // Show an error toast if no valid meeting ID
            toast({ title: 'Invalid meeting link or ID' });
          }
        }}
      >
        <Input
          placeholder="Meeting link or ID"
          value={values.link}
          onChange={(e) => setValues({ ...values, link: e.target.value })}
          className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </MeetingModal>

      {/* Instant Meeting Modal */}
      <MeetingModal
        isOpen={meetingState === 'isInstantMeeting'}
        onClose={() => setMeetingState(undefined)}
        title="Start an Instant Meeting"
        className="text-center"
        buttonText={isCreatingMeeting ? 'Starting...' : 'Start Meeting'}
        buttonDisabled={isCreatingMeeting}
        handleClick={createMeeting}
      />

      {/* Instant Meeting Link Modal */}
      <MeetingModal
        isOpen={meetingState === 'isShowingInstantLink'}
        onClose={() => {
          setMeetingState(undefined);
          setCallDetail(undefined);
        }}
        title="Meeting Created"
        handleClick={() => {
          navigator.clipboard.writeText(meetingLink);
          toast({ title: 'Link Copied' });
        }}
        image={'/icons/checked.svg'}
        buttonIcon="/icons/copy.svg"
        className="text-center"
        buttonText="Copy Meeting Link"
      >
        <p className="mb-4 text-center text-sky-2">Share this link with others to join your meeting:</p>
        <div className="mb-6 rounded bg-dark-3 p-3 text-center text-white">
          {meetingLink}
        </div>
        <button 
          onClick={joinMeeting}
          className="w-full rounded-md bg-green-600 py-2 font-medium text-white hover:bg-green-700"
        >
          Join Meeting Now
        </button>
      </MeetingModal>
    </section>
  );
};

export default MeetingTypeList;
