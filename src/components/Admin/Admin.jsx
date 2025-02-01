import React, { useState, useEffect } from 'react';
import { database } from '../../firebase';
import { ref, set, push, onValue, serverTimestamp, get } from 'firebase/database';
import styles from './Admin.module.css';
import { Col, Row, Table, InputGroup, Form, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';

function Admin() {
  const [selectedUser, setSelectedUser] = useState('user1');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [privateMessage, setPrivateMessage] = useState('');
  const [broadcastMessages, setBroadcastMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [userMessages, setUserMessages] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [userQueue, setUserQueue] = useState([]);
  const [usersToFacilitate, setUsersToFacilitate] = useState(1);
  const [users, setUsers] = useState([]);
  const [resources, setResources] = useState([]);


  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();

        // Convert the users object into an array of users with userId (phone number)
        const usersList = Object.keys(usersData).map((userId) => ({
          userId, // Phone number
          location: usersData[userId].location, // Location
        }));

        setUsers(usersList);
      } else {
        setUsers([]);
      }
    });

    return () => unsubscribeUsers();
  }, []);

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
    const privateRef = ref(database, 'messages/private/' + selectedUser);
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
  }, [selectedUser]);

  useEffect(() => {
    const userMessagesRef = ref(database, 'messages/private/admin');
    const unsubscribeUserMessages = onValue(userMessagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const messagesList = Object.values(messagesData);
        setUserMessages(messagesList);
      } else {
        setUserMessages([]);
      }
    });

    return () => unsubscribeUserMessages();
  }, []);

  useEffect(() => {
    const queueRef = ref(database, 'queue');
    const unsubscribeQueue = onValue(queueRef, (snapshot) => {
      if (snapshot.exists()) {
        const queueData = snapshot.val();
        setUserQueue(queueData);
      } else {
        setUserQueue([]);
      }
    });

    return () => unsubscribeQueue();
  }, []);

  useEffect(() => {
    const filteredUserMessages = userMessages.filter(
      (msg) => msg.from === selectedUser
    );

    const combinedMessages = [
      ...broadcastMessages.map((msg) => ({ ...msg, type: 'broadcast', sender: 'admin' })),
      ...privateMessages.map((msg) => ({ ...msg, type: 'private', sender: 'admin' })),
      ...filteredUserMessages.map((msg) => ({ ...msg, type: 'private', sender: msg.from })),
    ];

    const sortedMessages = combinedMessages.sort((a, b) => a.timestamp - b.timestamp);
    setAllMessages(sortedMessages);
  }, [broadcastMessages, privateMessages, userMessages, selectedUser]);

  const sendBroadcastMessage = () => {
    if (broadcastMessage) {
      push(ref(database, 'messages/broadcast'), {
        message: broadcastMessage,
        timestamp: serverTimestamp(),
        from: 'admin',
      });
      setBroadcastMessage('');
    } else {
      alert('Please enter a message to broadcast.');
    }
  };

  const sendPrivateMessage = () => {
    if (selectedUser && privateMessage) {
      push(ref(database, 'messages/private/' + selectedUser), {
        message: privateMessage,
        timestamp: serverTimestamp(),
        from: 'admin',
      });
      setPrivateMessage('');
    } else {
      alert('Please select a user and enter a message.');
    }
  };

  const facilitateUsers = async () => {
    const queueRef = ref(database, 'queue');
    const queueSnapshot = await get(queueRef);

    if (queueSnapshot.exists()) {
      const queueData = queueSnapshot.val();
      const usersToProcess = queueData.slice(0, usersToFacilitate);
      const remainingUsers = queueData.slice(usersToFacilitate);

      for (const userId of usersToProcess) {
        await push(ref(database, `messages/private/${userId}`), {
          message: "You're being facilitated. How can we help you?",
          timestamp: serverTimestamp(),
          from: 'admin',
        });
      }

      await set(queueRef, remainingUsers);
    }
  };

  const tableVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className={styles.container}>
      <Row>
        <h2>Admin Chat</h2>
        <Col xs={2} md={2}></Col>
        <Col xs={8} md={8}>
          <div className={styles.section}>
            <InputGroup className={styles.InputButton}>
              <Form.Control
                placeholder="Type a broadcast message..."
                aria-label="Type a broadcast message..."
                as="textarea"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className={styles.InputUser}
              />
              <Button variant="outline-secondary" onClick={sendBroadcastMessage}>
                Send
              </Button>
            </InputGroup>
          </div>
        </Col>
        <Col xs={2} md={2}></Col>
      </Row>

      <Row>
        <Col xs={2} md={2}></Col>
        <Col xs={8} md={8}>
          <motion.div className={styles.TableUser} initial="hidden" animate="visible" variants={tableVariants}>
            <h3 className={styles.title}>User Data</h3>
            <Table striped bordered hover variant="dark" className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Location</th>
                </tr>
              </thead>
              <motion.tbody variants={tableVariants}>
                {users.map((user, index) => (
                  <motion.tr key={user.id} variants={rowVariants}>
                    <td>{index + 1}</td>
                    <td>{user.userId || 'N/A'}</td>
                    <td>{user.location?.address || 'N/A'}</td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </Table>
          </motion.div>
        </Col>
        <Col xs={2} md={2}></Col>
      </Row>

      <Row>
        <Col xs={2} md={2}></Col>
        <Col xs={8} md={8}>
          <motion.div className={styles.TableUser} initial="hidden" animate="visible" variants={tableVariants}>
            <h3 className={styles.title}>Resources Available</h3>
            <Table striped bordered hover variant="dark" className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Location</th>
                </tr>
              </thead>
              <motion.tbody variants={tableVariants}>
                {resources.map((resource, index) => (
                  <motion.tr key={resource.id} variants={rowVariants}>
                    <td>{index + 1}</td>
                    <td>{resource.type || 'N/A'}</td>
                    <td>{resource.amount || 'N/A'}</td>
                    <td>{resource.location?.address || 'N/A'}</td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </Table>
          </motion.div>
        </Col>
        <Col xs={2} md={2}></Col>
      </Row>
    </div>
  );
}

export default Admin;