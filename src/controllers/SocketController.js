var SocketHelper = require('../helpers/SocketHelper');
var Room = require('../models/Room');
var Client = require('../models/Client');
var Message = require('../models/Message');
var MessageHelper = require('../helpers/MessageHelper');
var ServiceController = require('./ServiceController');
var io;
var rooms=[];

function SocketController(IO){
    io = IO;
}

SocketController.prototype.OnConnection = function(socket){
    var self = this;
    socket.on("initialize",function(initialObject){
        self.FindAndJoinChatRoom(socket,initialObject,function(room,userName){
            if(room != '')
            {
                self.RegisterLeaveEvent(socket,rooms[room.Key],room.Name,userName);
                self.RegisterDisconnectEvent(socket,rooms[room.Key],room.Name,userName);
                self.RegisterMessageHistoryEvent(socket,room);
                self.RegisterMessageEvent(socket,room,userName);
                self.RegisterBootEvent(socket,room,userName);
                self.InitializeChatRoom(socket,room,userName);
            }
        });
    });
}

SocketController.prototype.InitializeChatRoom = function(socket,room,user){
    socket.emit('title',rooms[room.Key].Neighborhood + ' (' + room.Name + ')');
    this.PushUpdatedMemberList(room.Name,rooms[room.Key].Clients,socket,user);
    this.EmitNewMemberJoined(socket,room,user);
    socket.emit('chatLoaded');
}

SocketController.prototype.FindAndJoinChatRoom = function(socket,initializeObject,callback){
     var UserName = initializeObject.UserName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
     var existingRoomDTO;
     var latNum = parseFloat(initializeObject.Lat).toFixed(2);
     var lonNum = parseFloat(initializeObject.Lon).toFixed(2);
     var CurrentRoomName = latNum + " " + lonNum;
     var currentRoomNameKey = '';

     //check if room exists
     var socketHelper = new SocketHelper(io.sockets);
     var foundRoomName = socketHelper.FindRoomInRange(latNum,lonNum);
     if(foundRoomName != '')
     {
        currentRoomNameKey = foundRoomName.replace(/[\s\-\.]/g, '').toString();
        if(socketHelper.CheckIfNameTaken(rooms[currentRoomNameKey].Clients,UserName) == false)
        {
            existingRoomDTO = new Room(foundRoomName,rooms[currentRoomNameKey].Neighborhood,rooms[currentRoomNameKey].Clients);
            socket.join(existingRoomDTO.Name);

            return callback(existingRoomDTO,UserName);
        }
        else
        {   
            socket.emit('userError','A user with that name is already in the room.');
            return callback('');
        }
     }
     else //no room close enough, create
     {
        new ServiceController().GetNeighborhoodByCoords(latNum,lonNum,function(neighborhood){
               existingRoomDTO = new Room(CurrentRoomName.toString(),neighborhood);
               rooms[existingRoomDTO.Key] = existingRoomDTO;
               socket.join(existingRoomDTO.Name);

               return callback(existingRoomDTO,UserName);
        });
     }

     console.log("User Joined | Name: '" + initializeObject.UserName + "' | IP: '" + socket.handshake.address + "'");
}

SocketController.prototype.EmitNewMemberJoined= function(socket,Room,userName){
    socket.broadcast.to(Room.Name).emit('joined', userName);
}

SocketController.prototype.RegisterMessageEvent = function(socket,Room,userName){
     socket.on('message', function(data,timestamp){
        data = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if(data.indexOf('&lt;script') < 0)
        {
                var result = new MessageHelper().HandleSpecialMessage(data, function(result){
                var mess = new Message();
                var isImage;
                if(result.URL)
                {
                    socket.broadcast.to(Room.Name).emit('imageMessage', result);
                    socket.emit('selfImageMessage',result);
                    mess.Content = result;
                    isImage = true;
                }
                else if(result.StateMessage)
                {
                    socket.broadcast.to(Room.Name).emit('lightMessage', result);
                    socket.emit('selfLightMessage',result);
                    mess.Content = result;
                    isImage = false;
                }
                else{
                    socket.broadcast.to(Room.Name).emit('message', data);
                    socket.emit('selfMessage',data);
                    mess.Content = data;
                    isImage = false;
                }
                mess.Timestamp = timestamp;
                mess.IsImage  = isImage;
                rooms[Room.Name.replace(/[\s\-\.]/g, '').toString()].Messages.push(mess);
            });
        }
        else
        {
            io.to(Room.Name).emit('injectMessage',userName +" tried to inject javascript and FAILED");
        }
     });
}

