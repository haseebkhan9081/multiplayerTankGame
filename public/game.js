let obstacles=null;
let myId=null;
// Connect to the server
let socket;
const bulletsMap = {};
let t=null;
function connectToServer() {
    if (assetsLoaded) {
        socket = io();
        socket.on('connect', () => {
            console.log('Connected to server');
            // Now you can trigger your createTank function or handle other server-related logic
        });
        socket.on('currentPlayers', (players) => {
            console.log("Current players:", players);
            // Loop through each player and create/update their tanks
            for (let playerId in players) {
                if (!tanks[playerId]) {
                    // If the tank for this player doesn't exist, create it
                    tanks[playerId] = createTank(players[playerId]);
                } else {
                    // If the tank already exists, update its position
                    const tank = tanks[playerId];
                    tank.sprite.setPosition(players[playerId].x, players[playerId].y);
                    // Update other properties such as barrel position if needed
                    tank.barrel.setPosition(players[playerId].x, players[playerId].y);
                }
           t=tanks[myId];
           
            }
        });
        socket.on("newPlayer",(newPlayer)=>{
            tanks[newPlayer.playerId] = createTank(newPlayer);
        })
        socket.on('playerDisconnected', (playerId) => {
            if (tanks[playerId]) {
                // If the tank exists for the disconnected player, remove it
                tanks[playerId].tank.destroy();
                tanks[playerId].outline.destroy();
                tanks[playerId].barrel.destroy();

                delete tanks[playerId]; // Remove the tank from the tanks array
            }
        });

        socket.on('playerId',(id)=>{
            console.log("playerId recieved!")
myId=id;
        })



// Handle receiving tank information from the server
socket.on('tankUpdate', (data) => {
    // Find the tank corresponding to the playerId received from the server
    let tankToUpdate = tanks[data.playerId];
    if (tankToUpdate) {
        // Update the position and barrel angle of the tank based on the received information
        tankToUpdate.tank.setPosition(data.tankInfo.x, data.tankInfo.y);

        tankToUpdate.barrel.setPosition(data.tankInfo.x, data.tankInfo.y);
        
        tankToUpdate.barrel.rotation = data.tankInfo.barrelAngle;
        tankToUpdate.outline.setPosition(data.tankInfo.x, data.tankInfo.y) 
        tankToUpdate.playerNameText.setPosition(data.tankInfo.x, data.tankInfo.y- 30);

 checkTankCollision(tankToUpdate);
    }
});

function checkTankCollision(updatedTank) {
    let yourTank = tanks[myId].tank; // Your tank
    // Perform collision detection between updatedTank and yourTank
    if (Phaser.Geom.Intersects.RectangleToRectangle(updatedTank.tank.getBounds(), yourTank.getBounds())) {
        // Calculate the distance and direction between the two tanks
        let dx = updatedTank.tank.x - yourTank.x;
        let dy = updatedTank.tank.y - yourTank.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate the minimum separation distance (sum of tank widths)
        let minSeparation = updatedTank.tank.width / 2 + yourTank.width / 2;

        // Calculate the overlap distance
        let overlap = minSeparation - distance;

        // Calculate the movement vector to separate the tanks
        let moveX = (overlap / distance) * dx;
        let moveY = (overlap / distance) * dy;

        // Move your tank away from the other tank
        yourTank.x -= moveX;
        yourTank.y -= moveY;

        // Optionally, update the outline and barrel positions as well
        yourTank.outline.x -= moveX;
        yourTank.outline.y -= moveY;
        yourTank.barrel.x -= moveX;
        yourTank.barrel.y -= moveY;
    }
}



socket.on('hit',(bulletObject)=>{
     

    const bullet = bulletsMap[bulletObject.id]; // Retrieve the bullet reference from the bulletsMap
console.log("bullet i want to destroy:",bulletObject.id)
    if (bullet) {
        // If the bullet exists, destroy it
        bullet.destroy();
        // Other hit handling logic...
    }
    let smoke = phaserContext.add.sprite(bulletObject.x, bulletObject.y, 'smoke0');
    smoke.play('smokeAnim'); 
    smoke.once(Phaser.Animations.Events.ANIMATION_COMPLETE, function() {
        smoke.destroy(); // Destroy the smoke sprite after the animation completes
    });
})

   // Handle receiving bullet information from the server
socket.on('bulletFired', (bulletInfo) => {
    phaserContext.sound.play('shootSound');
    let bulletId=bulletInfo.id;
    console.log("bullet id",bulletId);
    // Create and display the bullet based on the received information
    let bullet = phaserContext.physics.add.sprite(bulletInfo.x, bulletInfo.y, 'bulletImage');
    bullet.setVelocity(bulletInfo.velocityX, bulletInfo.velocityY);
    bullet.rotation = bulletInfo.rotation;
    bulletsMap[bulletId] = bullet;
    let barrelLength = 58; // Adjust this value based on the length of the barrel
    let xOffset = Math.cos(bulletInfo.barrel.rotation - Math.PI/2) * barrelLength; // Subtract 90 degrees (in radians) to adjust for the difference
    let yOffset = Math.sin(bulletInfo.barrel.rotation - Math.PI/2) * barrelLength;
    phaserContext.physics.add.collider(bullet, obstacles, bulletHitObstacle, null, this);
    phaserContext.physics.add.collider(bullet, tanks[myId].tank, function() {
        // Call bulletHitTank function when collision occurs
        console.log("my tank was hit!! with bulletID: ",bulletId)
       socket.emit("hit",{id:bulletId,x:bullet.x,y:bullet.y})
        bullet.destroy();
        let smoke = phaserContext.add.sprite(bullet.x, bullet.y, 'smoke0');
        smoke.play('smokeAnim'); 
        smoke.once(Phaser.Animations.Events.ANIMATION_COMPLETE, function() {
            smoke.destroy(); // Destroy the smoke sprite after the animation completes
        });
        tanks[myId].tank.setTint(0xff0000)
          
         tanks[myId].health-=10;
         console.log("my health=",tanks[myId].health)
         if (tanks[myId].health<= 0) {
            // Tank destroyed, perform appropriate actions (e.g., remove from game, play explosion animation, etc.)
            console.log("Tank destroyed!");
            phaserContext.sound.play('explode')
            tanks[myId].health=100;
            initialX= Math.floor(Math.random() * 700) + 50;
            initialY= Math.floor(Math.random() * 500) + 50;
            tanks[myId].tank.setPosition(initialX,initialY);
            tanks[myId].barrel.setPosition(initialX,initialY);
            tanks[myId].playerNameText.setPosition(initialX, initialY- 30);
            tanks[myId].outline.setPosition(initialX, initialY) // Example: destroy the tank sprite
tanks[myId].tank.clearTint();

        }
        
    }, null, this);



    // Start the smoke animation at the position of the end tip of the 
    console.log("Bullet position:", bullet.x, bullet.y);
    let smoke = phaserContext.add.sprite(bulletInfo.barrel.x + xOffset, bulletInfo.barrel.y + yOffset, 'smoke0');

    smoke.play('smokeAnim'); 
    smoke.once(Phaser.Animations.Events.ANIMATION_COMPLETE, function() {
        smoke.destroy(); // Destroy the smoke sprite after the animation completes
    });
});
     
        
    }
}
let phaserContext=null;
// Handle connection event
 

