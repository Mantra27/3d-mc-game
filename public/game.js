
let scene, camera, renderer, controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
raycaster.far = 10; 
let mouse = new THREE.Vector2();
let blocks = [];
let blockMap = new Map(); 
let selectedBlockType = 0; 
let lastPlaceTime = 0;
const PLACE_COOLDOWN = 100; 


let mouseSensitivity = 0.002;
let isPointerLocked = false;
let lastMouseX = 0;
let lastMouseY = 0;
let euler = new THREE.Euler(0, 0, 0, 'YXZ');
let PI_2 = Math.PI / 2;


const textureLoader = new THREE.TextureLoader();
let blockTextures = {};


const blockTypes = [
    { name: 'grass', topColor: '#90EE90', sideColor: '#8B4513', bottomColor: '#654321' },  
    { name: 'dirt', topColor: '#8B4513', sideColor: '#654321', bottomColor: '#654321' },   
    { name: 'stone', topColor: '#808080', sideColor: '#696969', bottomColor: '#696969' }   
];


function init() {
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); 
    scene.fog = new THREE.Fog(0x87CEEB, 0, 500);

    
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 10, 0);
    euler.setFromQuaternion(camera.quaternion);

    
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap; 

    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.bias = -0.0001;
    scene.add(directionalLight);

    
    generateBlockTextures().then(() => {
        
        createGround();

        
        createWorld();

        
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        });

        
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('pointerlockerror', () => {
            console.error('Pointer lock failed');
        });

        
        document.addEventListener('mousemove', onMouseMove, false);

        
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        
        document.addEventListener('mousedown', onMouseDown);

        
        window.addEventListener('resize', onWindowResize);

        
        animate();
    });
}


function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundTexture = createTexture('#90EE90');
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);
}


function createWorld() {
    
    const terrainSize = 15; 
    for (let x = -terrainSize; x <= terrainSize; x += 1) {
        for (let z = -terrainSize; z <= terrainSize; z += 1) {
            
            const height = Math.floor(Math.random() * 2) + 1; 
            
            for (let y = 0; y < height; y++) {
                let blockType = 0; 
                if (y === 0) {
                    blockType = 1; 
                } else if (y >= height - 1) {
                    blockType = 0; 
                }
                
                createBlock(x, y, z, blockType);
            }
        }
    }
}


function generateBlockTextures() {
    return new Promise((resolve) => {
        blockTypes.forEach((blockType, index) => {
            const textures = {
                top: createTexture(blockType.topColor),
                side: createTexture(blockType.sideColor),
                bottom: createTexture(blockType.bottomColor)
            };
            
            
            [textures.top, textures.side, textures.bottom].forEach(tex => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(1, 1);
            });
            
            blockTextures[index] = textures;
        });
        resolve();
    });
}


function createTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    
    context.fillStyle = color;
    context.fillRect(0, 0, 64, 64);
    
    
    const imageData = context.getImageData(0, 0, 64, 64);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        
        const noise = (Math.random() - 0.5) * 30;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); 
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); 
    }
    
    context.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}


function getPositionKey(x, y, z) {
    return `${x},${y},${z}`;
}


function createBlock(x, y, z, type = 0) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    
    const materials = [
        new THREE.MeshStandardMaterial({ map: blockTextures[type].side }), 
        new THREE.MeshStandardMaterial({ map: blockTextures[type].side }), 
        new THREE.MeshStandardMaterial({ map: blockTextures[type].top }),  
        new THREE.MeshStandardMaterial({ map: blockTextures[type].bottom }), 
        new THREE.MeshStandardMaterial({ map: blockTextures[type].side }), 
        new THREE.MeshStandardMaterial({ map: blockTextures[type].side })  
    ];
    
    const block = new THREE.Mesh(geometry, materials);
    
    block.position.set(x, y + 0.5, z);
    
    
    block.castShadow = false;
    block.receiveShadow = false;
    
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    const roundedZ = Math.round(z);
    
    block.userData = { type: type, x: roundedX, y: roundedY, z: roundedZ, isTerrain: true };
    
    
    const posKey = getPositionKey(roundedX, roundedY, roundedZ);
    blockMap.set(posKey, block);
    
    scene.add(block);
    blocks.push(block);
    
    return block;
}


