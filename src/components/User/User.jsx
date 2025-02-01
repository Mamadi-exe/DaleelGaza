import React, { useState, useEffect } from 'react';
import { database } from '../../firebase';
import { ref, push, onValue, serverTimestamp, get, set } from 'firebase/database';
import styles from './User.module.css';
import { Col, Row, Nav, InputGroup, Form, Button } from 'react-bootstrap';
import axios from 'axios'; // For geocoding API

function User({ userId }) {
  const [broadcastMessages, setBroadcastMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState('DaleelGaza');
  const [privateMessages, setPrivateMessages] = useState([]);
  const [userMessages, setUserMessages] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [allMessages, setAllMessages] = useState([]);
  const [resources, setResources] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [localUserMessages, setLocalUserMessages] = useState([]);

  useEffect(() => {
    const broadcastRef = ref(database, 'messages/broadcast');
    const unsubscribeBroadcast = onValue(broadcastRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const messagesList = Object.values(messagesData);
        setBroadcastMessages(messagesList);
      } else {
        setBroadcastMessages([]);
      }
    });
    return () => unsubscribeBroadcast();
  }, []);

  useEffect(() => {
    const privateRef = ref(database, 'messages/private/' + userId);
    const unsubscribePrivate = onValue(privateRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const messagesList = Object.values(messagesData);
        setPrivateMessages(messagesList);
      } else {
        setPrivateMessages([]);
      }
    });
    return () => unsubscribePrivate();
  }, [userId]);

  useEffect(() => {
    const userMessagesRef = ref(database, 'messages/private/admin');
    const unsubscribeUserMessages = onValue(userMessagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const messagesList = Object.values(messagesData).filter(
          (msg) => msg.from === userId
        );
        setUserMessages(messagesList);
      } else {
        setUserMessages([]);
      }
    });
    return () => unsubscribeUserMessages();
  }, [userId]);

  useEffect(() => {
    const resourcesRef = ref(database, 'resources');
    const unsubscribeResources = onValue(resourcesRef, (snapshot) => {
      if (snapshot.exists()) {
        const resourcesData = snapshot.val();
        const resourcesList = Object.values(resourcesData);
        setResources(resourcesList);
      } else {
        setResources([]);
      }
    });
    return () => unsubscribeResources();
  }, []);

  useEffect(() => {
    const combinedMessages = [
      ...broadcastMessages.map((msg) => ({ ...msg, type: 'broadcast', sender: 'admin' })),
      ...privateMessages.map((msg) => ({ ...msg, type: 'private', sender: 'admin' })),
      ...userMessages.map((msg) => ({ ...msg, type: 'private', sender: 'user' })),
      ...localUserMessages,
    ];

    const uniqueMessages = combinedMessages.filter(
      (msg, index, self) =>
        index === self.findIndex((m) => m.timestamp === msg.timestamp && m.message === msg.message)
    );

    const sortedMessages = uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
    setAllMessages(sortedMessages);
  }, [broadcastMessages, privateMessages, userMessages, localUserMessages]);

  const geocodeLocation = async (location) => {
    try {
      const response = await axios.get(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(location)}&key=94eb9415f20d4d6399bc8dc191dcd89d`
      );
      if (response.data.results.length > 0) {
        const { lat, lng } = response.data.results[0].geometry;
        return { latitude: lat, longitude: lng, address: location };
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
    }
    return null;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const sendUserMessage = async () => {
    if (userMessage) {
      const locationMatch = userMessage.match(/location:\s*(.+)/i);
      const resourceMatch = userMessage.match(/resource:\s*(.+)\s*amount:\s*(\d+)/i);
      const requestMatch = userMessage.match(/request:\s*(.+)/i);

      // Create a new message object
      const newMessage = {
        message: userMessage,
        timestamp: Date.now(),
        sender: 'user',
      };

      setLocalUserMessages((prevMessages) => [...prevMessages, newMessage]);

      setUserMessage('');

      if (locationMatch) {
        const location = locationMatch[1];
        const coordinates = await geocodeLocation(location);
        if (coordinates) {
          setUserLocation(coordinates);

          await set(ref(database, `users/${userId}/location`), {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            address: coordinates.address,
          });

          push(ref(database, `messages/private/${userId}`), {
            message: `Your location has been set to: ${coordinates.address}`,
            timestamp: serverTimestamp(),
            from: "system",
          });
        } else {
          alert('Could not geocode the provided location.');
        }
      } else if (resourceMatch) {
        if (!userLocation) {
          alert('Please set your location before adding a resource.');
          return;
        }

        const resourceType = resourceMatch[1].toLowerCase().trim();
        const amount = parseInt(resourceMatch[2], 10);

        const newResourceRef = push(ref(database, 'resources'));
        await set(newResourceRef, {
          id: newResourceRef.key,
          type: resourceType,
          location: userLocation,
          amount: amount,
        });

        push(ref(database, `messages/private/${userId}`), {
          message: `Resource added: ${resourceType} (${amount}) at ${userLocation.address}`,
          timestamp: serverTimestamp(),
          from: "system",
        });
      } else if (requestMatch) {
        if (!userLocation) {
          alert('Please set your location before requesting resources.');
          return;
        }

        const resourceType = requestMatch[1].toLowerCase().trim();

        const resourcesRef = ref(database, 'resources');
        const resourcesSnapshot = await get(resourcesRef);
        const resourcesData = resourcesSnapshot.val() || [];

        const availableResources = Object.values(resourcesData).filter(
          (res) => res.type.trim() === resourceType && res.amount > 0
        );

        if (availableResources.length > 0) {
          const resourcesWithDistance = availableResources.map((res) => ({
            ...res,
            distance: calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              res.location.latitude,
              res.location.longitude
            ),
          }));

          resourcesWithDistance.sort((a, b) => a.distance - b.distance);

          const closestResource = resourcesWithDistance[0];
          if (closestResource.distance <= 5) { // 5 km range
            push(ref(database, `messages/private/${userId}`), {
              message: `You have been allocated 1 ${resourceType}. Location: ${closestResource.location.address} (${closestResource.distance.toFixed(2)} km away)`,
              timestamp: serverTimestamp(),
              from: "admin",
            });
            closestResource.amount -= 1;
            await set(ref(database, `resources/${closestResource.id}`), closestResource);
          } else {
            push(ref(database, `messages/private/${userId}`), {
              message: `No ${resourceType} available within 5 km.`,
              timestamp: serverTimestamp(),
              from: "admin",
            });
          }
        } else {
          push(ref(database, `messages/private/${userId}`), {
            message: `No ${resourceType} available.`,
            timestamp: serverTimestamp(),
            from: "admin",
          });
        }
      } else {
        push(ref(database, `messages/private/${userId}`), {
          message: userMessage,
          timestamp: serverTimestamp(),
          from: userId,
        });
      }
    } else {
      alert('Please enter a message.');
    }
  };

  return (
    <div className={styles.container}>
      <Row>
        <Col xs={2} md={2}>
          <div className={styles.ContactList}>
            <Nav variant="pills" className={styles.NavUse}>
              <Nav.Item>
                <Nav.Link
                  active={selectedUser === 'DaleelGaza'}
                  onClick={() => setSelectedUser('DaleelGaza')}
                  className={`${styles.ContactButton} ${selectedUser === 'DaleelGaza' ? styles.active : ''}`}
                >
                  Daleel Gaza
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={selectedUser === '+97024225252'}
                  onClick={() => setSelectedUser('+97024225252')}
                  className={styles.ContactButton}
                >
                  +97024225241
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>
        </Col>
        <Col xs={10} md={10}>
          <div className={styles.messages}>
            {allMessages.map((msg, index) => (
              <div
                key={index}
                className={msg.sender === 'admin' ? styles.messageAdmin : styles.messageUser}
              >
                <strong>{msg.sender === 'admin' ? 'Admin' : 'You'}:</strong> {msg.message}
                <div className={styles.timestamp}>
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.section}>
            <InputGroup className={styles.InputButton}>
              <Form.Control
                placeholder="Type your message..."
                aria-label="Type your message..."
                as="textarea"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                className={styles.InputUser}
              />
              <Button variant="outline-secondary" onClick={sendUserMessage} type="button">
                Send
              </Button>
            </InputGroup>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default User;