const tanks = {};
 





  

const config = {
    type: Phaser.AUTO,
    width: 1300,
    height: 700,
    scene: {
        preload: preload,
        create: create,
        update: update,
         

    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

const game = new Phaser.Game(config);

 

function preload() {
    this.load.audio('shootSound', 'assets/audio/Fire.mp3');
    this.load.audio('explode', 'assets/audio/explosion.mp3');
    
    this.load.image('tankB', 'assets/PNG/Tanks/tankBlack.png');
    this.load.image('tankGreen', 'assets/PNG/Tanks/tankGreen.png');
    this.load.image('tankGreenOutline','assets/PNG/Tanks/tankGreen_outline.png')
    this.load.image('background','assets/PNG/Environment/dirt.png')
    this.load.image('barrelGreen','assets/PNG/Tanks/barrelGreen_outline.png')

    this.load.image('bulletImage','assets/PNG/Bullets/bulletGreen_outline.png')
    
    this.load.image('smoke0','assets/PNG/Smoke/smokeWhite0.png')
    this.load.image('smoke1','assets/PNG/Smoke/smokeWhite1.png')
    this.load.image('smoke2','assets/PNG/Smoke/smokeWhite2.png')
    this.load.image('smoke3','assets/PNG/Smoke/smokeWhite3.png')
    this.load.image('smoke4','assets/PNG/Smoke/smokeWhite4.png')
    this.load.image('smoke5','assets/PNG/Smoke/smokeWhite5.png')
     
    
    this.load.image('sandBag','assets/PNG/Obstacles/sandbagBeige.png')
    

    phaserContext = this;
    this.load.on('complete', () => {
        assetsLoaded = true; // Set flag to indicate that assets are loaded
        connectToServer();
    });
    
}

 

function fireBullet(t) {
    phaserContext.sound.play('shootSound');
    console.log(t); // Log the value of 't'
    console.log(t.barrel);
    let bId=Date.now() + '_' + Math.floor(Math.random() * 1000);
    // Create a bullet sprite at the position of the barrel
    let bullet = phaserContext.physics.add.sprite(t.barrel.x, t.barrel.y, 'bulletImage');
    console.log(t.barrel.x,t.barrel.y);
    // Set the velocity of the bullet based on the rotation of the barrel
    let speed = 500; // Adjust the bullet speed as needed
    let velocityX = Math.cos(t.barrel.rotation - Math.PI/2) * speed;
    let velocityY = Math.sin(t.barrel.rotation - Math.PI/2) * speed;
    
    // Set the velocity of the bullet
    bullet.setVelocity(velocityX, velocityY);
    bullet.rotation = t.barrel.rotation;  
    let barrelLength = 58; // Adjust this value based on the length of the barrel
    let xOffset = Math.cos(t.barrel.rotation - Math.PI/2) * barrelLength; // Subtract 90 degrees (in radians) to adjust for the difference
    let yOffset = Math.sin(t.barrel.rotation - Math.PI/2) * barrelLength;
    phaserContext.physics.add.collider(bullet, obstacles, bulletHitObstacle, null, this);
    // Start the smoke animation at the position of the end tip of the 
    console.log("Bullet position:", bullet.x, bullet.y);
    bulletsMap[bId]=bullet;
    let smoke = phaserContext.add.sprite(t.barrel.x + xOffset, t.barrel.y + yOffset, 'smoke0');
console.log("bullet id= ",bId)
    smoke.play('smokeAnim'); 
    smoke.once(Phaser.Animations.Events.ANIMATION_COMPLETE, function() {
        smoke.destroy(); // Destroy the smoke sprite after the animation completes
    });
    socket.emit('bulletFired', {id:bId, x: bullet.x, y: bullet.y, velocityX: velocityX, velocityY: velocityY, rotation: bullet.rotation,barrel:t.barrel });

}
function bulletHitObstacle(bullet, obstacle) {
    // Destroy the bullet sprite
    bullet.destroy();
    let smoke = phaserContext.add.sprite(bullet.x, bullet.y, 'smoke0');
    smoke.play('smokeAnim'); 
    smoke.once(Phaser.Animations.Events.ANIMATION_COMPLETE, function() {
        smoke.destroy(); // Destroy the smoke sprite after the animation completes
    });
}


function create() {
   
    cursors = phaserContext.input.keyboard.createCursorKeys();
    const backgroundWidth = 128; 
    backgroundHeight=128;
    // Width of each background image
    const numBackgrounds = Math.ceil(config.width / backgroundWidth); // Calculate the number of background images needed
    const numofvertical=Math.ceil(config.height/backgroundHeight)
    
    for (let i = 0; i < numofvertical; i++) {
        for(let j=0;j<numBackgrounds;j++){
            const background = phaserContext.add.image(j * backgroundWidth, i*backgroundHeight, 'background').setOrigin(0);
            background.setDisplaySize(backgroundWidth, 128);
        }
        
    }
  

obstacles = phaserContext.physics.add.staticGroup();
obstacles.create(400, 300, 'sandBag'); // Example obstacle at position (400, 300)
obstacles.create(600, 500, 'sandBag');

phaserContext.anims.create({
    key: 'smokeAnim',
    frames: [
        { key: 'smoke0' },
        { key: 'smoke1' },
        { key: 'smoke2' },
        { key: 'smoke3' },
        { key: 'smoke4' },
        { key: 'smoke5' }
    ],
    frameRate: 5, // Adjust the frame rate as needed
    repeat: 0 // Repeat indefinitely
});
 

}

function createTank(playerInfo) {
    console.log("createTank was called")
    let outline= phaserContext.physics.add.sprite(playerInfo.x,playerInfo.y,'tankGreenOutline')
    let tank = phaserContext.physics.add.sprite(playerInfo.x, playerInfo.y, 'tankGreen');
    tank.setDepth(1);
    outline.setCollideWorldBounds(true);
     tank.setCollideWorldBounds(true);
 
     let barrel = phaserContext.add.sprite(tank.x, tank.y, 'barrelGreen');
     barrel.setOrigin(0.5, 1); // Set the origin point to the center
 
     // Set the depth of
     barrel.setDepth(2);
     phaserContext.physics.world.enable(barrel);
     phaserContext.input.keyboard.on('keydown-SPACE', function() {
        fireBullet(t);
    }); 
    let playerNameText = phaserContext.add.text(tank.x, tank.y - 30, playerInfo.playerNameText, {
        fontFamily: 'Arial',
        fontSize: '12px',
        fill: '#ffffff'
    });
    playerNameText.setOrigin(0.5, 1); // Align text to the bottom center
    playerNameText.setDepth(3);
     phaserContext.physics.add.collider(tank, obstacles);
     phaserContext.physics.add.collider(outline, obstacles);
     const tanklocal = {
         tank:  tank,
         barrel:  barrel,
         outline:outline,
         health:100,
         playerNameText: playerNameText
         // Add other properties as needed
     };
     // Set other properties of the tank as needed
     return tanklocal;
 }

 function update() {
    if (!t || !cursors) {
        // If tank or cursors are not defined yet, or if they are null, return early
        return;
    }

    // Movement controls for the tank
    if (cursors.up.isDown) {
        t.tank.setVelocityY(-200);
    } else if (cursors.down.isDown) {
        t.tank.setVelocityY(200);
    } else {
        t.tank.setVelocityY(0);
    }

    if (cursors.left.isDown) {
        t.tank.setVelocityX(-200);
    } else if (cursors.right.isDown) {
        t.tank.setVelocityX(200);
    } else {
        t.tank.setVelocityX(0);
    }

    // Update the position of the outline to match the tank
    t.outline.x = t.tank.x;
    t.outline.y = t.tank.y;
    t.barrel.x = t.tank.x;
    t.barrel.y = t.tank.y;
    t.playerNameText.setPosition(t.tank.x, t.tank.y- 30);
    let angle = Phaser.Math.Angle.Between(t.barrel.x, t.barrel.y, phaserContext.input.x, phaserContext.input.y);
    angle += Phaser.Math.PI2 * 0.25; // Subtract 90 degrees (in radians)
    // Set the rotation of the barrel
    t.barrel.rotation = angle;
    socket.emit('tankUpdate', { x: t.tank.x, y: t.tank.y, barrelAngle: t.barrel.rotation });
}


