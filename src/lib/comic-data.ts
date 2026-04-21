export type Story = {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
};

export type ArtStyle = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  promptHint: string;
};

export const STORIES: Story[] = [
  { id: "noah", title: "Noah's Ark", emoji: "🌈", blurb: "A great big boat and animals two by two!" },
  { id: "david", title: "David & Goliath", emoji: "🪨", blurb: "A brave shepherd boy and a giant warrior." },
  { id: "jonah", title: "Jonah & the Whale", emoji: "🐋", blurb: "A runaway prophet swallowed by a giant fish." },
  { id: "daniel", title: "Daniel in the Lions' Den", emoji: "🦁", blurb: "Brave Daniel trusts God among hungry lions." },
  { id: "moses", title: "Moses & the Red Sea", emoji: "🌊", blurb: "Walls of water and a long walk to freedom." },
  { id: "creation", title: "The Creation", emoji: "✨", blurb: "How God made the whole wide world in seven days." },
  { id: "joseph", title: "Joseph's Coat", emoji: "🧥", blurb: "A dreamer with a colorful coat becomes a hero." },
  { id: "nativity", title: "The First Christmas", emoji: "⭐", blurb: "A baby is born in a tiny stable in Bethlehem." },
  { id: "loaves", title: "Loaves & Fishes", emoji: "🐟", blurb: "Jesus feeds 5,000 with one little lunch." },
  { id: "goodshepherd", title: "The Lost Sheep", emoji: "🐑", blurb: "A shepherd searches for one little lamb." },
];

export const ART_STYLES: ArtStyle[] = [
  {
    id: "cartoon",
    name: "Friendly Cartoon",
    emoji: "🎨",
    description: "Big eyes, bright colors, soft outlines",
    promptHint: "cute friendly children's cartoon, soft thick outlines, big expressive eyes, warm pastel palette",
  },
  {
    id: "watercolor",
    name: "Watercolor Storybook",
    emoji: "🖌️",
    description: "Soft painted look, like a picture book",
    promptHint: "gentle watercolor children's book illustration, soft paper texture, hand-painted, pastel washes",
  },
  {
    id: "pixar",
    name: "Movie Magic",
    emoji: "🎬",
    description: "3D cinematic, like a kids' animated film",
    promptHint: "3D pixar-style animated movie still, cinematic warm lighting, expressive characters, family friendly",
  },
  {
    id: "pixel",
    name: "Pixel Art",
    emoji: "🕹️",
    description: "Retro 8-bit video game vibes",
    promptHint: "16-bit pixel art scene, vibrant retro game palette, crisp pixels, charming and playful",
  },
];
