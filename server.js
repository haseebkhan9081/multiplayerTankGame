// server.js

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve the static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle GET request for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Array of adjectives and nouns to create cool names
const adjectives = ["Awesome", "Epic", "Radical", "Fantastic", "Legendary", "Mystic", "Incredible", "Spectacular", "Magical", "Dazzling"];
const nouns = ["Warrior", "Wizard", "Ninja", "Champion", "Hero", "Sorcerer", "Samurai", "Gladiator", "Mage", "Assassin"];

// Function to generate a random cool name
function generateCoolName() {
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return randomAdjective + " " + randomNoun;
}

// Example usage:



var players = {};
// Handle WebSocket connections
io.on('connection', (socket) => {

    const randomCoolName = generateCoolName();
    console.log("Random Cool Name:", randomCoolName);

    console.log('A user connected');
    socket.emit("playerId",socket.id);
    players[socket.id] = {
        rotation: 0,
        playerNameText:generateCoolName(),
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: socket.id,
        team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
      };
      // send the players object to the new player
      socket.emit('currentPlayers', players);
      // update all other players of the new player
      socket.broadcast.emit('newPlayer', players[socket.id]);
    // Handle player movement
    socket.on('move', (movement) => {
        // Broadcast the movement data to all other clients
        console.log("broadcasting updated position");
        socket.broadcast.emit('updatePosition', movement);
    });
socket.on('hit',(bullet)=>{
io.emit('hit',bullet);
})
    // Handle player shooting
    socket.on('shoot', (shootData) => {
        // Broadcast the shoot data to all other clients
        socket.broadcast.emit('shoot', shootData);
    });

    socket.on('bulletFired', (bulletInfo) => {
        // Broadcast the bullet information to all other players
        socket.broadcast.emit('bulletFired', bulletInfo);
    });

    socket.on('tankUpdate', (tankInfo) => {
        // Broadcast the tank information to all other players
        socket.broadcast.emit('tankUpdate', { playerId: socket.id, tankInfo: tankInfo });
    });
    
    

    // Handle player disconnect
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        delete players[socket.id];
// emit a message to all players to remove this player
    io.emit('playerDisconnected', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
