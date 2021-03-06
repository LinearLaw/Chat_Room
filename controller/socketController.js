const Room = require("../model/Room.js");
const cmtCtrl = require("../controller/commentController.js");

//获取roomId
function getRoomId(socket){
    var url = socket.request.headers.referer;
    var splited = url.split('/');
    var roomId = splited[splited.length - 1];   // 获取房间ID
    return roomId
}
//获取当前时间
function getTimeNow(){
    let nowTime = new Date();
    let hours = nowTime.getHours();
    let minute = nowTime.getMinutes();
    let second = nowTime.getSeconds();
    let h = hours<10?"0"+hours:hours;
    let min = minute<10?"0"+minute:minute;
    let s = second<10?"0"+second:second;
    return h + ":" + min + ":" + s;
}
exports.apiSocket = (socket)=> {

    //新用户链接，进行推送
    socket.on('join', function (info) {
        //当前链接数
        let count = io.eio.clientsCount;

        /* v2，多房间 */
        let ri = info.ri;
        Room.find({roomId:ri},(err,result)=>{
            if(result && result.length>0){
                Room.update({roomId:ri},{
                    $push:{ "join":{userId:info.userId , username:info.username} }
                },(err,result)=>{
                    console.log("success join: "+err,result);
                });
            }
        });
        //房间号加入，通知房内的user
        socket.join(ri);
        io.to(ri).emit('userConnect', {
            userCount:count,
            info:"用户 " + info.username + " 加入了房间"
        });
     });

    //用户发出消息
    socket.on("fabiao",function(msg){
       let time = getTimeNow();
       let ri = getRoomId(socket);

       // v2，多Room
       io.to(ri).emit("pinglun",{
          inputVal:msg.inputVal,
          userName:msg.userName,
          userAvatar:msg.userAvatar || "",
          time:time,
          nowTime:msg.nowTime
       });

       //调用接口，存到数据库
       let cmtObj = {
           content:msg.inputVal,
           userId:msg.userId,
           userAvatar:msg.userAvatar||"",
           username:msg.userName,
           roomId:ri
       }
       cmtCtrl.reportComment(
           {body:cmtObj},
           {send:function(obj){/*评论成功*/}
       });
    });

   //点赞
    socket.on("dianzan",function(msg){
        let nowtime = msg.nowtime;
        let dianzan = msg.dianzan;
        let ri = getRoomId(socket);

        dianzan ++ ;//点赞
        io.to(ri).emit("dianzanTotal",{
           nowtime:nowtime,
           dianzan:dianzan
        });
    });

    //退出聊天
    socket.on("exit",function(msg){
        var n = msg.username;
        console.log('用户 ' + n + ' 退出了房间');
        /* v2，多房间 */
        Room.update({roomId:msg.ri},{
            $pull:{ join:{ userId:msg.userId } }
        },(err,result)=>{
            if(result && result.length>0){
                Room.find({roomId:ri},{
                    $push:{ "join":{userId:info.userId} }
                },(err,result)=>{
                    console.log("success pull: " + n);
                });
            }
        });
        let ri = getRoomId(socket);
        io.to(ri).emit("userExit",{
            username:n
        })
    })
};
