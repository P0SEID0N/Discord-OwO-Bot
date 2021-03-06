/**
 * Cowoncy functions
 */

const global = require('./global.js');

/**
 * Displays user's cowoncy
 * @param {mysql.Connection}	con 	- Mysql.createConnection()
 * @param {discord.Message}	msg 	- Discord's message
 */
exports.display = function(con, msg){
	//Check if its disabled
	var sql = "SELECT * FROM cowoncy WHERE id = "+msg.author.id+";";

	con.query(sql,function(err,rows,fields){
		if(err) throw err;
		if(rows[0]==undefined)
			msg.channel.send("<:cowoncy:416043450337853441>** "+msg.author.username+", you currently have __0__ cowoncy!**")
				.catch(err => console.error(err));
		else
			msg.channel.send("<:cowoncy:416043450337853441>** "+msg.author.username+", you currently have __"+rows[0].money+"__ cowoncy!**")
				.catch(err => console.error(err));
	});
}

/**
 * Daily cowoncy
 */
exports.daily = function(con,msg){
	var gain = 100 + Math.floor(Math.random()*100);
	var sql = "SELECT TIMESTAMPDIFF(HOUR,daily,NOW()) AS hour,TIMESTAMPDIFF(MINUTE,daily,NOW()) AS minute,TIMESTAMPDIFF(SECOND,daily,NOW()) AS second FROM cowoncy WHERE id = "+msg.author.id+" AND TIMESTAMPDIFF(HOUR,daily,NOW())<23;"+
		"INSERT INTO cowoncy (id,money) VALUES ("+msg.author.id+","+gain+") ON DUPLICATE KEY UPDATE daily_streak = IF(TIMESTAMPDIFF(DAY,daily,NOW())>1,0,IF(TIMESTAMPDIFF(HOUR,daily,NOW())<23,daily_streak,daily_streak+1)), money = IF(TIMESTAMPDIFF(HOUR,daily,NOW()) >= 23,IF("+gain+"+(daily_streak*25)>1000,money+1000,money+("+gain+"+(daily_streak*25))),money), daily = IF(TIMESTAMPDIFF(HOUR,daily,NOW()) >= 23,NOW(),daily);"+
		"SELECT daily_streak FROM cowoncy WHERE id = "+msg.author.id+";";
	con.query(sql,function(err,rows,fields){
		if(err) throw err;
		if(rows[0][0]!=undefined){
			var hour = 22 - rows[0][0].hour;
			var min= 59 - (rows[0][0].minute%60);
			var sec = 59 - (rows[0][0].second%60);
			msg.channel.send("**<:cowoncy:416043450337853441> Nu! "+msg.author.username+"! You need to wait __"+hour+" H "+min+" M "+sec+" S__**")
				.then(message => message.delete(3000))
				.catch(err => console.error(err));
		}else{
			var streak = 0;
			if(rows[2][0]!=undefined)
				streak = rows[2][0].daily_streak;
			var totalgain = gain+(streak*25);
			if(totalgain > 1000)
				totalgain = 1000
			var text = "**<:cowoncy:416043450337853441> *OwO What's this?*  Here's your daily __"+totalgain+" Cowoncy__, "+msg.author.username+"!**";
			if(streak>0)
				text += "\n**You're on a __"+(streak+1)+"__ daily streak!**";
			msg.channel.send(text)
				.catch(err => console.error(err));
		}
	});
}

/**
 * Gives cowoncy to other users
 */
exports.give = async function(con,msg,args){
	var amount = -1;
	var id = "";
	var invalid = false;
	for(i in args){
		if(global.isInt(args[i])&&amount==-1)
			amount = parseInt(args[i]);
		else if(global.isUser(args[i])&&id=="")
			id = args[i].match(/[0-9]+/)[0];
		else
			invalid = true;
	}

	if(invalid||id==""||amount<=0){
		msg.channel.send("Invalid arguments! :c")
			.then(message => message.delete(3000))
			.catch(err => console.error(err));
		return;
	}

	var user = await global.getUser(id);

	if(user==undefined){
		msg.channel.send("Could not find that user!")
			.then(message => message.delete(3000))
			.catch(err => console.error(err));
		return
	}else if(user.bot){
		msg.channel.send("You can't send cowoncy to a bot silly!")
			.then(message => message.delete(3000))
			.catch(err => console.error(err));
		return;
	}else if(user.id==msg.author.id){
		msg.channel.send("**"+msg.author+" sent __"+amount+"__ cowoncy to... "+user+"...**\n*but... why?*")
			.catch(err => console.error(err));
		return;
	}

	var sql = "SELECT money FROM cowoncy WHERE id = "+msg.author.id+";";
	con.query(sql,function(err,rows,fields){
		if(err) throw err;
		if(rows[0]==undefined||rows[0].money<amount){
			msg.channel.send("Silly "+msg.author.username+", you don't have enough cowoncy!")
				.then(message => message.delete(3000))
				.catch(err => console.error(err));
		}else{
			sql = "UPDATE cowoncy SET money = money - "+amount+" WHERE id = "+msg.author.id+";"+
				"INSERT INTO cowoncy (id,money) VALUES ("+id+","+amount+") ON DUPLICATE KEY UPDATE money = money + "+amount+";";
			con.query(sql,function(err,rows,fields){
				if(err) throw err;
				msg.channel.send("**"+msg.author.username+" sent __"+amount+"__ cowoncy to "+user+"!**")
					.catch(err => console.error(err));
			});
		}
	});

}
