// Cardápio da BrasaBurg & Freeze. Preços em centavos.
// O servidor recalcula o total a partir daqui; o preço enviado pelo navegador é ignorado.

export const BURGERS = [
  {
    id: 'brasa-burguer',
    name: 'Brasa Burguer',
    price: 2199,
    tagline: 'O clássico que valoriza cada ingrediente.',
    paragraphs: [
      'O Brasa Burguer combina pão brioche macio, hambúrguer de carne, cheddar e molho da casa. É uma receita que concentra o sabor nos ingredientes essenciais, com uma combinação fácil de gostar e que acompanha bem qualquer ocasião.',
      'O brioche traz maciez e um leve toque adocicado, que contrasta com o sabor salgado da carne e do cheddar. O queijo acrescenta cremosidade, enquanto o molho da casa envolve os ingredientes e completa a experiência sem precisar de muitos adicionais.',
      'A cada mordida, a proposta é sentir o conjunto: pão, carne, queijo e molho em equilíbrio. Uma escolha para quem prefere um hambúrguer clássico e gosta de aproveitar o sabor da carne.',
    ],
    facts: [
      ['Composição', 'pão brioche, hambúrguer de carne, cheddar e molho da casa.'],
      ['Perfil de sabor', 'combinação clássica, cremosa e levemente adocicada pelo brioche.'],
      ['Para quem combina', 'quem gosta de cheesebúrguer e prefere uma receita sem bacon ou salada.'],
    ],
    image: '/produtos/brasa-burguer.jpg',
  },
  {
    id: 'brasa-bacon',
    name: 'Brasa Bacon',
    price: 2599,
    tagline: 'Sabor marcante para quem faz questão de bacon.',
    paragraphs: [
      'O Brasa Bacon parte da combinação de pão brioche, hambúrguer de carne, cheddar e molho da casa e acrescenta bacon para dar mais intensidade ao lanche. O resultado é uma receita de sabor mais pronunciado, com contraste entre o toque adocicado do pão, a cremosidade do queijo e as notas salgadas e defumadas do bacon.',
      'A carne forma a base do hambúrguer, enquanto o cheddar ajuda a unir os ingredientes. O bacon ganha destaque na composição, acrescentando uma camada de sabor que aparece em cada mordida. O molho da casa completa o conjunto e acompanha tanto a carne quanto o queijo.',
      'É uma opção para quem procura um hambúrguer com ingredientes clássicos e um adicional que faz diferença no sabor.',
    ],
    facts: [
      ['Composição', 'pão brioche, hambúrguer de carne, cheddar, bacon e molho da casa.'],
      ['Perfil de sabor', 'intenso, cremoso e com notas defumadas do bacon.'],
      ['Para quem combina', 'quem gosta de bacon e prefere um hambúrguer sem alface e tomate.'],
    ],
    image: '/produtos/brasa-bacon.jpg',
  },
  {
    id: 'brasa-salad',
    name: 'Brasa Salad',
    price: 2399,
    tagline: 'O encontro do hambúrguer clássico com o frescor da salada.',
    paragraphs: [
      'O Brasa Salad combina pão brioche, hambúrguer de carne, cheddar e molho da casa com alface e tomate. A salada acrescenta frescor e variedade de texturas, criando uma experiência diferente a cada mordida.',
      'A alface traz crocância, enquanto o tomate contribui com suculência e uma leve acidez que contrasta com a carne e o queijo. O cheddar acrescenta cremosidade, e o molho da casa acompanha os ingredientes para completar o sabor. Por fora, o brioche macio reúne toda a combinação com seu toque levemente adocicado.',
      'É uma receita para quem gosta de carne e queijo, mas também valoriza a presença dos vegetais no hambúrguer. A proposta é reunir o sabor do clássico com o contraste fresco da salada.',
    ],
    facts: [
      ['Composição', 'pão brioche, hambúrguer de carne, cheddar, alface, tomate e molho da casa.'],
      ['Perfil de sabor', 'cremoso, fresco e com contraste entre os ingredientes quentes e a salada.'],
      ['Para quem combina', 'quem prefere hambúrguer com alface e tomate e quer uma opção sem bacon.'],
    ],
    image: '/produtos/brasa-salad.jpg',
  },
  {
    id: 'brasa-supreme',
    name: 'Brasa Supreme',
    price: 2799,
    tagline: 'A combinação mais completa entre os quatro sabores.',
    paragraphs: [
      'O Brasa Supreme reúne pão brioche, hambúrguer de carne, cheddar, bacon, alface, tomate e molho da casa. Ele combina os adicionais do Brasa Bacon e do Brasa Salad em uma única receita, oferecendo mais variedade de sabores e texturas.',
      'A carne e o cheddar formam a base do lanche, com sabor e cremosidade. O bacon acrescenta intensidade e notas defumadas, enquanto a alface e o tomate trazem frescor, crocância e suculência. O molho da casa completa a combinação, e o pão brioche envolve todos os ingredientes com maciez e um leve toque adocicado.',
      'Cada ingrediente participa de uma experiência mais variada: o salgado do bacon, a cremosidade do cheddar e o contraste da salada se encontram na mesma mordida. É a escolha para quem gosta do hambúrguer com todos os adicionais do nosso cardápio.',
    ],
    facts: [
      ['Composição', 'pão brioche, hambúrguer de carne, cheddar, bacon, alface, tomate e molho da casa.'],
      ['Perfil de sabor', 'marcante e cremoso, com notas defumadas e o frescor da salada.'],
      ['Para quem combina', 'quem gosta de bacon e salada juntos e quer a combinação mais completa da linha.'],
    ],
    image: '/produtos/brasa-supreme.jpg',
  },
];

