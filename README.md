Game of Life (gofl?)
=====

**Gameplay tips :**
 - Hit R to rotate.

**Development tips :**

 - Check out how to use node-inspector for debugging
 - ./setup.sh must be run to set up the dependencies
 - ./run.sh or ./local.sh must be run to turn on the server
 - Always run local.sh instead of run.sh if you want speed! (use a local instance of redis - it's very easy to set up and run)
 - the server will now autorestart on changes (using nodemon)

**TODO (Viktor) :**

 - handle game status better
 - make anonymous players work
 - never use alerts because they can cause the socket.io session to time out!
 - replay games
 - make rematch games their own thing
 - better management of rematch games
 - smoother layout
 - facebook connect
 - challenge a friend on facebook
 - time limit to make a move
 - anonymous users
 - tournaments
 - Use Stripe for micropayments?
 - benchmark browsers -> give them the option to play bigger game
 - webgl shaders!
 - preloading system fun stuff?
 - pack the javascript
 - erase all feature
 - preview of eraser
 - clear "other player disconnected"
 - clear current block when press play
 - descriptions of shapes
 - careate a generic way to send json to the front end with the initial page load and fire events with the data delivered
 - log in without refreshing the page

**TODO (Greg) :**

 - Change the color of hover tiles
 - Stop the player from editing the grid after hitting play
 - 1 and 2 frame loop detection? How about we do a hack where we check if the pop hasn't changed in 10 generations? Or has a 2 frame loop for 20 generations?
 - make the enemy half of the grid be gray instead of cell-less during the placement phase of the game
 - chat
 - constant board early termination and 2 generation loop detection
 - keep track of which game the user is in so we can override the cached socket connection if they join with a new client
 - make the size of the pieces selector make sense?
 - scale pieces down to fit them in the menu
 - pregenerate .png images for the pieces (in a sprite sheet? on another server?)