SocketController.prototype.RegisterMessageHistoryEvent = function(socket,room){
    socket.on('getMessageHistory', function(timestamp) {
        var key = room.Name.replace(/[\s\-\.]/g, '').toString();
        if(typeof rooms[key] != 'undefined')
        {
            rooms[key].Messages = rooms[key].Messages.slice(-100); //make sure to not store more than 100 messages back
            var allMessages = rooms[key].Messages;
            var recentMessages=[];
            allMessages.forEach( function (mess){
              if(mess.Timestamp > timestamp){
                recentMessages.push(mess);
              }
            });
           socket.emit('messageHistory',recentMessages);
        }
        socket.emit('selfjoined',room.Neighborhood + ' (' + room.Name + ')');
    });
}

SocketController.prototype.RegisterLeaveEvent = function(socket,existingRoom,currentRoomName,userName){
    var self = this;
     socket.on('leave', function() {
            self.HandleLeave(socket,existingRoom, currentRoomName,userName);
        })
}

SocketController.prototype.RegisterDisconnectEvent = function(socket,existingRoom,currentRoomName,userName){
    var self = this;
     socket.on('disconnect', function() {
         var isUserInRoom = false;
         if(typeof existingRoom != 'undefined' && typeof existingRoom.Clients != 'undefined' )
         {
            existingRoom.Clients.forEach(function(val,index){
                if(val.Name == userName)
                {
                    isUserInRoom = true;
                }
            });
            if(isUserInRoom)
            {
                self.HandleLeave(socket, existingRoom, currentRoomName,userName);
                isUserInRoom = false;
            }
         }
    });
}

SocketController.prototype.PushUpdatedMemberList = function(roomName,clients,socket,userName){
    var client = new Client();
        client.Name = userName;
        client.SocketID = socket.id;
    clients.push(client);
    io.to(roomName).emit('usersInRoomUpdate',clients);
}

SocketController.prototype.HandleLeave = function(socket,CurrentRoom,CurrentRoomName,userName){
    socket.leave(CurrentRoomName); //leave room
    io.to(CurrentRoomName).emit('left',userName); //tell everyone i left
    socket.emit('selfLeft',CurrentRoom.Neighborhood + ' (' + CurrentRoom.Name + ')'); //let myself know i left
    if(typeof CurrentRoom.Clients != 'undefined')
    {
        var removeUserIndex;
        CurrentRoom.Clients.forEach(function(val,index){
            if(val.Name == userName)
            {
                removeUserIndex = index;
                CurrentRoom.Clients.splice(removeUserIndex,1);
            }
        });
        io.to(CurrentRoomName).emit('usersInRoomUpdate',CurrentRoom.Clients); //remove me from room for everyone in it
        socket.emit('usersInRoomUpdate',CurrentRoom.Clients); //remove me from dead room list
    }
}

SocketController.prototype.RegisterBootEvent = function(socket,Room,myUserName){
    var self = this;
    socket.on('bootUser', function(data) {
        if(typeof io.sockets.connected[data.SocketID] != 'undefined' && myUserName!= io.sockets.connected[data.SocketID].handshake.query.UserName)
        {
             self.HandleLeave(io.sockets.connected[data.SocketID],rooms[Room.Key],Room.Name,io.sockets.connected[data.SocketID].handshake.query.UserName);
             io.sockets.connected[data.SocketID].emit('userBooted');
        }
    });
}
module.exports = SocketController;