export const GELADINHOS = [
  {
    id: 'geladinho-ninho',
    name: 'Geladinho de Leite Ninho',
    shortName: 'Leite Ninho',
    price: 1299,
    tagline: 'Sabor de leite em pó em uma sobremesa cremosa e geladinha.',
    paragraphs: [
      'O geladinho de Leite Ninho traz o sabor característico do leite em pó em uma opção refrescante para quem gosta de doces à base de leite. A proposta é destacar esse sabor familiar, com doçura e cremosidade em cada porção.',
      'Seu perfil lácteo combina com uma sobremesa de sabor delicado, em que o leite em pó é o destaque. Servido bem geladinho, é uma opção para aproveitar nos dias de calor, fazer uma pausa durante o dia ou encerrar o lanche com um doce.',
      'É uma escolha para quem já gosta de Leite Ninho em sobremesas e quer encontrar esse sabor em uma versão gelada.',
    ],
    facts: [
      ['Sabor em destaque', 'leite em pó Ninho.'],
      ['Perfil de sabor', 'lácteo, doce e cremoso.'],
      ['Para quem combina', 'quem prefere sobremesas à base de leite e gosta do sabor característico do leite em pó.'],
    ],
    image: '/produtos/geladinho-ninho.jpg',
  },
  {
    id: 'geladinho-morango',
    name: 'Geladinho de Morango Cremoso',
    shortName: 'Morango Cremoso',
    price: 1299,
    tagline: 'O sabor frutado do morango em uma versão cremosa e refrescante.',
    paragraphs: [
      'O Morango Cremoso combina o sabor do morango com a proposta de uma sobremesa gelada de textura cremosa. É uma opção que reúne o toque frutado e a doçura em uma combinação clássica.',
      'O morango dá identidade ao sabor, enquanto a cremosidade completa a experiência. O resultado é um geladinho para quem gosta de sobremesas frutadas, mas também aprecia uma textura mais encorpada.',
      'Pode acompanhar uma pausa nos dias quentes ou entrar como sobremesa depois do hambúrguer. É uma escolha para quem gosta da combinação de fruta e cremosidade.',
    ],
    facts: [
      ['Sabor em destaque', 'morango.'],
      ['Perfil de sabor', 'frutado, doce e cremoso.'],
      ['Para quem combina', 'quem gosta de sobremesas de morango e prefere sabores frutados.'],
    ],
    image: '/produtos/geladinho-morango.jpg',
  },
  {
    id: 'geladinho-maracuja-coco',
    name: 'Geladinho de Maracujá com Coco Queimado',
    shortName: 'Maracujá com Coco Queimado',
    price: 1299,
    tagline: 'Uma combinação tropical com contraste de sabores.',
    paragraphs: [
      'O geladinho de Maracujá com Coco Queimado reúne o sabor característico do maracujá com as notas tostadas do coco queimado. É uma combinação para quem gosta de sobremesas que exploram o encontro entre o frutado, o doce e o toque ácido.',
      'O maracujá traz a identidade tropical do sabor, enquanto o coco queimado acrescenta um perfil tostado que diferencia essa opção das demais. Juntos, eles criam uma experiência com mais contraste, em que os dois sabores se complementam.',
      'É uma escolha para quem gosta de maracujá, aprecia coco e quer experimentar uma combinação diferente dos clássicos de leite, morango e chocolate.',
    ],
    facts: [
      ['Sabores em destaque', 'maracujá e coco queimado.'],
      ['Perfil de sabor', 'tropical, frutado e tostado, com contraste entre doçura e acidez.'],
      ['Para quem combina', 'quem gosta de sobremesas de maracujá e de combinações com coco.'],
    ],
    image: '/produtos/geladinho-maracuja-coco.jpg',
  },
  {
    id: 'geladinho-chocolate',
    name: 'Geladinho de Chocolate Cremoso',
    shortName: 'Chocolate Cremoso',
    price: 1299,
    tagline: 'Um clássico para matar a vontade de chocolate.',
    paragraphs: [
      'O Chocolate Cremoso leva o sabor do chocolate para uma sobremesa gelada, com uma proposta que valoriza a cremosidade. É uma opção para quem costuma escolher chocolate na hora do doce e quer aproveitar esse sabor de uma forma refrescante.',
      'O chocolate é o protagonista da combinação, trazendo seu sabor característico a cada porção. A textura cremosa acompanha a experiência e faz deste geladinho uma alternativa para a sobremesa, para a pausa da tarde ou para aquele momento em que bate vontade de comer um doce.',
      'Entre os sabores da BrasaFreeze, é a escolha clássica para os fãs de chocolate.',
    ],
    facts: [
      ['Sabor em destaque', 'chocolate.'],
      ['Perfil de sabor', 'achocolatado, doce e cremoso.'],
      ['Para quem combina', 'quem gosta de sobremesas de chocolate e prefere essa opção aos sabores frutados.'],
    ],
    image: '/produtos/geladinho-chocolate.jpg',
  },
];

