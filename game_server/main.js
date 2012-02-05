module.exports = function (socket) {
  
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });

  var hs = socket.handshake;
  console.log('A socket with sessionID ' + hs.sessionID 
      + ' connected!');
  // setup an inteval that will keep our session fresh
  var intervalID = setInterval(function () {
      // reload the session (just in case something changed,
      // we don't want to override anything, but the age)
      // reloading will also ensure we keep an up2date copy
      // of the session with our connection.
      hs.session.reload( function () { 
          // "touch" it (resetting maxAge and lastAccess)
          // and save it back again.
          hs.session.touch().save();
      });
  }, 60 * 1000);
  
  socket.on('disconnect', function () {
      console.log('A socket with sessionID ' + hs.sessionID 
          + ' disconnected!');
      // clear the socket interval to stop refreshing the session
      clearInterval(intervalID);
  });
};