function onPointerLockChange() {
    const canvas = document.getElementById('gameCanvas');
    if (document.pointerLockElement === canvas || 
        document.mozPointerLockElement === canvas ||
        document.webkitPointerLockElement === canvas) {
        isPointerLocked = true;
        lastMouseX = 0;
        lastMouseY = 0;
    } else {
        isPointerLocked = false;
    }
}


function onMouseMove(event) {
    const canvas = document.getElementById('gameCanvas');
    const isLocked = document.pointerLockElement === canvas || 
                     document.mozPointerLockElement === canvas ||
                     document.webkitPointerLockElement === canvas;
    
    if (isLocked || isPointerLocked) {
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        
        const rotationX = movementY * mouseSensitivity;
        const rotationY = movementX * mouseSensitivity;

        
        euler.setFromQuaternion(camera.quaternion);
        
        
        euler.y -= rotationY;
        euler.x -= rotationX;
        
        
        euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
        
        
        camera.quaternion.setFromEuler(euler);
    } else {
        
        if (event.buttons === 1) { 
            const deltaX = event.clientX - lastMouseX;
            const deltaY = event.clientY - lastMouseY;
            
            euler.setFromQuaternion(camera.quaternion);
            euler.y -= deltaX * mouseSensitivity * 0.1;
            euler.x -= deltaY * mouseSensitivity * 0.1;
            euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
            camera.quaternion.setFromEuler(euler);
        }
        
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
}


function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = true;
            break;
        case 'KeyS':
            moveBackward = true;
            break;
        case 'KeyA':
            moveRight = true; 
            break;
        case 'KeyD':
            moveLeft = true; 
            break;
        case 'Space':
            if (canJump === true) {
                velocity.y += 15;
                canJump = false;
            }
            event.preventDefault();
            break;
    }
}


function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = false;
            break;
        case 'KeyS':
            moveBackward = false;
            break;
        case 'KeyA':
            moveRight = false; 
            break;
        case 'KeyD':
            moveLeft = false; 
            break;
    }
}


function onMouseDown(event) {
    if (event.button === 0 && document.pointerLockElement === document.getElementById('gameCanvas')) {
        placeBlock();
    }
}


