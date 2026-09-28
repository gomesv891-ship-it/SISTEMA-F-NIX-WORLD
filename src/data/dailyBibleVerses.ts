export interface BibleVerse {
  text: string;
  reference: string;
}

/**
 * Acervo de frases e versículos bíblicos canônicos selecionados de diversos livros
 * do Antigo e Novo Testamento (Profetas, Evangelhos, Epístolas, Livros Históricos, Poéticos e de Sabedoria).
 *
 * O índice 0 está ancorado na data base de 22/09/2026:
 * Isaías 41:10 ("Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus; eu te fortaleço, e te ajudo.")
 *
 * A cada novo dia (à meia-noite), o sistema seleciona deterministicamente o próximo versículo,
 * garantindo rotação automática e diária sem repetição em dias consecutivos.
 */
export const DAILY_BIBLE_VERSES: BibleVerse[] = [
  // Dia 22/09/2026 (Índice 0) - Especificado pelo usuário
  {
    text: "Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus; eu te fortaleço, e te ajudo.",
    reference: "Isaías 41:10"
  },
  // Dia 23/09/2026 (Índice 1)
  {
    text: "Posso todas as coisas naquele que me fortalece.",
    reference: "Filipenses 4:13"
  },
  // Dia 24/09/2026 (Índice 2)
  {
    text: "Porque sou eu que conheço os planos que tenho para vocês, diz o SENHOR, planos de fazê-los prosperar e não de lhes causar dano, planos de dar-lhes esperança e um futuro.",
    reference: "Jeremias 29:11"
  },
  // Dia 25/09/2026 (Índice 3)
  {
    text: "Não fui eu que lhe ordenei? Seja forte e corajoso! Não se apavore, nem se desanime, pois o SENHOR, o seu Deus, estará com você por onde você andar.",
    reference: "Josué 1:9"
  },
  // Dia 26/09/2026 (Índice 4)
  {
    text: "Confie no SENHOR de todo o seu coração e não se apoie em seu próprio entendimento; reconheça o SENHOR em todos os seus caminhos, e ele endireitará as suas veredas.",
    reference: "Provérbios 3:5-6"
  },
  // Dia 27/09/2026 (Índice 5)
  {
    text: "Sabemos que Deus age em todas as coisas para o bem daqueles que o amam, dos que foram chamados de acordo com o seu propósito.",
    reference: "Romanos 8:28"
  },
  // Dia 28/09/2026 (Índice 6)
  {
    text: "Busquem, pois, em primeiro lugar o Reino de Deus e a sua justiça, e todas essas coisas lhes serão acrescentadas.",
    reference: "Mateus 6:33"
  },
  // Dia 29/09/2026 (Índice 7)
  {
    text: "Deixo-lhes a paz; a minha paz lhes dou. Não lha dou como o mundo a dá. Não se perturbe o seu coração, nem tenham medo.",
    reference: "João 14:27"
  },
  // Dia 30/09/2026 (Índice 8)
  {
    text: "O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha. Não maltrata, não procura seus interesses, não se ira facilmente, não guarda rancor.",
    reference: "1 Coríntios 13:4-5"
  },
  // Dia 01/10/2026 (Índice 9)
  {
    text: "O SENHOR é o meu pastor; de nada terei falta. Em verdes pastagens me faz repousar e me conduz a águas tranquilas.",
    reference: "Salmos 23:1-2"
  },
  {
    text: "Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens.",
    reference: "Colossenses 3:23"
  },
  {
    text: "Se algum de vocês tem falta de sabedoria, peça-a a Deus, que a todos dá livremente, de boa vontade; e lhe será concedida.",
    reference: "Tiago 1:5"
  },
  {
    text: "Àquele que é capaz de fazer infinitamente mais do que tudo o que pedimos ou pensamos, de acordo com o seu poder que atua em nós, a ele seja a glória.",
    reference: "Efésios 3:20-21"
  },
  {
    text: "Pois Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio.",
    reference: "2 Timóteo 1:7"
  },
  {
    text: "Ora, a fé é a certeza daquilo que esperamos e a prova das coisas que não vemos.",
    reference: "Hebreus 11:1"
  },
  {
    text: "As misericórdias do SENHOR são a causa de não sermos consumidos, porque as suas misericórdias não têm fim; renovam-se cada manhã. Grande é a tua fidelidade!",
    reference: "Lamentações 3:22-23"
  },
  {
    text: "Ele já mostrou a você, ó homem, o que é bom e o que o SENHOR exige: pratique a justiça, ame a fidelidade e ande humildemente com o seu Deus.",
    reference: "Miqueias 6:8"
  },
  {
    text: "Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês.",
    reference: "1 Pedro 5:7"
  },
  {
    text: "Alegrem-se sempre, orem continuamente, deem graças em todas as circunstâncias, pois esta é a vontade de Deus para vocês em Cristo Jesus.",
    reference: "1 Tessalonicenses 5:16-18"
  },
  {
    text: "Se o meu povo, que se chama pelo meu nome, se humilhar, e orar, e buscar a minha face e se converter dos seus maus caminhos, então eu ouvirei dos céus, e perdoarei os seus pecados, e sararei a sua terra.",
    reference: "2 Crônicas 7:14"
  },
  {
    text: "Mas o fruto do Espírito é amor, alegria, paz, paciência, amabilidade, bondade, fidelidade, mansidão e domínio próprio.",
    reference: "Gálatas 5:22-23"
  },
  {
    text: "Venham a mim, todos os que estão cansados e sobrecarregados, e eu lhes darei descanso.",
    reference: "Mateus 11:28"
  },
  {
    text: "Mas aqueles que esperam no SENHOR renovam as suas forças. Voam alto como águias; correm e não ficam exaustos, andam e não se cansam.",
    reference: "Isaías 40:31"
  },
  {
    text: "O SENHOR te abençoe e te guarde; o SENHOR faça resplandecer o seu rosto sobre ti e te conceda graça; o SENHOR volte para ti o seu rosto e te dê paz.",
    reference: "Números 6:24-26"
  },
  {
    text: "Que a paz de Cristo seja o juiz em seus corações, visto que vocês foram chamados para viver em paz, como membros de um só corpo. E sejam agradecidos.",
    reference: "Colossenses 3:15"
  },
  {
    text: "Consagre ao SENHOR tudo o que você faz, e os seus planos serão bem-sucedidos.",
    reference: "Provérbios 16:3"
  },
  {
    text: "Deus é o nosso refúgio e a nossa fortaleza, auxílio sempre presente na adversidade.",
    reference: "Salmos 46:1"
  },
  {
    text: "Não andem ansiosos por coisa alguma, mas em tudo, pela oração e súplicas, e com ação de graças, apresentem seus pedidos a Deus. E a paz de Deus guardará os seus corações.",
    reference: "Filipenses 4:6-7"
  },
  {
    text: "Clame a mim e eu responderei e lhe direi coisas grandiosas e insondáveis que você não conhece.",
    reference: "Jeremias 33:3"
  },
  {
    text: "O SENHOR é a minha luz e a minha salvação; de quem terei temor? O SENHOR é a fortaleza da minha vida; a quem temerei?",
    reference: "Salmos 27:1"
  },
  {
    text: "A resposta calma desvia a fúria, mas a palavra ríspida desperta a ira.",
    reference: "Provérbios 15:1"
  },
  {
    text: "Eu sou o caminho, a verdade e a vida. Ninguém vem ao Pai, a não ser por mim.",
    reference: "João 14:6"
  },
  {
    text: "O coração alegre é bom remédio, mas o espírito abatido seca até os ossos.",
    reference: "Provérbios 17:22"
  },
  {
    text: "Porque para Deus nada é impossível.",
    reference: "Lucas 1:37"
  },
  {
    text: "Aquele que habita no abrigo do Altíssimo e descansa à sombra do Todo-Poderoso pode dizer ao SENHOR: Tu és o meu refúgio e a minha fortaleza, o meu Deus, em quem confio.",
    reference: "Salmos 91:1-2"
  },
  {
    text: "Portanto, meus amados irmãos, mantenham-se firmes, e que nada os abale. Sejam sempre dedicados à obra do Senhor, pois vocês sabem que, no Senhor, o trabalho de vocês não será inútil.",
    reference: "1 Coríntios 15:58"
  },
  {
    text: "O SENHOR é bom, um refúgio em tempos de angústia. Ele protege os que nele confiam.",
    reference: "Naum 1:7"
  },
  {
    text: "Toda boa dádiva e todo dom perfeito vêm do alto, descendo do Pai das luzes, que não muda como sombras inconstantes.",
    reference: "Tiago 1:17"
  },
  {
    text: "Pois onde estiver o seu tesouro, aí também estará o seu coração.",
    reference: "Lucas 12:34"
  },
  {
    text: "O meu Deus suprirá todas as necessidades de vocês, de acordo com as suas gloriosas riquezas em Cristo Jesus.",
    reference: "Filipenses 4:19"
  },
  {
    text: "Entregue o seu caminho ao SENHOR; confie nele, e ele agirá.",
    reference: "Salmos 37:5"
  },
  {
    text: "Acima de tudo, guarde o seu coração, pois dele depende toda a sua vida.",
    reference: "Provérbios 4:23"
  },
  {
    text: "No amor não há medo; pelo contrário o perfeito amor expulsa o medo, porque o medo supõe castigo.",
    reference: "1 João 4:18"
  },
  {
    text: "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.",
    reference: "Salmos 119:105"
  },
  {
    text: "Sejam fortes e corajosos. Não tenham medo nem fiquem apavorados por causa deles, pois o SENHOR, o seu Deus, vai com vocês; nunca os deixará, nunca os abandonará.",
    reference: "Deuteronômio 31:6"
  },
  {
    text: "Mesmo que a figueira não floresça, nem haja uvas nas videiras; todavia, eu me alegrarei no SENHOR e exultarei no Deus da minha salvação.",
    reference: "Habacuque 3:17-18"
  },
  {
    text: "Vocês são a luz do mundo. Não se pode esconder uma cidade construída sobre um monte. Assim brilhe a luz de vocês diante dos homens.",
    reference: "Mateus 5:14,16"
  },
  {
    text: "Eu sou a videira; vocês são os ramos. Se alguém permanecer em mim e eu nele, esse dará muito fruto; pois sem mim vocês não podem fazer coisa alguma.",
    reference: "João 15:5"
  },
  {
    text: "Provai e vede que o SENHOR é bom; como é feliz o homem que nele se refugia!",
    reference: "Salmos 34:8"
  },
  {
    text: "Pois estou convencido de que nem morte nem vida, nem anjos nem demônios, nem o presente nem o futuro, nem qualquer poder será capaz de nos separar do amor de Deus que está em Cristo Jesus.",
    reference: "Romanos 8:38-39"
  },
  {
    text: "Ensina-nos a contar os nossos dias para que o nosso coração alcance sabedoria.",
    reference: "Salmos 90:12"
  },
  {
    text: "A bênção do SENHOR traz riqueza e não acrescenta dores.",
    reference: "Provérbios 10:22"
  },
  {
    text: "Não temas, porque eu te remi; chamei-te pelo teu nome, tu és meu. Quando passares pelas águas, estarei contigo, e quando pelos rios, eles não te submergirão.",
    reference: "Isaías 43:1-2"
  },
  {
    text: "O SENHOR lutará por vocês; tão somente acalmem-se.",
    reference: "Êxodo 14:14"
  },
  {
    text: "Pois a alegria do SENHOR é a vossa força.",
    reference: "Neemias 8:10"
  },
  {
    text: "Em paz também me deitarei e dormirei, porque só tu, SENHOR, me fazes habitar em segurança.",
    reference: "Salmos 4:8"
  },
  {
    text: "Que tudo o que vocês fizerem seja feito com amor.",
    reference: "1 Coríntios 16:14"
  },
  {
    text: "Eu sou o SENHOR, o teu Deus, que te segura pela tua mão direita e diz a ti: Não temas; eu te ajudo.",
    reference: "Isaías 41:13"
  },
  {
    text: "Bendize, ó minha alma, ao SENHOR, e tudo o que há em mim bendiga o seu santo nome. Bendize, ó minha alma, ao SENHOR, e não te esqueças de nenhum de seus benefícios.",
    reference: "Salmos 103:1-2"
  },
  {
    text: "Pois onde dois ou três estiverem reunidos em meu nome, ali estou eu no meio deles.",
    reference: "Mateus 18:20"
  },
  {
    text: "Mas aquele que perseverar até o fim será salvo.",
    reference: "Mateus 24:13"
  },
  {
    text: "Apeguemo-nos com firmeza à esperança que professamos, pois aquele que prometeu é fiel.",
    reference: "Hebreus 10:23"
  },
  {
    text: "O SENHOR, o seu Deus, está em seu meio, poderoso para salvar. Ele se regozijará em você com alegria; ele o renovará com o seu amor.",
    reference: "Sofonias 3:17"
  },
  {
    text: "Sejam bondosos e compassivos uns para com os outros, perdoando-se mutuamente, assim como Deus perdoou vocês em Cristo.",
    reference: "Efésios 4:32"
  },
  {
    text: "Porque para mim o viver é Cristo e o morrer é lucro.",
    reference: "Filipenses 1:21"
  },
  {
    text: "Deleite-se no SENHOR, e ele atenderá aos desejos do seu coração.",
    reference: "Salmos 37:4"
  },
  {
    text: "E não nos cansemos de fazer o bem, pois no tempo próprio colheremos, se não desanimarmos.",
    reference: "Gálatas 6:9"
  },
  {
    text: "O Deus da esperança os encha de toda alegria e paz, por sua confiança nele, para que vocês transbordem de esperança, pelo poder do Espírito Santo.",
    reference: "Romanos 15:13"
  },
  {
    text: "Tu conservarás em perfeita paz aquele cujo propósito está firme em ti, porque confia em ti.",
    reference: "Isaías 26:3"
  },
  {
    text: "Eu disse essas coisas para que em mim vocês tenham paz. Neste mundo vocês terão aflições; contudo, tenham ânimo! Eu venci o mundo.",
    reference: "João 16:33"
  },
  {
    text: "Dêem, e lhes será dado: uma boa medida, calcada, sacudida e transbordante será dada a vocês. Pois a medida que usarem, também será usada para medir vocês.",
    reference: "Lucas 6:38"
  },
  {
    text: "O SENHOR é bom para com todos, e a sua ternura alcança todas as suas criaturas.",
    reference: "Salmos 145:9"
  },
  {
    text: "Não fui eu que ordenei a você? Seja forte e corajoso! Não se desespere nem tenha medo, pois o SENHOR, o seu Deus, estará com você por onde você andar.",
    reference: "Josué 1:9"
  },
  {
    text: "Pela graça vocês são salvos, por meio da fé, e isto não vem de vocês, é dom de Deus; não por obras, para que ninguém se glorie.",
    reference: "Efésios 2:8-9"
  },
  {
    text: "Eu te louvo porque me fizeste de modo especial e admirável. Tuas obras são maravilhosas! Digo isso com convicção.",
    reference: "Salmos 139:14"
  },
  {
    text: "Busquem o SENHOR enquanto é possível achá-lo; clamem por ele enquanto está perto.",
    reference: "Isaías 55:6"
  },
  {
    text: "Aquietai-vos e sabei que eu sou Deus; serei exaltado entre as nações; serei exaltado sobre a terra.",
    reference: "Salmos 46:10"
  },
  {
    text: "O SENHOR é a porção da minha herança e do meu cálice; tu sustentas a minha sorte.",
    reference: "Salmos 16:5"
  },
  {
    text: "E a esperança não nos decepciona, porque Deus derramou seu amor em nossos corações, por meio do Espírito Santo que ele nos concedeu.",
    reference: "Romanos 5:5"
  },
  {
    text: "Portanto, vistam toda a armadura de Deus, para que possam resistir no dia mau e permanecer inabaláveis.",
    reference: "Efésios 6:13"
  },
  {
    text: "Grande é o SENHOR e mui digno de ser louvado; a sua grandeza é insondável.",
    reference: "Salmos 145:3"
  },
  {
    text: "O justo viverá pela fé.",
    reference: "Romanos 1:17"
  },
  {
    text: "Este é o dia em que o SENHOR agiu; alegremo-nos e exultemos nele.",
    reference: "Salmos 118:24"
  },
  {
    text: "Não se amoldem ao padrão deste mundo, mas transformem-se pela renovação da sua mente, para que sejam capazes de experimentar e comprovar a boa, agradável e perfeita vontade de Deus.",
    reference: "Romanos 12:2"
  },
  {
    text: "Se Deus é por nós, quem será contra nós?",
    reference: "Romanos 8:31"
  },
  {
    text: "O choro pode durar uma noite, mas a alegria vem pela manhã.",
    reference: "Salmos 30:5"
  },
  {
    text: "Nem olhos viram, nem ouvidos ouviram, nem jamais penetrou em coração humano o que Deus tem preparado para aqueles que o amam.",
    reference: "1 Coríntios 2:9"
  },
  {
    text: "A minha graça te basta, porque o meu poder se aperfeiçoa na fraqueza.",
    reference: "2 Coríntios 12:9"
  },
  {
    text: "Portanto, confessem os seus pecados uns aos outros e orem uns pelos outros para serem curados. A oração de um justo é poderosa e eficaz.",
    reference: "Tiago 5:16"
  },
  {
    text: "Ele enxugará dos seus olhos toda lágrima. Não haverá mais morte, nem tristeza, nem choro, nem dor, pois a antiga ordem já passou.",
    reference: "Apocalipse 21:4"
  }
];

