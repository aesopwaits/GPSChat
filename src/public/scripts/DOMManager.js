var Lat;
var Lon;
var disconnectTime;
var messageCount = 0;

function DOMManager(lat,lon){
    Lat = lat;
    Lon = lon;
    this.messageBoxEventHandler();

     var chatLog = $("#chatlog");
         chatLog.bind("DOMSubtreeModified",function() {
         chatLog.animate({
            scrollTop: chatLog[0].scrollHeight
         });
    });

    $(window).on("focus",function(){
      document.title = "Yosaaaa.ly";
      messageCount = 0;
    });
}

DOMManager.prototype.sendMsg = function(){
    var r = $("#msgbox").val();
    EventHandler.trigger('sendMessage',userName + ": " + r ,Lat,Lon);
    $("#msgbox").val('');
} 

DOMManager.prototype.addMessage = function(m,messageClassName,userClassName,timestamp) {
  var $chatLog =  $("#chatlog");
  var messTimestamp = "<div class=\"timestamp\">(" + new Date().toString("hh:mm tt") + ") </div>";

  if(timestamp)
  {
    messTimestamp = "<div class=\"timestamp\">(" + new Date(timestamp).toString("hh:mm tt") + ") </div>";
  }

  if(m.indexOf(':') > -1){
    messSplit  = m.split(':',2);
    var user = messSplit[0];  
    m = m.replace(/^[^:]*:/,'');
    $chatLog.append('<div class="' + userClassName + '">' + messTimestamp + user + ':<div class="' + messageClassName + '">' + m + '</div></div><br/>');
  }
  else{
    $chatLog.append('<div class="' + messageClassName + '">' + messTimestamp + ' ' + m + '</div>');
  }
}
 

DOMManager.prototype.addImageMessage = function(m,messageClassName,userClassName,timestamp) {
  var $chatLog =  $("#chatlog");
  var messTimestamp = "<div class=\"timestamp\">(" + new Date().toString("hh:mm tt") + ") </div>";
  console.log(m);
  if(timestamp)
  {
    messTimestamp = "<div class=\"timestamp\">(" + new Date(timestamp).toString("hh:mm tt") + ") </div>";
  }

  $chatLog.append('<div class="' + userClassName + '">' + messTimestamp + m.User + ':<br/><div class="' + messageClassName + '"><a href="'+m.Content+'" target="_blank"><img src="' + m.Content +'" height="100" width="100"/></a></div></div><br/>');
}

DOMManager.prototype.addMember = function(m) {
    $("#memberList").append(m).append("<br>");
}

DOMManager.prototype.displayChatRoom = function(title){
    $("#chatLoader").hide();
    $("h2").show().html('<div class="title">Current Room </div>' + title);
    $("#chat").show();
    $("#msgbox").show();
    $("#btnDisconnect").show();
}  

DOMManager.prototype.messageBoxEventHandler = function(){
  var self = this;
  $("#msgbox").keypress( function(event) {
         if (event.which == '13') {
            self.sendMsg();
            event.preventDefault();
        }
    });   
}

DOMManager.prototype.startChat = function(callback){
  var self = this;
   $("#txtUserName").unbind('focus').unbind('blur').on('focus blur',function(){
         $("#error").hide();
         $("#userExistsError").hide();
         $("#txtUserName").removeClass("invalid").addClass("valid");
    }).keypress( function(event) {
         if (event.which == '13') {
            event.preventDefault();
            if(!$("#userExistsError").is(':visible'))
            {
                EnterChat(callback,self);
            }
         }
    });

   $("#btnSendUser").unbind('click').on('click',function(){
       EnterChat(callback,self);
   });

   $("#btnMissed").unbind('click').on('click',function(){
      EventHandler.trigger('getMessageHistory');
   })
}

function EnterChat(callback,self){
      var $txtUserName = $("#txtUserName");
      userName = $txtUserName.val();
      if(userName)
      {                 
          $txtUserName.removeClass("invalid").addClass("valid");
          $("#error").hide();
          self.HideUserName();
          $("#chatLoader").show();
          callback(userName);
      }
      else
      {
         $("#error").show();
         $txtUserName.removeClass("valid").addClass("invalid");
      }
}

DOMManager.prototype.OnDisconnect = function(data){
  $("#btnDisconnect").show().unbind( "click" ).on('click',function(){
      EventHandler.trigger('leave',data);
      disconnectTime = Date.now();
      $("#chat").hide();
  });
}

DOMManager.prototype.HideUserName = function(){
    $("#userDiv").hide();
}

DOMManager.prototype.ShowUserName = function(){
    $("#userDiv").show();
}

DOMManager.prototype.ShowStartButton = function(){
  $("#entryLoader").hide();
  $("#txtUserName").show();
  $("#btnSendUser").show();
}

DOMManager.prototype.refreshUserList = function(data){
    var self = this;
    $("#memberList").html('<div id="MemberHeader">Members</div>');
    $.each(data,function(key,val){
       self.addMember(val);
    });
}

DOMManager.prototype.displayUserError = function(err){
  $("#chat").hide();
  this.ShowUserName();
  $("#userExistsError").show().html(err);
  $("#txtUserName").removeClass("valid").addClass("invalid");
}

DOMManager.prototype.resetState = function(){
    $("#btnDisconnect").hide();
    $("#userDiv").show();
    $("#msgbox").hide();
    $("h2").hide();
}

DOMManager.prototype.GetLastDisconnect = function(){
  return disconnectTime;
}

DOMManager.prototype.UpdateTitle = function(){
  messageCount++;
  document.title = "Yosaaaa.ly ("+ messageCount + ")"; 
}