function placeBlock() {
    
    const currentTime = performance.now();
    if (currentTime - lastPlaceTime < PLACE_COOLDOWN) {
        return;
    }
    lastPlaceTime = currentTime;
    
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    
    const nearbyBlocks = blocks.filter(block => {
        const dx = block.position.x - camera.position.x;
        const dy = block.position.y - camera.position.y;
        const dz = block.position.z - camera.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        return distSq < 100; 
    });
    
    
    const intersects = raycaster.intersectObjects(nearbyBlocks);
    
    if (intersects.length > 0) {
        const intersection = intersects[0];
        const block = intersection.object;
        
        
        const normal = intersection.face.normal.clone();
        normal.transformDirection(block.matrixWorld);
        normal.normalize();
        
        
        const clickedGridX = block.userData.x;
        const clickedGridY = block.userData.y;
        const clickedGridZ = block.userData.z;
        
        
        
        const newGridX = clickedGridX + Math.round(normal.x);
        const newGridY = clickedGridY + Math.round(normal.y);
        const newGridZ = clickedGridZ + Math.round(normal.z);
        
        
        const posKey = getPositionKey(newGridX, newGridY, newGridZ);
        const existingBlock = blockMap.get(posKey);
        
        
        const newWorldX = newGridX;
        const newWorldY = newGridY + 0.5; 
        const newWorldZ = newGridZ;
        
        
        const playerPos = camera.position;
        const dx = newWorldX - playerPos.x;
        const dy = newWorldY - playerPos.y;
        const dz = newWorldZ - playerPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDistSq = 1.5 * 1.5; 
        
        if (!existingBlock && distSq > minDistSq) {
            
            selectedBlockType = (selectedBlockType + 1) % blockTypes.length;
            
            const newBlock = createBlock(newGridX, newGridY, newGridZ, selectedBlockType);
            
            newBlock.castShadow = true;
            newBlock.receiveShadow = true;
            newBlock.userData.isTerrain = false;
        }
    }
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function checkCollision(position) {
    const playerBox = new THREE.Box3(
        new THREE.Vector3(position.x - 0.3, position.y - 1.7, position.z - 0.3),
        new THREE.Vector3(position.x + 0.3, position.y + 0.3, position.z + 0.3)
    );
    
    
    for (let block of blocks) {
        
        if (block.visible === false) continue;
        
        const blockBox = new THREE.Box3().setFromObject(block);
        if (playerBox.intersectsBox(blockBox)) {
            return true;
        }
    }
    
    return false;
}


let lastCullTime = 0;
const cullInterval = 100; 


function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    
    
    if (time - lastCullTime > cullInterval) {
        const cameraPos = camera.position;
        const cullDistance = 70; 
        
        blocks.forEach(block => {
            if (block.userData && block.userData.isTerrain) {
                
                const dx = block.position.x - cameraPos.x;
                const dy = block.position.y - cameraPos.y;
                const dz = block.position.z - cameraPos.z;
                const distanceSq = dx * dx + dy * dy + dz * dz;
                block.visible = distanceSq < cullDistance * cullDistance; 
            }
        });
        lastCullTime = time;
    }
    
    
    velocity.x *= Math.max(0, 1 - 10.0 * delta);
    velocity.z *= Math.max(0, 1 - 10.0 * delta);
    
    
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    
    
    if (direction.length() > 0) {
        direction.normalize();
        
        
        if (moveForward || moveBackward) {
            velocity.z -= direction.z * 30.0 * delta;
        }
        if (moveLeft || moveRight) {
            velocity.x -= direction.x * 30.0 * delta;
        }
    }
    
    
    velocity.y -= 9.8 * 10.0 * delta; 
    
    
    const moveEuler = new THREE.Euler(0, euler.y, 0, 'XYZ');
    const moveDirection = new THREE.Vector3();
    moveDirection.x = velocity.x;
    moveDirection.z = velocity.z;
    moveDirection.applyEuler(moveEuler);
    
    
    const nextPosition = camera.position.clone();
    nextPosition.x += moveDirection.x * delta;
    nextPosition.y += velocity.y * delta;
    nextPosition.z += moveDirection.z * delta;
    
    
    const groundLevel = 1.7;
    if (nextPosition.y < groundLevel) {
        nextPosition.y = groundLevel;
        if (velocity.y < 0) {
            velocity.y = 0;
            canJump = true;
        }
    }
    
    
    const testX = new THREE.Vector3(nextPosition.x, camera.position.y, camera.position.z);
    const testY = new THREE.Vector3(camera.position.x, nextPosition.y, camera.position.z);
    const testZ = new THREE.Vector3(camera.position.x, camera.position.y, nextPosition.z);
    
    
    if (!checkCollision(testX)) {
        camera.position.x = nextPosition.x;
    } else {
        
        if (Math.abs(velocity.x) > 0.01) {
            velocity.x *= 0.5; 
        }
    }
    
    
    if (!checkCollision(testY)) {
        camera.position.y = nextPosition.y;
        if (camera.position.y < groundLevel) {
            camera.position.y = groundLevel;
            velocity.y = 0;
            canJump = true;
        }
    } else {
        
        if (velocity.y < 0) {
            
            velocity.y = 0;
            canJump = true;
            
            if (camera.position.y < groundLevel) {
                camera.position.y = groundLevel;
            }
        } else if (velocity.y > 0) {
            
            velocity.y = 0;
        }
    }
    
    
    if (!checkCollision(testZ)) {
        camera.position.z = nextPosition.z;
    } else {
        
        if (Math.abs(velocity.z) > 0.01) {
            velocity.z *= 0.5; 
        }
    }
    
    prevTime = time;
    
    
    renderer.render(scene, camera);
}


window.addEventListener('load', init);
