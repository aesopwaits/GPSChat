var ServiceController = require('../controllers/ServiceController');

function MessageHelper(){
}

MessageHelper.prototype.HandleSpecialMessage = function(mess, callback){
	if(mess.indexOf('/img ') > -1)
	{
		var imageURL =  mess.substring(mess.indexOf('/img ') + 5,mess.length);
		var user = mess.substring(0,mess.indexOf(':'));
		new ServiceController().CheckImageIntegrity(imageURL, function(code){
			if(code == 200)
			{
				return callback({URL: imageURL , User : user});
			}
			else
			{
				return callback({URL: "http://maxcdn.thedesigninspiration.com/wp-content/uploads/2010/03/fail-whale/Fail-Whale-15.jpg", User : user});
			}
		});
	}
	else if(mess.indexOf('/lights ') > -1)
	{
		var lightCommand =  mess.substring(mess.indexOf('/lights ') + 8,mess.length);
		var user = mess.substring(0,mess.indexOf(':'));
		if(lightCommand.toUpperCase() == "ON" || lightCommand.toUpperCase() == "OFF")
		{
			new ServiceController().SetLightState(lightCommand);
			return callback({User : user,StateMessage: "has turned the lights " + lightCommand});
		}
	}
	else
	{
		return callback({User : user});
	}
}

module.exports = MessageHelper;