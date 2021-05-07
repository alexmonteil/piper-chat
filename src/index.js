const app = require("fastify")({ logger: true });
const fastifyStatic = require("fastify-static");
const path = require("path");
const port = process.env.PORT || 3000;
const Filter = require("bad-words");
const { generateMessage, generateLocationMessage } = require("./utils/messages");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./utils/users");



// define paths for fastify config
const publicDir = path.join(__dirname, "../public");


// register static assets
app.register(fastifyStatic, {
    root: publicDir
});


// register websocket protocol
app.register(require("fastify-socket.io"));



// define routes
app.get("/", (req, res) => {
    return res.sendFile("/html/index.html");
});



// websocket routes
app.ready(err => {
    if (err) {
        throw err;
    }

    // Socket event for client connection
    app.io.on("connection", socket => {

        console.log("New WebSocket Connection!");

        
        // Socket event when client joins 
        socket.on("join", (userFields, callback) => {

            const { error, user }  = addUser({ id: socket.id, ...userFields });

            if (error) {
                return callback(error);
            }

            socket.join(user.room);
            socket.emit("message", generateMessage("System", "Welcome !"));
            socket.broadcast.to(user.room).emit("message", generateMessage("System", `${user.username} has joined!`));
            app.io.to(user.room).emit("roomData", {
                room: user.room,
                users: getUsersInRoom(user.room)
            });

            callback();
        });


        // Socket event when client sends a message
        socket.on("sendMessage", (msg, callback) => {

            const user = getUser(socket.id);

            if (!user) {
                return callback("User connection was lost!");
            }

            const filter = new Filter();

            if (filter.isProfane(msg)) {
                return callback("Profanity is not allowed!");
            }

            app.io.to(user.room).emit("message", generateMessage(user.username, msg));
            callback();
        });


        // Socket event when client disconnects
        socket.on("disconnect", () => {

            const removedUser = removeUser(socket.id);

            if (removedUser) {
                app.io.to(removedUser.room).emit("message", generateMessage("System",    `${removedUser.username} has left!`));
                app.io.to(removedUser.room).emit("roomData", {
                    room: removedUser.room,
                    users: getUsersInRoom(removedUser.room)
                });
            }

        });


        // Socket event when client sends location
        socket.on("sendLocation", (location, callback) => {

            const user = getUser(socket.id);

            if (!user) {
                callback("User connection was lost!")
            }

            app.io.to(user.room).emit("locationMessage", generateLocationMessage(user.username,`https://google.com/maps?q=${location.latitude},${location.longitude}`));

            callback();
        });

    });

});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

