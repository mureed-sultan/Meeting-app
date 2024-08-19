import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useRouter } from 'next/router';

const socket = io('http://localhost:3001');

export default function Home() {
    const [name, setName] = useState('');
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [calling, setCalling] = useState(false);
    const router = useRouter();

    useEffect(() => {
        socket.on('user-list', (onlineUsers) => {
            setUsers(Object.entries(onlineUsers).map(([id, name]) => ({ id, name })));
        });

        socket.on('call-made', ({ from, name }) => {
            const acceptCall = confirm(`${name} is calling you. Do you want to accept?`);
            if (acceptCall) {
                socket.emit('answer-call', { from: socket.id, to: from });
                router.push(`/call?userId=${socket.id}`);
            }
        });

        socket.on('call-answered', ({ from }) => {
            router.push(`/call?userId=${from}`);
        });
    }, []);

    const handleJoin = () => {
        if (name) {
            setCurrentUser(name);
            socket.emit('join', name);
        }
    };

    const handleCallUser = (userId) => {
        setCalling(true);
        socket.emit('call-user', { from: socket.id, to: userId, name: currentUser });
    };

    return (
        <div>
            {!currentUser ? (
                <div>
                    <input 
                        type="text" 
                        placeholder="Enter your name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                    />
                    <button onClick={handleJoin}>Join</button>
                </div>
            ) : (
                <div>
                    <h1>Welcome, {currentUser}</h1>
                    <h2>Available Users</h2>
                    <ul>
                        {users.map((user) => (
                            user.id !== socket.id && (
                                <li key={user.id}>
                                    {user.name} 
                                    <button onClick={() => handleCallUser(user.id)}>Call</button>
                                </li>
                            )
                        ))}
                    </ul>
                    {calling && <p>Calling...</p>}
                </div>
            )}
        </div>
    );
}
