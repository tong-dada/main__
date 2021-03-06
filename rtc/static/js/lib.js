
var sc = 0, _pass, audiodata = [], videodata = [], video_ = 1, audio_ = 1,layerOpen,_open;
// 推送服务端
var socket = io('http://api.greatorange.cn:3000/');
var audioSelect = document.querySelector('select#audioSource');
var videoSelect = document.querySelector('select#videoSource');
var pushApi = globalApi_+"/box/push/";
var _user = store.get('userinfo');
var _gid = _user.userinfo.gid;
var _uid = _user.userinfo.uid;
var _index = parent.layer.getFrameIndex(window.name);
if(!AgoraRTC.checkSystemRequirements())alert("Your browser does not support WebRTC!")
var AppId = "";
//var ChannelId = "1000";//_gid
var ChannelId = _gid;
window.onload = function () {
httpx.get(globalApi_+"/box/rtc/oauth/",{'token':_user.token},function(data){
var _data = JSON.parse(data);
if(_data.success)AppId=_data["AppId"];
kling();
})
}


//初始化
function kling(){
  _pass = store.get('channelid');
  if(!_pass){
    _open = layer.open({
      type: 1,
      title:'超级提案',
      area:'516px',
      skin:'layui-layer-nobg',
      content: $('#Bind_phone_box'),
      cancel:function(index){
        parent.layer.close(_index)
      }
    });
  }else {
    msg("您会议室的口令是：["+ _pass.channelid + "]请牢记！");
    ChannelId=_pass.pass;
    join();
    getDevices();
  }
}

function JoinConference() {
  if(!$("#bind_phone").val()){msg('口令不能为空');return}
  if(!$("#bind_code").val()){msg('密码不能为空');return}
  var pass = $("#bind_phone").val()
  var text = $("#bind_code").val()
  ChannelId = ChannelId+pass+text;
  store.set('channelid',{"channelid": text,"pass" : ChannelId});
  join();
  getDevices();
  layer.close(_open);
  startTour()
}
/*function kling(){
  _pass = store.get('channelid');
  if(!_pass){
  layer.prompt({
    title: '请输入会议室口令,创建会议',
    formType: 1,
    btn2:function(index){parent.layer.close(_index);},
    cancel:function(index){parent.layer.close(_index);}
  },function(pass, index){
    layer.close(index);
    layer.prompt({title: '请输入会议室密码,进入会议', formType: 1}, function(text, index){
      layer.close(index);
      msg("您会议室的口令是：["+ pass+text +"]请牢记！");
      ChannelId=pass+text;
      store.set('channelid',{"channelid": pass+text,"pass" : pass+text});
      join();
      getDevices();
    });
  });
  }else {
    msg("您会议室的口令是：["+ _pass.channelid + "]请牢记！");
    ChannelId=_pass.channelid;
    join();
    getDevices();
  }
}*/

/* select Log type */
// AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.NONE);
// AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.ERROR);
// AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.WARNING);
// AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.INFO);
// AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.DEBUG);

/* simulated data to proof setLogLevel() */
/*AgoraRTC.Logger.error('this is error');
AgoraRTC.Logger.warning('this is warning');
AgoraRTC.Logger.info('this is info');
AgoraRTC.Logger.debug('this is debug');*/

