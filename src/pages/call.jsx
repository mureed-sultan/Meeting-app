import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useRouter } from 'next/router';

const socket = io('http://localhost:3001');

export default function Call() {
    const localAudioRef = useRef();
    const remoteAudioRef = useRef();
    const screenVideoRef = useRef();
    const [peerConnection, setPeerConnection] = useState(null);
    const [usersInMeeting, setUsersInMeeting] = useState([]);
    const [screenStream, setScreenStream] = useState(null);
    const [micMuted, setMicMuted] = useState(false);
    const router = useRouter();
    const { userId } = router.query; 

    console.log(usersInMeeting)
    useEffect(() => {
        const startCall = async () => {
            try {
                // Set up audio
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                localAudioRef.current.srcObject = audioStream;

                const pc = new RTCPeerConnection();
                setPeerConnection(pc);

                audioStream.getTracks().forEach(track => pc.addTrack(track, audioStream));

                pc.ontrack = (event) => {
                    const stream = event.streams[0];
                    remoteAudioRef.current.srcObject = stream;
                };

                socket.emit('join-meeting', userId);

                socket.on('user-list', (users) => {
                    setUsersInMeeting(users);
                });

                socket.on('offer', async ({ offer, from }) => {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('answer', { to: from, answer });
                });

                socket.on('answer', async ({ answer }) => {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                });

                // Handle screen sharing
                socket.on('screen-shared', ({ from, streamId }) => {
                    const screenStream = new MediaStream();
                    pc.getReceivers().forEach(receiver => {
                        if (receiver.track.kind === 'video' && receiver.track.id === streamId) {
                            screenStream.addTrack(receiver.track);
                        }
                    });
                    screenVideoRef.current.srcObject = screenStream;
                });

            } catch (error) {
                console.error('Error accessing media devices:', error);
                alert('Error accessing media devices. Please ensure your microphone is connected.');
            }
        };

        if (userId) {
            startCall();
        }

        return () => {
            if (peerConnection) {
                peerConnection.close();
            }
        };
    }, [userId]);

    const startScreenShare = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            setScreenStream(screenStream);
            screenStream.getTracks().forEach(track => peerConnection.addTrack(track, screenStream));
            socket.emit('screen-share', { streamId: screenStream.getVideoTracks()[0].id });
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    };

    const stopScreenShare = () => {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
    };

    const toggleMic = () => {
        localAudioRef.current.srcObject.getTracks().forEach(track => {
            if (track.kind === 'audio') {
                track.enabled = !track.enabled;
                setMicMuted(!track.enabled);
            }
        });
    };

    return (
        <div>
            <h2>In Call</h2>
            <audio ref={localAudioRef} autoPlay muted />
            <audio ref={remoteAudioRef} autoPlay />
            <video ref={screenVideoRef} autoPlay />

            <button onClick={startScreenShare} disabled={screenStream}>Share Screen</button>
            <button onClick={stopScreenShare} disabled={!screenStream}>Stop Screen Share</button>
            <button onClick={toggleMic}>{micMuted ? 'Unmute Mic' : 'Mute Mic'}</button>

            <h2>Users in Meeting:</h2>
            <ul>
                {usersInMeeting.map((user, index) => (
                    <li key={index}>{user}</li>
                ))}
            </ul>
        </div>
    );
}
