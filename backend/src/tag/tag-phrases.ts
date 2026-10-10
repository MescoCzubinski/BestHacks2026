import type { StyleTag } from "../places/style-tag";

/** Synonyms and related wording per tag (Polish plus key English terms); each phrase is embedded on its own. */
export const TAG_PHRASES: Record<StyleTag, string> = {
  romanesque:
    "styl romański, romańskie kościoły, grube mury i półokrągłe łuki, romanesque",
  gothic:
    "styl gotycki, gotyckie kościoły i katedry, ostre łuki, strzeliste wieże, gothic architecture",
  renaissance: "renesansowe kamienice i pałace, styl renesansowy, renaissance",
  mannerism: "styl manierystyczny, manieryzm, późny renesans, mannerism",
  baroque:
    "styl barokowy, barokowe kościoły i pałace, bogate zdobienia, baroque",
  rococo: "styl rokokowy, ozdobne wnętrza rokoko, rococo",
  neoclassicism:
    "klasycyzm, styl klasycystyczny, kolumny i portyki, neoclassical",
  historicism:
    "style historyczne XIX wieku, budynki naśladujące dawne epoki, historicism",
  neogothic: "neogotyk, styl neogotycki, gotyk XIX wieku, neo-gothic",
  neorenaissance: "neorenesans, styl neorenesansowy, neo-renaissance",
  neobaroque: "neobarok, styl neobarokowy, neo-baroque",
  eclecticism:
    "eklektyzm, mieszanka stylów, eklektyczne kamienice, eclecticism",
  art_nouveau:
    "Art Nouveau, secesja, secesyjne kamienice, ozdobne linie roślinne, Jugendstil",
  secession:
    "secesja, secesyjne budynki i kamienice, wiedeńska secesja, Jugendstil, Art Nouveau",
  expressionism:
    "ekspresjonizm, architektura ekspresjonistyczna, expressionism",
  art_deco:
    "Art Deco, styl art déco, lata 20. i 30. XX wieku, geometryczne zdobienia",
  modernism:
    "modernizm, architektura modernistyczna, funkcjonalizm, modernist architecture",
  bauhaus: "Bauhaus, funkcjonalna architektura, szkoła Bauhausu",
  brutalism: "brutalizm, betonowa architektura, brutalist",
  postmodernism:
    "postmodernizm, architektura postmodernistyczna, lata 80. i 90., postmodern",
  contemporary:
    "nowoczesna architektura, architektura XXI wieku, szkło i stal, contemporary",
  vernacular:
    "architektura ludowa, tradycyjne domy, regionalna zabudowa, vernacular",
  industrial:
    "architektura przemysłowa, dziedzictwo przemysłowe, fabryczne budynki z cegły, industrial heritage",
  church: "kościół, świątynia, kaplica, church",
  cathedral: "katedra, wielka świątynia, gotycka katedra, cathedral",
  synagogue: "synagoga, bożnica, żydowska świątynia, synagogue",
  castle:
    "zamek, ruiny zamku, średniowieczna warownia, zamki i twierdze, castle",
  palace: "pałac, pałacyk, rezydencja arystokracji, palace",
  townhouse: "dom miejski, patrycjuszowska kamienica, townhouse",
  tenement: "kamienica czynszowa, kamienice miejskie, tenement house",
  villa: "willa, miejska willa, villa",
  town_hall: "ratusz, siedziba władz miasta, town hall",
  market_square:
    "rynek miejski, rynek starego miasta, główny plac miasta, market square",
  museum: "muzeum, wystawy, galeria sztuki, muzea sztuki, museum",
  theatre: "teatr, scena teatralna, spektakle, theatre",
  opera: "opera, operetka, filharmonia, opera house",
  library: "biblioteka, księgozbiór, library",
  university: "uniwersytet, uczelnia, gmach uniwersytecki, university",
  school: "szkoła, budynek szkolny, school",
  hospital: "szpital, klinika, hospital",
  train_station: "dworzec kolejowy, stacja kolejowa, train station",
  bridge: "most, stare mosty, kładka, mosty na rzece, bridge",
  tower: "wieża, wieża widokowa, baszta, tower",
  fortification:
    "fortyfikacje, mury obronne, bastiony, twierdza, fortifications",
  monument: "pomnik, monument, rzeźba upamiętniająca, monument",
  fountain: "fontanna, fontanny, wodotrysk, fountain",
  cemetery: "cmentarz, nekropolia, cemetery",
  factory: "fabryka, zakład przemysłowy, factory",
  warehouse: "magazyn, spichlerz, warehouse",
  brewery: "browar, piwo, brewery",
  market_hall: "hala targowa, targ, market hall",
  stadium: "stadion, arena sportowa, stadium",
  hotel: "hotel, historyczny hotel",
  residential_estate:
    "osiedle mieszkaniowe, zabudowa mieszkaniowa, housing estate",
  park: "park, parki miejskie, zieleń i spacery wśród drzew, park",
  garden: "ogród, ogrody, japoński ogród, garden",
  island: "wyspa, wyspy na rzece, island",
  riverside: "nabrzeże, bulwar nad rzeką, spacer nad wodą, riverside",
  botanical_garden: "ogród botaniczny, rośliny, botanical garden",
  zoo: "zoo, ogród zoologiczny, zwierzęta, zoo",
  square: "plac, skwer, plac miejski, square",
  viewpoint: "punkt widokowy, widok na miasto, panorama, viewpoint",
  unesco: "UNESCO, światowe dziedzictwo, wpis na listę UNESCO",
  wwii: "II wojna światowa, wojna 1939-1945, wwii",
  communist_era:
    "czasy PRL, komunizm, socrealizm, okres komunistyczny, communist era",
  jewish_heritage:
    "dziedzictwo żydowskie, żydowska historia, kultura żydowska, jewish heritage",
  german_heritage:
    "dziedzictwo niemieckie, niemiecka historia miasta, Breslau, german heritage",
  polish_heritage:
    "dziedzictwo polskie, polska historia i kultura, polish heritage",
  habsburg:
    "Habsburgowie, epoka austriacka, cesarstwo austro-węgierskie, habsburg",
  medieval: "średniowiecze, średniowieczne budowle, medieval",
  street_art: "street art, murale, graffiti, sztuka uliczna",
  hidden_gem:
    "ukryte perełki, mało znane miejsca, nieoczywiste atrakcje, hidden gems",
  family_friendly:
    "dla rodzin, dla dzieci, atrakcje z dziećmi, family friendly",
  free_entry: "wstęp wolny, darmowe atrakcje, bezpłatne zwiedzanie, free entry",
  accessible:
    "dostępne dla wózków, bez barier, dla osób z niepełnosprawnością, wózek inwalidzki, accessible",
  archaeology:
    "archeologia, wykopaliska, stanowiska archeologiczne, pozostałości dawnych osad, archaeology",
  bunker: "schrony, bunkry, fortyfikacje, schrony przeciwlotnicze, bunker",
  dwarfs: "krasnale, wrocławskie krasnale, figurki krasnali, dwarfs",
  ruins: "ruiny, zrujnowane budowle, ruiny zamków, ruins",
  sculpture: "rzeźby, pomniki, posągi, sculpture, monument",
  shrine: "kapliczki, krzyże przydrożne, figury świętych, shrine",
};