var client, localStream, camera, microphone;
function join() {
  console.log("Init AgoraRTC client with App ID: " + AppId);
  console.log('=====================');
  console.log('ChannelId：'+ ChannelId );
  console.log('=====================');

  var channel_key = null;

  client = AgoraRTC.createClient({mode: 'live'});
  client.init(AppId, function () {
    console.log("AgoraRTC client initialized");
    client.join(channel_key, ChannelId, null, function(uid) {//加入
      console.log("用户 " + uid + " 加入频道成功");

      if (document.getElementById("video").checked) {
        camera = videoSource.value;
        microphone = audioSource.value;
        localStream = AgoraRTC.createStream({// 创建音视频流
          streamID:uid,
          audio:true,
          cameraId:camera,
          microphoneId:microphone,
          video:document.getElementById("video").checked,
          screen:false
        });
        if (document.getElementById("video").checked) {localStream.setVideoProfile('720p_3');}
        // The user has granted access to the camera and mic.
        localStream.on("accessAllowed", function() {console.log("accessAllowed");});
        // The user has denied access to the camera and mic.
        localStream.on("accessDenied", function() {console.log("accessDenied");});

        localStream.init(function() {// 初始化本地的音视频流
          localStream.play('agora_local');// 显示本地视频播放<div>标签id名
          client.publish(localStream, function (err) {console.log("发布本地音视频流失败: " + err);});// 发布本地音视频流
          client.on('stream-published', function (evt) {console.log("发布本地音视频流成功");});

          console.log("获取用户媒体成功");
        }, function (err) {
         console.log("获取用户媒体失败", err);
        });
      }

    }, function(err) {
      console.log("加入频道失败", err);});
  }, function (err) {
    console.log("AgoraRTC客户端初始化失败", err);
  });

  channelKey = "";
  client.on('error', function(err) {
    console.log("Got error msg:", err.reason);
    if (err.reason === 'DYNAMIC_KEY_TIMEOUT') {
      client.renewChannelKey(channelKey, function(){
        console.log("Renew channel key successfully");
      }, function(err){
        console.log("Renew channel key failed: ", err);
      });
    }
  });

  // --------- 订阅远端音视频流 --------
  // 监听到新的视频
  client.on('stream-added', function (evt) {
    var stream = evt.stream;
    console.log("有新的音视频流: " + stream.getId());
    console.log("订阅 ", stream);
    client.subscribe(stream, function (err) {console.log("订阅流失败", err)});
  });
  // 订阅远程视频
  client.on('stream-subscribed', function (evt) {
    var stream = evt.stream;
    console.log("订阅远程音视频流成功: " + stream.getId());
    if ($('div#video_box #agora_remote'+stream.getId()).length === 0) {
      $('div#video_box').append('<div id="agora_remote'+stream.getId()+'" onclick="toggleBox(this)"></div>');
    }
    if($('div#video_box>div').length == 1)$('div#video_box>div').first().addClass('main')
    if($('div#video_box>div').length >= 2){$("#main").removeClass("off").find(".Previou").attr('tooltip','隐藏成员');$('.icon-zhankai').removeClass('icon-zhankai').addClass('icon-shouqi');}
    stream.play('agora_remote' + stream.getId());
    if($('#loudspeaker').hasClass('off')){ disvoice();setTimeout("disvoice()",1000);//关闭声音
      $('#loudspeaker i').removeClass('icon-yangshengqi').addClass('icon-yangshengqiguanbi');
    };
  });

  client.on('stream-removed', function (evt) {
    var stream = evt.stream;
    stream.stop();
    $('#agora_remote' + stream.getId()).remove();
    console.log("删除远程流 " + stream.getId());
  });

  client.on('peer-leave', function (evt) {
    var stream = evt.stream;
    if (stream) {
      stream.stop();
      $('#agora_remote' + stream.getId()).remove();
      console.log(evt.uid + " leaved from this channel");
    }
  });
  // document.getElementById("im").src= "../im/im.html?pass="+ChannelId;
}

function leave() {//退出
  document.getElementById("leave").disabled = true;
  client.leave(function () {
    console.log("Leavel channel successfully");
    store.set('channelid','');
    location.reload();
  }, function (err) {
    location.reload();
    console.log("Leave channel failed");
  });
}

function publish() {
  document.getElementById("publish").disabled = true;
  document.getElementById("unpublish").disabled = false;
  client.publish(localStream, function (err) {console.log("Publish local stream error: " + err);});
}

function unpublish() {
  document.getElementById("publish").disabled = false;
  document.getElementById("unpublish").disabled = true;
  client.unpublish(localStream, function (err) {console.log("Unpublish local stream failed" + err);});
}

