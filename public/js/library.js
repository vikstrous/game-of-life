var library = [
  {name:"default",
   hrname:"Default",
   list:[
     {
       hrname:"Default",
       name:"default",
       tiles:[[1]]
     },
     {
       hrname:"Erase",
       name:"erase",
       tiles:[[0]]
     }
  ]
  },
  {name:"still",
   hrname:"Still-Lifes",
   list:[
    {
      hrname:"Block",
      name:"block",
      tiles:[[1,1],[1,1]]
    },
    {
      hrname:"Beehive",
      name:"beehive",
      tiles:[[0,1,1,0], [1,0,0,1], [0,1,1,0]]
    },
    {
      name:"loaf",
      hrname:"Loaf",
      tiles:[[0,1,1,0], [1,0,0,1], [0,1,0,1], [0,0,1,0]]
    },
    {
      name:"boat",
      hrname:"Boat",
      tiles:[[1,1,0], [1,0,1], [0,1,0]]
    }
  ]
  },
  {name:"oscillators",
   hrname:"Oscillators",
   list:[
    {
      name:"blinker",
      hrname:"Blinker",
      tiles:[[1,1,1]]
    },
    {
      name:"toad",
      hrname:"Toad",
      tiles:[[0,1,1,1], [1,1,1,0]]
    },
    {
      hrname:"Beacon",
      name:"beacon",
      tiles:[[1,1,0,0], [1,1,0,0], [0,0,1,1], [0,0,1,1]]
    }
  ]
  },
  {name:"spaceships",
   hrname:"Spaceships",
   list:[
    {
      name:"glider",
      hrname:"Glider",
      tiles:[[0,0,1], [1,0,1], [0,1,1]]
    },
    {
      name:"lightweight-spaceship",
      hrname:"Lightweight Spaceship",
      tiles:[[1,0,0,1,0], [0,0,0,0,1], [1,0,0,0,1], [0,1,1,1,1]]
    }
  ]
  },
  {name:"growth",
   hrname:"Growth",
   list:[
    {
      name:"f-pentomino",
      hrname:"The F-pentomino",
      tiles:[[0,1,1], [1,1,0], [0,1,0]]
    },
    {
      name:"diehard",
      hrname:"Diehard",
      tiles:[[0,0,0,0,0,0,1,0], [1,1,0,0,0,0,0,0], [0,1,0,0,0,1,1,1]]
    },
    {
      name:"acorn",
      hrname:"Acorn",
      tiles:[[0,1,0,0,0,0,0], [0,0,0,1,0,0,0], [1,1,0,0,1,1,1]]
    },
    {
      name:"infinite",
      hrname:"Infinite",
      tiles:[
        [0,0,0,0,0,0,1,0],
        [0,0,0,0,1,0,1,1],
        [0,0,0,0,1,0,1,0],
        [0,0,0,0,1,0,0,0],
        [0,0,1,0,0,0,0,0],
        [1,0,1,0,0,0,0,0],
      ]
    }
  ]
  },
  {
    name:"generators",
    hrname:"Generators",
    list:[
      {
        name:"gosper-gun",
        hrname:"Gosper Glider Gun",
        tiles: [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
        [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
        [1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        ]
      }
    ]
  }
]
