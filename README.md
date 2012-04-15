Game of Life (gofl?)
=====

**Development tips :**

 - Check out how to use node-inspector for debugging
 - ./setup.sh must be run to set up the dependencies
 - ./run.sh or ./local.sh must be run to turn on the server
 - Always run local.sh instead of run.sh if you want speed! (use a local instance of redis - it's very easy to set up and run)
 - the server will now autorestart on changes (using nodemon)

**TODO (Viktor) :**

 - ajax all the other things - profiles, etc.
 - time limit to make a move
 - replay games
 - matchmaking
 - rematch game should not appear in the public games list
 - smoother layout
 - benchmark browsers -> give them the option to play bigger game
 - webgl shaders!
 - preloading system fun stuff?

**TODO (Greg) :**

 - make rotation of pieces
 - make the size of the pieces selector make sense?
 - scale pieces down to fit them in the menu
 - pregenerate .png images for the pieces (in a sprite sheet? on another server?)