function getDevices() {
  AgoraRTC.getDevices(function (devices) {
    for (var i = 0; i !== devices.length; ++i) {
      var option = document.createElement('option');
      var device = devices[i];
      option.value = device.deviceId;
      if (device.kind === 'audioinput') {
        option.text = device.label || 'microphone ' + (audioSelect.length + 1);
        if(option.value !== "default")audiodata.push(option.value);
        audioSelect.appendChild(option);
      } else if (device.kind === 'videoinput') {
        option.text = device.label || 'camera ' + (videoSelect.length + 1);
        if(option.value !== "default")videodata.push(option.value);
        videoSelect.appendChild(option);
      } else {
        console.log('Some other kind of source/device: ', device);
      }
    }
  });
}

//audioSelect.onchange = getDevices;
//videoSelect.onchange = getDevices;



/**
 * @tong and
 */

function switchDevice(_obj,_Device,_id) {
  if( $('.mainbtn').hasClass('off') ){ msg('麦克风或摄像头已被禁用,无法进行设置!'); return }
  if(_id == audiodata.length & _obj == 'audio'){_id = 0;audio_ =1}
  if(_id == videodata.length & _obj == 'video'){_id = 0;video_ =1}
  show_sub(_obj,_Device[_id])
}

function Members(){//其余人员显示
  if(!$("#main").hasClass("off")){
    $("#main").addClass("off").find(".Previou").attr('tooltip','显示成员');
    $('.icon-shouqi').removeClass('icon-shouqi').addClass('icon-zhankai');
  }else {
    $("#main").removeClass("off").find(".Previou").attr('tooltip','隐藏成员');
    $('.icon-zhankai').removeClass('icon-zhankai').addClass('icon-shouqi');
  }
}
//切换媒体
function show_sub(obj,val){ console.log(obj+":"+val)
  localStream.switchDevice(obj,val,function(){console.log(obj+'切换成功')},function(err){console.log(err)})
}

//主播切换
function toggleBox(e){
  $(e).addClass("main").siblings().removeClass("main")
}
$('#video_box > div').on('click',function (){
  if(!$(this).hasClass("main"))$(this).addClass("main").siblings().removeClass("main")
})

//设置
function set_fun(){
  if( $('.mainbtn').hasClass('off') ){ msg('麦克风或摄像头已被禁用,无法进行设置!'); return }
  layerOpen = layer.open({type: 1,title: ['设置','background:#333;color: #fff'],closeBtn: 0,closeBtn:1,shadeClose: true,content: $('#set_box').html()})
}


//切屏
function cam2screen() {
  client.leave(function () {
    parent.layer.close(_index);
    parent.push_screen({'obj':"rtc",'ctrl':"block"});
    console.log("Leavel channel successfully")
  },function (err){
    console.log("Leave channel failed")
  })
}

//抢麦
function robMicrophone(){
  // httpx.get(pushApi,{'token':_user.token,'push':JSON.stringify({'type':'SuperCall','content':'ShutMicrophone','gid':_gid,'uid':_uid,'key':ChannelId})},function (data) {
  //   JSON.parse(data).success ? msg('抢麦成功！') : msg(JSON.parse(data).info)
  // })
  var _dd = {'type':'SuperCall','content':'ShutMicrophone','gid':_gid,'uid':_uid,'key':ChannelId}
  socket.emit('new message', _dd)
}

//全屏开关
function toggleFullScreen(e){var el=e.srcElement||e.target;FullScreen(el)}
//全屏
function FullScreen(el){
  if(sc == 0){sc=1;document.documentElement.webkitRequestFullscreen();}else{sc=0;document.webkitCancelFullScreen();}
}

