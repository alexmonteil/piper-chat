const socket = io();
const messageForm = document.querySelector("form#message-form");
const messageFormInput = messageForm.querySelector("input#message");
const messageFormButton = messageForm.querySelector("button");
const locationButton = document.querySelector("button#send-location");
const messages = document.querySelector("#messages");
const sidebar = document.querySelector("#sidebar");


// Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-message-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;


// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });
const autoScroll = () => {
    
    // new message element
    const newMessage = messages.lastElementChild;

    // get height of new message
    const newMessageStyles = getComputedStyle(newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = newMessage.offsetHeight + newMessageMargin;
     
    // get visible height
    const visibleHeight = messages.offsetHeight;

    // height of messages container
    const containerHeight = messages.scrollHeight;

    // how far have I scrolled
    const scrollOffset = messages.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset) {
        messages.scrollTop = messages.scrollHeight;
    }

};


// Socket events

// Socket event when a new message is posted
socket.on("message", message => {
    console.log(message);
    const html = Mustache.render(messageTemplate, { 
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format("h:m a")
    });
    messages.insertAdjacentHTML("beforeend", html);
    autoScroll();
});



// Socket event when a location is shared
socket.on("locationMessage", message => {
    console.log(message);
    const html = Mustache.render(locationTemplate, { 
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format("h:m a")
    });
    messages.insertAdjacentHTML("beforeend", html);
});



// Socket event when roomData changes
socket.on("roomData", ({ room, users }) => {

    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });

    sidebar.innerHTML = html;

});



// Emit socket event when joining
socket.emit("join", { username, room }, (error) => {

    if (error) {
        alert(error);
        location.href = "/";
    }

});



// DOM Event when form is submitted
messageForm.addEventListener("submit", e => {

    e.preventDefault();
    messageFormButton.setAttribute("disabled", "disabled");

    let msgContent = e.target.elements.message.value;

    socket.emit("sendMessage", msgContent, (error) => {

        if (error) {
            return console.log(error);
        }

        console.log("Message delivered!");

        messageFormButton.removeAttribute("disabled");

    });

    messageFormInput.value = "";
    messageFormInput.focus();
});




// DOM Event when location button is shared
locationButton.addEventListener("click", () => {

    if (!navigator.geolocation) {
        return alert("Geolocation is not supported by your browser");
    }

    locationButton.setAttribute("disabled", "disabled");

    navigator.geolocation.getCurrentPosition(location => {
        socket.emit("sendLocation", {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        }, (error) => {
            if (error) {
                return console.log(error);
            }

            console.log("Location shared!");
            locationButton.removeAttribute("disabled");

        });
    });
});