// Cada combo tem hambúrgueres fixos e uma quantidade de geladinhos que o cliente escolhe.
export const COMBOS = [
  {
    id: 'combo-classico',
    image: '/produtos/combo-classico.jpg',
    name: 'Combo Brasa Clássico',
    description: 'Brasa Burguer + 1 geladinho',
    price: 3199,
    burgers: ['brasa-burguer'],
    geladinhos: 1,
  },
  {
    id: 'combo-bacon',
    image: '/produtos/combo-bacon.jpg',
    name: 'Combo Brasa Bacon',
    description: 'Brasa Bacon + 1 geladinho',
    price: 3499,
    burgers: ['brasa-bacon'],
    geladinhos: 1,
  },
  {
    id: 'combo-dupla',
    image: '/produtos/combo-dupla.jpg',
    name: 'Combo Brasa em Dupla',
    description: 'Brasa Supreme + Brasa Salad + 2 geladinhos',
    price: 6999,
    burgers: ['brasa-supreme', 'brasa-salad'],
    geladinhos: 2,
  },
];

const SINGLE = new Map([...BURGERS, ...GELADINHOS].map((p) => [p.id, p]));
const COMBO = new Map(COMBOS.map((c) => [c.id, c]));

export function formatPrice(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Valida um item do carrinho e devolve a versão confiável dele (nome e preço do cardápio).
// Formato de entrada: { productId, qty, flavors?: [geladinhoId, ...] }
export function resolveItem(raw) {
  const qty = Number.parseInt(raw?.qty, 10);
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new Error('Quantidade inválida');

  const single = SINGLE.get(raw.productId);
  if (single) {
    return { productId: single.id, name: single.name, qty, unitPrice: single.price, details: [] };
  }

  const combo = COMBO.get(raw.productId);
  if (combo) {
    const flavors = Array.isArray(raw.flavors) ? raw.flavors : [];
    if (flavors.length !== combo.geladinhos) throw new Error(`Escolha ${combo.geladinhos} geladinho(s) para o ${combo.name}`);
    const flavorNames = flavors.map((id) => {
      const g = GELADINHOS.find((x) => x.id === id);
      if (!g) throw new Error('Sabor de geladinho inválido');
      return g.shortName;
    });
    const burgerNames = combo.burgers.map((id) => SINGLE.get(id).name);
    return {
      productId: combo.id,
      name: combo.name,
      qty,
      unitPrice: combo.price,
      details: [...burgerNames, ...flavorNames.map((n) => `Geladinho ${n}`)],
      flavors,
    };
  }

  throw new Error('Produto não encontrado');
}