function audio_switch(t){//麦克风开关
  if($('#microphone').hasClass('off')){
    opaudio();
    $('#microphone').removeClass('off');
    $('#microphone i').removeClass('icon-maikefeng-jingyin').addClass('icon-maikefeng-shi');
  }else {
    disaudio();
    $('#microphone').addClass('off');
    $('#microphone i').removeClass('icon-maikefeng-shi').addClass('icon-maikefeng-jingyin');
  }
}
function video_switch(t) {//摄像头开关
  if($('#camera').hasClass('off')){opvideo();
    $('#camera').removeClass('off'); $('#camera i').removeClass('icon-wangyezhibogongju-guanbishexiangtou').addClass('icon-youcesousuo_shexiangtou');
  }else {disvideo();
    $('#camera').addClass('off'); $('#camera i').removeClass('icon-youcesousuo_shexiangtou').addClass('icon-wangyezhibogongju-guanbishexiangtou');
  }
}
function voice_switch(t){ //扬声器开关
  if($('#loudspeaker').hasClass('off')){console.log('扬声器开')
    opvoice();
    $('#loudspeaker').removeClass('off');
    $('#loudspeaker i').removeClass('icon-yangshengqiguanbi').addClass('icon-yangshengqi');
  }else{ console.log('扬声器关')
    disvoice();
    $('#loudspeaker').addClass('off');
    $('#loudspeaker i').removeClass('icon-yangshengqi').addClass('icon-yangshengqiguanbi');
  }
}
function opaudio() {localStream.unmuteAudio()}//开音
function disaudio(){localStream.muteAudio()}//关音
function opvideo() {localStream.enableVideo()}//开画
function disvideo(){localStream.disableVideo()}//关画
function opvoice(){$("#video_box audio,#video_box video").each(function(){document.getElementById($(this).attr("id")).muted=false});}//开声
function disvoice(){$("#video_box audio,#video_box video").each(function(){document.getElementById($(this).attr("id")).muted=true});}//关声

// 推送服务端
// var socket = io('http://api.namenb.com:2120');
uid = _gid;// uid可以是自己网站的用户id，以便针对uid推送以及统计在线人数
socket.on('connect',function(){socket.emit('login', uid);});// socket连`接后以uid登录

socket.on('new message', function(_msg){// 后端推送来消息时
  var msgarr=_msg;console.log(msgarr);
  if(!msgarr.type || msgarr.type != 'SuperCall') return;//是否为同一个栏目
  // if(!msgarr.gid || msgarr.gid != _gid); return; //是否为同一家公司
  if(msgarr.key == ChannelId && msgarr.uid != _uid){
    msg('麦克风已禁用！');
    if(!$('#microphone').hasClass('off')){
      disaudio(); //关闭他人麦克风
      $('#microphone').addClass('off');
      $('#microphone i').removeClass('icon-maikefeng-shi')  .addClass('icon-maikefeng-jingyin');
    }
  }else if(msgarr.uid == _uid){//是本人时
    msg('抢麦成功！');
    if($('#microphone').hasClass('off')){
      opaudio();//打开自己麦克风
      $('#microphone').removeClass('off');
      $('#microphone i').removeClass('icon-maikefeng-jingyin').addClass('icon-maikefeng-shi');
    }
  }

  // if(msgarr.key == ChannelId && msgarr.uid != _uid){
  //   msg('麦克风已禁用！');
  //   if(!$('#microphone').hasClass('off')){
  //     disaudio(); //关闭他人麦克风
  //     $('#microphone').addClass('off');
  //     $('#microphone i').removeClass('icon-maikefeng-shi').addClass('icon-maikefeng-jingyin');
  //   }
  // }
  // if(msgarr.uid == _uid){
  //   msg('抢麦成功！');
  //   if($('#microphone').hasClass('off')){
  //     opaudio();//打开自己麦克风
  //     $('#microphone').removeClass('off');
  //     $('#microphone i').removeClass('icon-maikefeng-jingyin').addClass('icon-maikefeng-shi');
  //   }
  // };//是否为本人
//询问框
});
socket.on('update_online_count', function(online_stat){console.log(online_stat)});// 后端推送来在线数据时

