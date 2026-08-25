/*
 * Shop inventory
 *
 * Add, remove, rename, or reorganize products here. The page-building logic
 * stays in main.js. Every product image belongs in images/shop/.
 */

const SHOP_CATEGORIES = [
  {
    name: "Origami",
    emoji: "O",
    desc: "Handmade paper folds, sorted like project folders.",
    accent: "#efbd52",
    deep: "#d9962d",
    items: [
      {
        emoji: "B",
        name: "Birds and Wings",
        desc: "Flying folds with dramatic wings and display shapes.",
        status: "available",
        children: [
          {
            emoji: "E",
            name: "Origami Eagle",
            desc: "A bold folded eagle with wide wings and a sharp beak.",
            status: "available",
            image: "images/shop/origami-eagle.png",
            thumbZoom: 1.5,
          },
          {
            emoji: "P",
            name: "Origami Phoenix",
            desc: "A red and gold winged phoenix-style fold.",
            status: "available",
            image: "images/shop/origami-phoenix.png",
            thumbZoom: 1.65,
          },
          {
            emoji: "Pa",
            name: "Origami Parrot",
            desc: "A tall blue bird fold with a perch-style display.",
            status: "available",
            image: "images/shop/origami-parrot.png",
            thumbZoom: 2.2,
          },
        ],
      },
      {
        emoji: "D",
        name: "Origami Dragons",
        desc: "Choose the dragon version you want.",
        status: "available",
        children: [
          {
            emoji: "D1",
            name: "Dragon v1",
            desc: "Standing red dragon with wings and a simple strong pose.",
            status: "available",
            image: "images/shop/origami-dragon-v1.png",
            thumbZoom: 1.35,
          },
          {
            emoji: "D2",
            name: "Dragon v2",
            desc: "Sleeping red dragon, longer and lower to the table.",
            status: "available",
            image: "images/shop/origami-dragon-v2.png",
            thumbZoom: 1.28,
          },
          {
            emoji: "D3",
            name: "Dragon v3",
            desc: "Darker red dragon with a more detailed display look.",
            status: "available",
            image: "images/shop/origami-dragon-v3.png",
            thumbZoom: 1.42,
          },
        ],
      },
      {
        emoji: "F",
        name: "Origami Flowers",
        desc: "Folded flowers in several styles.",
        status: "available",
        children: [
          {
            emoji: "Da",
            name: "Daisy",
            desc: "Red and yellow flower in a paper pot.",
            status: "available",
            image: "images/shop/origami-daisy.png",
            thumbZoom: 1.42,
          },
          {
            emoji: "Su",
            name: "Sunflower",
            desc: "Yellow petals with an orange center.",
            status: "available",
            image: "images/shop/origami-sunflower.png",
            thumbZoom: 1.5,
          },
          {
            emoji: "Ro",
            name: "Rose",
            desc: "Dark red folded rose in a paper pot.",
            status: "available",
            image: "images/shop/origami-rose.png",
            thumbZoom: 1.38,
          },
          {
            emoji: "Li",
            name: "Lily",
            desc: "Pink folded lily with a tall stem.",
            status: "available",
            image: "images/shop/origami-lily.png",
            thumbZoom: 1.34,
          },
        ],
      },
      {
        emoji: "Di",
        name: "Origami Dinosaurs",
        desc: "Green dinosaur folds with different body shapes.",
        status: "available",
        children: [
          {
            emoji: "V",
            name: "Velociraptor",
            desc: "Longer-than-tall green dinosaur with a long tail.",
            status: "available",
            image: "images/shop/origami-velociraptor.png",
            thumbZoom: 1.62,
          },
          {
            emoji: "T",
            name: "T-Rex",
            desc: "Fatter green dinosaur with a bigger body.",
            status: "available",
            image: "images/shop/origami-t-rex.png",
            thumbZoom: 1.48,
          },
          {
            emoji: "Br",
            name: "Brachiosaurus / Brontosaurus",
            desc: "Tall-necked green dinosaur fold.",
            status: "available",
            image: "images/shop/origami-brachiosaurus.png",
            thumbZoom: 1.42,
          },
        ],
      },
      {
        emoji: "A",
        name: "Other Origami",
        desc: "Small characters and custom name pieces.",
        status: "available",
        children: [
          {
            emoji: "M",
            name: "Origami Mouse",
            desc: "Mouse fold with a pointed nose and round ears.",
            status: "available",
            image: "images/shop/origami-mouse.png",
            thumbZoom: 1.8,
          },
          {
            emoji: "ABC",
            name: "Origami Alphabet Name",
            desc: "A custom name made from folded origami letters.",
            status: "available",
            image: "images/shop/origami-alphabet.png",
            thumbZoom: 1.45,
          },
        ],
      },
    ],
  },
  {
    name: "Art",
    emoji: "A",
    desc: "Personalized drawings made for the person ordering.",
    accent: "#f27d7d",
    deep: "#dd555f",
    items: [
      {
        emoji: "C",
        name: "Personalized Caricature",
        desc: "A fun exaggerated portrait based on the person.",
        status: "available",
      },
      {
        emoji: "M",
        name: "Personalized Manga",
        desc: "A manga-style character drawing made from your idea.",
        status: "available",
      },
    ],
  },
  {
    name: "Other",
    emoji: "N",
    desc: "A spot for future ideas.",
    accent: "#7fd0c4",
    deep: "#3aaea1",
    items: [
      {
        emoji: "+",
        name: "More coming soon",
        desc: "Aarush will add more items here later.",
        status: "soon",
      },
    ],
  },
];