/**
 * Retorna a frase bíblica do dia com base na data do sistema.
 *
 * Algoritmo determinístico:
 * - Âncora em 22/09/2026 => Índice 0 (Isaías 41:10)
 * - 23/09/2026 => Índice 1 (Filipenses 4:13)
 * - 24/09/2026 => Índice 2 (Jeremias 29:11)
 * - Muda a cada 24 horas à meia-noite automaticamente.
 * - Versículos variados de diversos livros do Antigo e Novo Testamento.
 * - Sem repetições em dias consecutivos.
 */
export function getDailyBibleVerse(currentDate: Date = new Date()): BibleVerse {
  // Normaliza a data para meia-noite no fuso local do usuário
  const targetYear = currentDate.getFullYear();
  const targetMonth = currentDate.getMonth();
  const targetDate = currentDate.getDate();

  const targetMidnight = new Date(targetYear, targetMonth, targetDate).getTime();

  // Data base fixada: 22 de setembro de 2026 (mês 8 pois no JS os meses iniciam em 0)
  const baseMidnight = new Date(2026, 8, 22).getTime();

  // Cálculo da quantidade de dias decorridos desde a data base
  const oneDayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((targetMidnight - baseMidnight) / oneDayMs);

  const totalVerses = DAILY_BIBLE_VERSES.length;

  // Módulo seguro que lida perfeitamente com valores positivos e negativos
  const index = ((diffDays % totalVerses) + totalVerses) % totalVerses;

  return DAILY_BIBLE_VERSES[index];
}
