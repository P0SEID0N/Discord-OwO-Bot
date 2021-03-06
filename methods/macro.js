//Checks for macro users
var redis = require('redis');
var redclient = redis.createClient();
var users = {};
var letters = "abcdefghijklmnopqrstuvwxyz";
var mcommands = {"slots":{cd:15000,half:80,six:500},"hunt":{cd:15000,half:80,six:500},"battle":{cd:15000,half:80,six:500},"point":{cd:10000,half:90,six:750}};
var vemoji = ["🐶","🐱","🐰","🐮","🐷","🐸","🐰","🦁","🐼"];
var vname = ["dog","cat","bunny","cow","pig","frog","rabbit","lion","panda"];
var con;
var global = require('./global.js');

/**
 * Checks for macros
 * false - ok
 * true - macro
 */
exports.check = function(msg,command,callback){
	if(!mcommands[command]){callback();return;}

	var id = msg.author.id;

	getUser(id,function(user){
		getCommand(id,command,function(cuser){

			var now = new Date();
			var diff = now - new Date(cuser.lasttime);

			//Check for time limit
			if(diff<mcommands[cuser.command].cd){
				if(command == "point"){
					cuser.lasttime = now;
					setCommand(id,command,cuser);
				}else{
					diff = mcommands[cuser.command].cd-diff;
					var mspercent = Math.trunc(((diff%1000)/1000)*100);
					diff = Math.trunc(diff/1000);
					var sec = diff%60;
					msg.channel.send("⏱ **|** Sorry **"+msg.author.username+"**, Please wait **"+sec+"."+mspercent+"s** to try again!");
				}
				return;
			}

			//Check if doing human check
			if(user.validText&&user.validText!="ok"){
				if(user.validMsgCount>=3){
					user.validTryCount = 0;
					user.validMsgCount = 0;
					user.validText = "ok";
					ban(msg,1,"Ignoring warning messages");
					setUser(id,user);
					return;
				}
				msg.channel.send("**"+msg.author.username+"**! Please DM me the word `"+user.validText+"` to verify that you are human! ("+user.validMsgCount+"/3)");
				user.validMsgCount++;
				setUser(id,user);
				return;
			}

			//Check for macros
			if(checkInterval(cuser,now,diff)||checkHalf(cuser,now)||checkSix(cuser,now)){
				humanCheck(user,msg,function(){setUser(id,user)});
				setCommand(id,command,cuser);
				return;
			}

			cuser.lasttime = now;
			setCommand(id,command,cuser);
			callback();
		});
	});
}

function humanCheck(user,msg,callback){
	var rand = "";
	for(var i=0;i<5;i++)
		rand += letters.charAt(Math.floor(Math.random()*letters.length));
	msg.author.send("Are you a real human? Please reply with `"+rand+"` so I can check!")
		.then(message => {
			user.validTryCount = 0;
			user.validMsgCount = 0;
			user.validText = rand;
			callback();
		})
		.catch(err => {
			msg.channel.send("**"+msg.author.username+"**, please send me a DM with only the word `"+rand+"` to check that you are a human!")
			.catch(err => {
				ban(msg,1,"No possible permission");
			});
			user.validTryCount = 0;
			user.validMsgCount = 0;
			user.validText = rand;
			callback();
		});
	
}

exports.verify = function(msg,text){
	getUser(msg.author.id,function(user){
		if(!user||!user.validText||user.validText=="ok")
			return;
		if(text==user.validText){
			global.msgAdmin("**"+msg.author.username+"** avoided ban with correct verfication ("+user.validTryCount+"/3)");
			msg.channel.send("I have verified that you are human! Thank you! :3")
				.catch(err => console.error(err));
			user.validTryCount = 0;
			user.validMsgCount = 0;
			user.validText = "ok";
		}else{
			user.validTryCount++;
			if(user.validTryCount>3){
				user.validTryCount = 0;
				user.validMsgCount = 0;
				user.validText = "ok";
				ban(msg,1,"Failed verification 3x");
			}else{
				msg.channel.send("Wrong verification code! Please try again ("+user.validTryCount+"/3)")
					.catch(err => console.error(err));
			}
		}
		setUser(msg.author.id,user);
	});
}

function checkInterval(user,now,diff){
	//Checks for macro count
	if(user.count>=10){ 
		user.count = 0;
		return true;
	}

	//Check for patterns
	if(Math.abs(user.prev-diff)<=1500) user.count++;
	else{user.count = 0;}
	user.prev = diff;
}

function checkHalf(user,now){
	if(now-new Date(user.halftime)>1800000){
		user.halfcount = 0;
		user.halftime = now;
		return false;
	}
	
	//Check count
	if(user.halfcount>mcommands[user.command].half){
		user.halfcount = 0;
		return true;
	}

	//Count
	user.halfcount++;
	return false;
}

function checkSix(user,now){
	if(now-new Date(user.sixtime)>21600000){
		user.sixcount = 0;
		user.sixtime = now;
		return false;
	}
	
	//Check count
	if(user.sixcount>mcommands[user.command].six){
		user.sixcount = 0;
		return true;
	}

	//Count
	user.sixcount++;
	return false;
}
function ban(msg,hours,reason){
	var id = msg.author.id;
	var sql = "INSERT INTO timeout (id,time,count,penalty) VALUES ("+id+",NOW(),1,"+hours+") ON DUPLICATE KEY UPDATE time = NOW(),count=count+1,penalty = penalty + "+hours+";";
	sql += "SELECT penalty,count FROM timeout WHERE id = "+id+";";
	con.query(sql,function(err,result){
		if(err) throw err;
		if(result[1][0]==undefined){
			global.msgAdmin("An error has occured on the ban function of macro.js");
		}else{
			msg.channel.send("**"+msg.author.username+"**! You have been banned for **"+result[1][0].penalty+"H** for macros or botting!");
			global.msgAdmin("**"+msg.author.username+"** has been banned for **"+reason+"**");
		}
	});
}

function getUser(id,callback){
	redclient.hgetall(id,function(err,obj){
		if(err) {console.log(err); return;}
		if(obj==null){
			var user = {
				validTryCount:0,
				validMsgCount:0
			}
			redclient.hmset(id,user,function(obj2){
				callback(user);
			});
		}else{
			callback(obj);
		}
	});
}

function setUser(id,obj){
	redclient.hmset(id,obj);
}

function getCommand(id,command,callback){
	redclient.hgetall(id+""+command,function(err,obj){
		if(err) {console.log(err); return;}
		if(obj==null){
			var user = {
				"command":command,
				"lasttime":new Date('January 1,2018'),
				"prev":0,
				"count":0,
				"halftime":new Date('January 1,2018'),
				"halfcount":0,
				"sixtime":new Date('January 1,2018'),
				"sixcount":0
			}
			redclient.hmset(id+""+command,user,function(obj2){
				callback(user);
			});
		}else{
			callback(obj);
		}
	});
}

function setCommand(id,command,obj){
	redclient.hmset(id+""+command,obj);
}
exports.con = function(tcon){
	con = tcon;
}

redclient.on('connect',function(){
	console.log('redis connected');
});
